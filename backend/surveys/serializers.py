from rest_framework import serializers

from accounts.models import User
from territory.models import MetaZona, Zona, ZonaAsignacion
from .models import CasoCiudadano, Encuesta, EncuestaNecesidad, Necesidad


class NeedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Necesidad
        fields = ["id", "nombre"]


class SurveyNeedSerializer(serializers.ModelSerializer):
    necesidad = NeedSerializer(read_only=True)
    necesidad_id = serializers.PrimaryKeyRelatedField(
        queryset=Necesidad.objects.all(), source="necesidad", write_only=True
    )

    class Meta:
        model = EncuestaNecesidad
        fields = ["prioridad", "necesidad", "necesidad_id"]


class SurveySerializer(serializers.ModelSerializer):
    necesidades = SurveyNeedSerializer(many=True, required=False)
    zona_nombre = serializers.CharField(source="zona.nombre", read_only=True)
    municipio_nombre = serializers.CharField(source="zona.municipio.nombre", read_only=True)
    colaborador_nombre = serializers.CharField(source="colaborador.name", read_only=True)
    cedula = serializers.CharField(max_length=15, required=False, allow_blank=True, allow_null=True)
    nivel_afinidad = serializers.IntegerField(required=False, allow_null=True)
    disposicion_voto = serializers.IntegerField(required=False, allow_null=True)
    capacidad_influencia = serializers.IntegerField(required=False, allow_null=True)
    votante_valido = serializers.BooleanField(read_only=True)
    votante_potencial = serializers.BooleanField(read_only=True)
    estado_validacion = serializers.CharField(read_only=True)

    class Meta:
        model = Encuesta
        fields = [
            "id",
            "zona",
            "zona_nombre",
            "municipio_nombre",
            "colaborador",
            "colaborador_nombre",
            "fecha_hora",
            "fecha_creacion",
            "cedula",
            "primer_nombre",
            "segundo_nombre",
            "primer_apellido",
            "segundo_apellido",
            "telefono",
            "correo",
            "sexo",
            "pais",
            "departamento",
            "municipio",
            "puesto",
            "mesa",
            "tipo_vivienda",
            "rango_edad",
            "ocupacion",
            "tiene_ninos",
            "tiene_adultos_mayores",
            "tiene_personas_con_discapacidad",
            "comentario_problema",
            "consentimiento",
            "lat",
            "lon",
            "caso_critico",
            "nivel_afinidad",
            "disposicion_voto",
            "capacidad_influencia",
            "votante_valido",
            "votante_potencial",
            "estado_validacion",
            "necesidades",
        ]
        read_only_fields = [
            "colaborador",
            "fecha_hora",
            "fecha_creacion",
            "estado_validacion",
        ]

    def validate(self, attrs):
        primer_nombre = (
            attrs.get("primer_nombre")
            or self.initial_data.get("primer_nombre")
            or (self.instance.primer_nombre if self.instance else None)
        )
        if primer_nombre is None or str(primer_nombre).strip() == "":
            raise serializers.ValidationError(
                {"primer_nombre": "El campo primer_nombre es obligatorio."}
            )
        primer_apellido = (
            attrs.get("primer_apellido")
            or self.initial_data.get("primer_apellido")
            or (self.instance.primer_apellido if self.instance else None)
        )
        if primer_apellido is None or str(primer_apellido).strip() == "":
            raise serializers.ValidationError(
                {"primer_apellido": "El campo primer_apellido es obligatorio."}
            )
        necesidades = self.initial_data.get("necesidades")
        if necesidades:
            prioridades = {item.get("prioridad") for item in necesidades}
            if len(prioridades) != len(necesidades):
                raise serializers.ValidationError("La prioridad debe ser única")
        cedula = (
            attrs.get("cedula")
            or self.initial_data.get("cedula")
            or (self.instance.cedula if self.instance else None)
        )
        if not cedula:
            raise serializers.ValidationError("La cédula es obligatoria")
        if not str(cedula).isdigit():
            raise serializers.ValidationError("La cédula solo debe contener números")
        if len(str(cedula)) > 15:
            raise serializers.ValidationError("La cédula no puede superar 15 dígitos")
        cedula_qs = Encuesta.objects.filter(cedula=str(cedula))
        if self.instance:
            cedula_qs = cedula_qs.exclude(pk=self.instance.pk)
        if cedula_qs.exists():
            raise serializers.ValidationError("Ya existe una encuesta registrada con esta cédula.")
        attrs["cedula"] = str(cedula)
        if attrs.get("consentimiento") is False:
            raise serializers.ValidationError("Debe contar con consentimiento")
        nivel_afinidad = attrs.get("nivel_afinidad")
        disposicion_voto = attrs.get("disposicion_voto")
        capacidad_influencia = attrs.get("capacidad_influencia")
        if self.instance:
            if nivel_afinidad is None:
                nivel_afinidad = self.instance.nivel_afinidad
            if disposicion_voto is None:
                disposicion_voto = self.instance.disposicion_voto
            if capacidad_influencia is None:
                capacidad_influencia = self.instance.capacidad_influencia
        if nivel_afinidad is None:
            raise serializers.ValidationError(
                {"nivel_afinidad": "El campo nivel_de_afinidad es obligatorio."}
            )
        if disposicion_voto is None:
            raise serializers.ValidationError(
                {"disposicion_voto": "El campo disposicion_al_voto es obligatorio."}
            )
        if capacidad_influencia is None:
            raise serializers.ValidationError(
                {"capacidad_influencia": "El campo capacidad_de_influencia es obligatorio."}
            )
        if nivel_afinidad not in dict(Encuesta.NivelAfinidad.choices):
            raise serializers.ValidationError("El nivel de afinidad no es válido.")
        if disposicion_voto not in dict(Encuesta.DisposicionVoto.choices):
            raise serializers.ValidationError("La disposición al voto no es válida.")
        if capacidad_influencia not in dict(Encuesta.CapacidadInfluencia.choices):
            raise serializers.ValidationError("La capacidad de influencia no es válida.")
        user = self.context["request"].user
        zona = attrs.get("zona")
        if user.is_collaborator and zona:
            has_assignment = ZonaAsignacion.objects.filter(
                colaborador=user, zona=zona
            ).exists()
            if not has_assignment:
                raise serializers.ValidationError(
                    "Esta zona no está asignada a tu usuario"
                )
        if user.is_leader and zona:
            if not zona.municipio.lideres.filter(id=user.id).exists():
                raise serializers.ValidationError(
                    "Solo puedes registrar encuestas en municipios asignados"
                )
        return attrs

    def create(self, validated_data):
        necesidades = validated_data.pop("necesidades", [])
        validated_data["colaborador"] = self.context["request"].user
        encuesta = Encuesta.objects.create(**validated_data)
        for item in necesidades:
            EncuestaNecesidad.objects.create(encuesta=encuesta, **item)
        if encuesta.caso_critico:
            CasoCiudadano.objects.create(
                encuesta=encuesta,
                nivel_prioridad=CasoCiudadano.Prioridad.ALTA,
            )
        return encuesta


class CoverageSerializer(serializers.Serializer):
    zona = serializers.IntegerField()
    zona_nombre = serializers.CharField()
    municipio_nombre = serializers.CharField()
    lat = serializers.DecimalField(max_digits=9, decimal_places=6, required=False)
    lon = serializers.DecimalField(max_digits=9, decimal_places=6, required=False)
    municipio_lat = serializers.DecimalField(max_digits=9, decimal_places=6, required=False)
    municipio_lon = serializers.DecimalField(max_digits=9, decimal_places=6, required=False)
    necesidades = serializers.ListField(child=serializers.DictField(), required=False)
    meta_encuestas = serializers.IntegerField()
    total_encuestas = serializers.IntegerField()
    cobertura_porcentaje = serializers.FloatField()
    estado_cobertura = serializers.CharField()
