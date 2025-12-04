from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsAdmin
from .models import Candidato
from .serializers import CandidatoSerializer


class CandidatoViewSet(viewsets.ModelViewSet):
    queryset = Candidato.objects.select_related("usuario")
    serializer_class = CandidatoSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["partido"]
    search_fields = ["nombre", "cargo", "partido", "usuario__email"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            permission_classes = [IsAdmin]
        elif self.action in ["list", "retrieve"]:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_admin:
            return qs
        if user.is_leader:
            return qs
        if user.is_candidate:
            return qs.filter(usuario=user)
        return qs.none()

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        user = request.user
        if not user.is_candidate:
            return Response({"detail": "Solo disponible para candidatos."}, status=status.HTTP_403_FORBIDDEN)
        try:
            candidato = Candidato.objects.select_related("usuario").get(usuario=user)
        except Candidato.DoesNotExist:
            return Response({"detail": "No tienes un perfil de candidato."}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(candidato)
        return Response(serializer.data)

    def perform_destroy(self, instance):
        user = instance.usuario
        super().perform_destroy(instance)
        user.delete()
