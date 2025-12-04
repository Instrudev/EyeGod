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
    necesidades = SurveyNeedSerializer(many=True)
    zona_nombre = serializers.CharField(source="zona.nombre", read_only=True)
    municipio_nombre = serializers.CharField(source="zona.municipio.nombre", read_only=True)
    colaborador_nombre = serializers.CharField(source="colaborador.name", read_only=True)

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
            "nombre_ciudadano",
            "telefono",
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
            "necesidades",
        ]
        read_only_fields = ["colaborador", "fecha_hora"]

    def validate(self, attrs):
        necesidades = self.initial_data.get("necesidades", [])
        if not necesidades:
            raise serializers.ValidationError("Debe seleccionar al menos una necesidad")
        prioridades = {item.get("prioridad") for item in necesidades}
        if len(prioridades) != len(necesidades):
            raise serializers.ValidationError("La prioridad debe ser única")
        if attrs.get("consentimiento") is False:
            raise serializers.ValidationError("Debe contar con consentimiento")
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
        necesidades = validated_data.pop("necesidades")
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
