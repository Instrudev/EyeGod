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
            "departamento",
            "municipio",
            "puesto",
            "mesas",
            "direccion",
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
        departamento = attrs.get("departamento")
        municipio = attrs.get("municipio")
        puesto = attrs.get("puesto")
        mesas = attrs.get("mesas")
        direccion = attrs.get("direccion")
        nombre = attrs.get("nombre") or puesto
        if latitud is None or longitud is None:
            raise serializers.ValidationError("Latitud y longitud son obligatorias.")
        if not departamento or not str(departamento).strip():
            raise serializers.ValidationError("El departamento es obligatorio.")
        if not municipio or not str(municipio).strip():
            raise serializers.ValidationError("El municipio es obligatorio.")
        if not puesto or not str(puesto).strip():
            raise serializers.ValidationError("El puesto es obligatorio.")
        if not mesas or not str(mesas).strip():
            raise serializers.ValidationError("Las mesas son obligatorias.")
        if not direccion or not str(direccion).strip():
            raise serializers.ValidationError("La dirección es obligatoria.")
        if not (-90 <= float(latitud) <= 90):
            raise serializers.ValidationError("La latitud debe estar entre -90 y 90.")
        if not (-180 <= float(longitud) <= 180):
            raise serializers.ValidationError("La longitud debe estar entre -180 y 180.")
        exists = PollingStation.objects.filter(
            departamento__iexact=str(departamento).strip(),
            municipio__iexact=str(municipio).strip(),
            puesto__iexact=str(puesto).strip(),
            mesas__iexact=str(mesas).strip(),
            direccion__iexact=str(direccion).strip(),
            latitud=latitud,
            longitud=longitud,
        ).exists()
        if exists:
            raise serializers.ValidationError("Ya existe un puesto con esta ubicación.")
        attrs["nombre"] = nombre
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user:
            validated_data["creado_por"] = request.user
        return super().create(validated_data)
