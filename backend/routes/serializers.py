from rest_framework import serializers

from accounts.serializers import UserSerializer
from territory.models import Zona
from territory.serializers import ZonaSerializer
from .models import RutaColaborador, RutaVisita, RutaZona


class RutaZonaSerializer(serializers.ModelSerializer):
    zona = ZonaSerializer(read_only=True)
    zona_id = serializers.PrimaryKeyRelatedField(queryset=Zona.objects.all(), source="zona", write_only=True)

    class Meta:
        model = RutaZona
        fields = ["id", "zona", "zona_id"]


class RutaColaboradorSerializer(serializers.ModelSerializer):
    colaborador = UserSerializer(read_only=True)
    colaborador_id = serializers.PrimaryKeyRelatedField(
        queryset=RutaColaborador._meta.get_field("colaborador").remote_field.model.objects.all(),
        source="colaborador",
        write_only=True,
    )

    class Meta:
        model = RutaColaborador
        fields = ["id", "colaborador", "colaborador_id"]


class RutaVisitaSerializer(serializers.ModelSerializer):
    ruta_zonas = RutaZonaSerializer(many=True, required=False)
    ruta_colaboradores = RutaColaboradorSerializer(many=True, required=False)
    avance = serializers.FloatField(read_only=True)

    class Meta:
        model = RutaVisita
        fields = [
            "id",
            "nombre_ruta",
            "lider_creador",
            "fecha_inicio",
            "fecha_fin",
            "estado",
            "ruta_zonas",
            "ruta_colaboradores",
            "avance",
        ]
        read_only_fields = ["lider_creador", "estado", "avance"]

    def create(self, validated_data):
        zonas = validated_data.pop("ruta_zonas", [])
        colaboradores = validated_data.pop("ruta_colaboradores", [])
        ruta = RutaVisita.objects.create(lider_creador=self.context["request"].user, **validated_data)
        for zona in zonas:
            RutaZona.objects.create(ruta=ruta, **zona)
        for col in colaboradores:
            RutaColaborador.objects.create(ruta=ruta, **col)
        return ruta

    def update(self, instance, validated_data):
        zonas = validated_data.pop("ruta_zonas", None)
        colaboradores = validated_data.pop("ruta_colaboradores", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if zonas is not None:
            instance.ruta_zonas.all().delete()
            for zona in zonas:
                RutaZona.objects.create(ruta=instance, **zona)

        if colaboradores is not None:
            instance.ruta_colaboradores.all().delete()
            for col in colaboradores:
                RutaColaborador.objects.create(ruta=instance, **col)

        return instance
