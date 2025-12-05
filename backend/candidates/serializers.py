from django.utils import timezone
from rest_framework import serializers

from accounts.models import User
from .models import Candidato


class CandidatoSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    generated_password = serializers.SerializerMethodField()
    usuario_id = serializers.IntegerField(source="usuario.id", read_only=True)
    usuario_email = serializers.EmailField(source="usuario.email", read_only=True)

    class Meta:
        model = Candidato
        fields = [
            "id",
            "nombre",
            "cargo",
            "partido",
            "foto",
            "fecha_creacion",
            "fecha_actualizacion",
            "usuario_id",
            "usuario_email",
            "email",
            "password",
            "generated_password",
        ]
        read_only_fields = [
            "id",
            "fecha_creacion",
            "fecha_actualizacion",
            "usuario_id",
            "usuario_email",
            "generated_password",
        ]

    def create(self, validated_data):
        email = validated_data.pop("email")
        password = validated_data.pop("password", None)
        nombre = validated_data.get("nombre")
        password_to_use = password or User.objects.make_random_password()
        user = User(email=email, name=nombre, role=User.Roles.CANDIDATO, is_active=True)
        user.set_password(password_to_use)
        user.save()
        candidato = Candidato.objects.create(usuario=user, **validated_data)
        candidato.generated_password = password_to_use
        return candidato

    def update(self, instance, validated_data):
        email = validated_data.pop("email", None)
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.fecha_actualizacion = timezone.now()
        if email:
            instance.usuario.email = email
        instance.usuario.name = instance.nombre
        if password:
            instance.usuario.set_password(password)
            instance.generated_password = password
        instance.usuario.save()
        instance.save()
        return instance

    def get_generated_password(self, obj):
        return getattr(obj, "generated_password", None)
