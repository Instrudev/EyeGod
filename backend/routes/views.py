from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsLeader, IsLeaderOrAdmin
from .models import RutaColaborador, RutaVisita
from .serializers import RutaColaboradorSerializer, RutaVisitaSerializer


class RouteViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    queryset = RutaVisita.objects.prefetch_related("ruta_zonas__zona", "ruta_colaboradores__colaborador")
    serializer_class = RutaVisitaSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy", "asignar_colaborador"]:
            permission_classes = [IsLeaderOrAdmin]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_leader:
            qs = qs.filter(lider_creador=user)
        if user.is_collaborator:
            qs = qs.filter(ruta_colaboradores__colaborador=user)
        return qs.distinct()

    @action(detail=True, methods=["post"], url_path="asignar-colaborador")
    def asignar_colaborador(self, request, pk=None):
        ruta = self.get_object()
        serializer = RutaColaboradorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        colaborador = serializer.validated_data["colaborador"]
        RutaColaborador.objects.get_or_create(ruta=ruta, colaborador=colaborador)
        return Response({"ruta": ruta.id, "colaborador": colaborador.id})

    @action(detail=False, methods=["get"], url_path="mis-rutas")
    def mis_rutas(self, request):
        user = request.user
        rutas = self.get_queryset().filter(ruta_colaboradores__colaborador=user)
        serializer = self.get_serializer(rutas, many=True)
        return Response(serializer.data)
