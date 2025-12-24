from django.contrib.auth import authenticate
from rest_framework import serializers

from .models import User
from territory.models import Municipio


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(username=attrs.get("email"), password=attrs.get("password"))
        if not user:
            raise serializers.ValidationError("Credenciales inválidas")
        attrs["user"] = user
        return attrs


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    municipio_operacion_id = serializers.PrimaryKeyRelatedField(
        source="municipio_operacion",
        queryset=Municipio.objects.all(),
        required=False,
        allow_null=True,
    )
    municipio_operacion_nombre = serializers.CharField(
        source="municipio_operacion.nombre",
        read_only=True,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "name",
            "telefono",
            "cedula",
            "role",
            "is_active",
            "meta_votantes",
            "municipio_operacion_id",
            "municipio_operacion_nombre",
            "password",
        ]
        read_only_fields = ["id", "meta_votantes"]

    def validate(self, attrs):
        role = attrs.get("role") or (self.instance.role if self.instance else None)
        municipio = attrs.get("municipio_operacion") or (self.instance.municipio_operacion if self.instance else None)
        if role == User.Roles.COORDINADOR_ELECTORAL:
            if municipio is None:
                raise serializers.ValidationError(
                    {"municipio_operacion_id": "El municipio es obligatorio para el coordinador."}
                )
            telefono = attrs.get("telefono") or self.initial_data.get("telefono")
            if telefono is None or str(telefono).strip() == "":
                raise serializers.ValidationError({"telefono": "El teléfono es obligatorio."})
            if not self.instance:
                password = self.initial_data.get("password")
                if not password:
                    raise serializers.ValidationError({"password": "La contraseña es obligatoria."})
            if self.instance and self.instance.municipio_operacion_id != municipio.id:
                raise serializers.ValidationError(
                    {"municipio_operacion_id": "El municipio del coordinador no se puede modificar."}
                )
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class LeaderMetaSerializer(serializers.Serializer):
    meta_votantes = serializers.IntegerField(min_value=0)
