from rest_framework import serializers

from accounts.models import User
from territory.models import MetaZona, Zona
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

    class Meta:
        model = Encuesta
        fields = [
            "id",
            "zona",
            "colaborador",
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
    zona = serializers.PrimaryKeyRelatedField(read_only=True)
    zona_nombre = serializers.CharField()
    municipio_nombre = serializers.CharField()
    meta_encuestas = serializers.IntegerField()
    total_encuestas = serializers.IntegerField()
    cobertura_porcentaje = serializers.FloatField()
    estado_cobertura = serializers.CharField()
