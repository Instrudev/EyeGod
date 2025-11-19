from rest_framework import serializers

from .models import MetaZona, Municipio, Zona


class MunicipioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Municipio
        fields = ["id", "nombre", "departamento"]


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


class ZonaMetaUpdateSerializer(serializers.Serializer):
    meta_encuestas = serializers.IntegerField(min_value=1)

    def update(self, instance, validated_data):
        meta_obj, _ = MetaZona.objects.get_or_create(zona=instance)
        meta_obj.meta_encuestas = validated_data["meta_encuestas"]
        meta_obj.save()
        return meta_obj
