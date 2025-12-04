from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.models import User
from .models import Agenda
from .serializers import AgendaSerializer


class AgendaViewSet(viewsets.ModelViewSet):
    queryset = Agenda.objects.select_related("lider", "candidato", "candidato__usuario")
    serializer_class = AgendaSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["estado", "candidato"]
    search_fields = ["titulo", "descripcion", "lugar", "candidato__nombre"]
    ordering = ["-fecha", "-hora_inicio"]

    def get_queryset(self):
        qs = super().get_queryset()
        user: User = self.request.user
        if user.is_admin:
            return qs
        if user.is_leader:
            return qs.filter(lider=user)
        if user.is_candidate:
            return qs.filter(candidato__usuario=user)
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        if not (user.is_leader or user.is_admin):
            raise permissions.PermissionDenied("Solo los líderes o administradores pueden crear agendas.")
        serializer.save(lider=user, estado=Agenda.Estados.PENDIENTE)

    def perform_update(self, serializer):
        agenda: Agenda = self.get_object()
        user = self.request.user
        if not (user.is_admin or (user.is_leader and agenda.lider_id == user.id)):
            raise permissions.PermissionDenied("No puedes editar esta agenda.")
        serializer.save()

    def update(self, request, *args, **kwargs):
        agenda: Agenda = self.get_object()
        user = request.user
        if user.is_candidate:
            return Response({"detail": "No puedes editar agendas."}, status=status.HTTP_403_FORBIDDEN)
        if agenda.estado == Agenda.Estados.ACEPTADA:
            return Response(
                {"detail": "No se puede editar una agenda aceptada."}, status=status.HTTP_400_BAD_REQUEST
            )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        agenda: Agenda = self.get_object()
        user = request.user
        if not (user.is_admin or (user.is_leader and agenda.lider_id == user.id)):
            return Response({"detail": "No puedes eliminar esta agenda."}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="cancelar")
    def cancelar(self, request, pk=None):
        agenda: Agenda = self.get_object()
        user = request.user
        if not (user.is_admin or (user.is_leader and agenda.lider_id == user.id)):
            return Response({"detail": "No puedes cancelar esta agenda."}, status=status.HTTP_403_FORBIDDEN)
        agenda.estado = Agenda.Estados.RECHAZADA
        agenda.save(update_fields=["estado", "fecha_actualizacion"])
        return Response(self.get_serializer(agenda).data)

    @action(detail=True, methods=["post"], url_path="responder")
    def responder(self, request, pk=None):
        agenda: Agenda = self.get_object()
        user = request.user
        if not user.is_candidate or agenda.candidato.usuario_id != user.id:
            return Response({"detail": "No puedes responder esta agenda."}, status=status.HTTP_403_FORBIDDEN)

        if agenda.estado in [Agenda.Estados.ACEPTADA, Agenda.Estados.RECHAZADA]:
            return Response(
                {"detail": "Esta agenda ya fue respondida."}, status=status.HTTP_400_BAD_REQUEST
            )

        accion = request.data.get("accion")
        motivo = request.data.get("motivo_reprogramacion", "")

        if accion == "aceptar":
            agenda.estado = Agenda.Estados.ACEPTADA
            agenda.motivo_reprogramacion = ""
        elif accion == "rechazar":
            agenda.estado = Agenda.Estados.RECHAZADA
            agenda.motivo_reprogramacion = ""
        elif accion == "reprogramar":
            if not motivo:
                return Response(
                    {"detail": "Debes indicar un motivo de reprogramación."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            agenda.estado = Agenda.Estados.REPROGRAMACION_SOLICITADA
            agenda.motivo_reprogramacion = motivo
        else:
            return Response(
                {"detail": "Acción no válida. Usa aceptar, rechazar o reprogramar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        agenda.save(update_fields=["estado", "motivo_reprogramacion", "fecha_actualizacion"])
        return Response(self.get_serializer(agenda).data)
