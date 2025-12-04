from rest_framework import serializers

from accounts.models import User
from candidates.models import Candidato
from .models import Agenda


class AgendaSerializer(serializers.ModelSerializer):
    lider_nombre = serializers.CharField(source="lider.name", read_only=True)
    candidato_nombre = serializers.CharField(source="candidato.nombre", read_only=True)
    candidato_email = serializers.EmailField(source="candidato.usuario.email", read_only=True)
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)

    class Meta:
        model = Agenda
        fields = [
            "id",
            "lider",
            "lider_nombre",
            "candidato",
            "candidato_nombre",
            "candidato_email",
            "titulo",
            "descripcion",
            "fecha",
            "hora_inicio",
            "hora_fin",
            "lugar",
            "estado",
            "estado_display",
            "motivo_reprogramacion",
            "fecha_creacion",
            "fecha_actualizacion",
        ]
        read_only_fields = [
            "id",
            "lider",
            "lider_nombre",
            "estado",
            "estado_display",
            "motivo_reprogramacion",
            "fecha_creacion",
            "fecha_actualizacion",
        ]

    def validate_candidato(self, value):
        if not isinstance(value, Candidato):
            raise serializers.ValidationError("Candidato inválido")
        return value

    def create(self, validated_data):
        request = self.context.get("request")
        user: User = getattr(request, "user", None)
        if not user or not (user.is_leader or user.is_admin):
            raise serializers.ValidationError("Solo los líderes o administradores pueden crear agendas.")
        validated_data["lider"] = user
        validated_data["estado"] = Agenda.Estados.PENDIENTE
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if instance.estado == Agenda.Estados.ACEPTADA:
            raise serializers.ValidationError("No se puede editar una agenda aceptada.")
        updated = super().update(instance, validated_data)
        if updated.estado == Agenda.Estados.REPROGRAMACION_SOLICITADA:
            updated.estado = Agenda.Estados.PENDIENTE
            updated.save(update_fields=["estado", "fecha_actualizacion"])
        return updated
