from rest_framework import serializers

from .models import Departamento, MetaZona, Municipio, Zona


class DepartamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Departamento
        fields = ["id", "nombre"]


class MunicipioSerializer(serializers.ModelSerializer):
    departamento = DepartamentoSerializer(read_only=True)
    departamento_detalle = DepartamentoSerializer(source="departamento", read_only=True)
    departamento_id = serializers.PrimaryKeyRelatedField(
        queryset=Departamento.objects.all(), source="departamento", write_only=True
    )

    class Meta:
        model = Municipio
        fields = ["id", "nombre", "departamento", "departamento_detalle", "departamento_id", "lat", "lon"]

    def validate_departamento_id(self, value):
        if value is None:
            raise serializers.ValidationError("Debe seleccionar un departamento")
        return value


class MetaZonaSerializer(serializers.ModelSerializer):
    class Meta:
        model = MetaZona
        fields = ["meta_encuestas"]


class ZonaSerializer(serializers.ModelSerializer):
    municipio = MunicipioSerializer(read_only=True)
    municipio_id = serializers.PrimaryKeyRelatedField(
        queryset=Municipio.objects.all(), source="municipio", write_only=True
    )
    meta = MetaZonaSerializer(read_only=True)

    class Meta:
        model = Zona
        fields = [
            "id",
            "nombre",
            "tipo",
            "lat",
            "lon",
            "municipio",
            "municipio_id",
            "meta",
        ]

    def create(self, validated_data):
        zona = super().create(validated_data)
        MetaZona.objects.get_or_create(zona=zona, defaults={"meta_encuestas": 10})
        return zona

    def validate_municipio_id(self, value):
        if value is None:
            raise serializers.ValidationError("Debe seleccionar un municipio")
        return value


class ZonaMetaUpdateSerializer(serializers.Serializer):
    meta_encuestas = serializers.IntegerField(min_value=1)

    def update(self, instance, validated_data):
        meta_obj, _ = MetaZona.objects.get_or_create(zona=instance)
        meta_obj.meta_encuestas = validated_data["meta_encuestas"]
        meta_obj.save()
        return meta_obj
