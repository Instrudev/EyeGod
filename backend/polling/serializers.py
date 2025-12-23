from rest_framework import serializers

from .models import PollingStation


class PollingStationSerializer(serializers.ModelSerializer):
    creado_por_id = serializers.IntegerField(source="creado_por.id", read_only=True)
    creado_por_nombre = serializers.CharField(source="creado_por.name", read_only=True)

    class Meta:
        model = PollingStation
        fields = [
            "id",
            "nombre",
            "latitud",
            "longitud",
            "creado_por_id",
            "creado_por_nombre",
            "creado_en",
        ]
        read_only_fields = ["id", "creado_por_id", "creado_por_nombre", "creado_en"]

    def validate(self, attrs):
        latitud = attrs.get("latitud")
        longitud = attrs.get("longitud")
        nombre = attrs.get("nombre")
        if latitud is None or longitud is None:
            raise serializers.ValidationError("Latitud y longitud son obligatorias.")
        if not (-90 <= float(latitud) <= 90):
            raise serializers.ValidationError("La latitud debe estar entre -90 y 90.")
        if not (-180 <= float(longitud) <= 180):
            raise serializers.ValidationError("La longitud debe estar entre -180 y 180.")
        if nombre:
            exists = PollingStation.objects.filter(
                nombre__iexact=nombre.strip(),
                latitud=latitud,
                longitud=longitud,
            ).exists()
            if exists:
                raise serializers.ValidationError("Ya existe un puesto con esta ubicación.")
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user:
            validated_data["creado_por"] = request.user
        return super().create(validated_data)
