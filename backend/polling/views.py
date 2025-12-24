from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsLeaderOrAdmin, IsSurveySubmitterOrCoordinator
from accounts.models import ElectoralWitnessAssignment
from .models import PollingStation
from .serializers import PollingStationSerializer


class PollingStationViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    queryset = PollingStation.objects.select_related("creado_por")
    serializer_class = PollingStationSerializer

    def get_permissions(self):
        if self.action == "destroy":
            permission_classes = [IsLeaderOrAdmin]
        else:
            permission_classes = [IsSurveySubmitterOrCoordinator]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if getattr(user, "is_coordinator", False) and user.municipio_operacion:
            qs = qs.filter(municipio__iexact=user.municipio_operacion.nombre)
        return qs

    @action(detail=True, methods=["get"], url_path="mesas-disponibles")
    def mesas_disponibles(self, request, pk=None):
        puesto = self.get_object()
        try:
            total_mesas = int(str(puesto.mesas).strip())
        except (TypeError, ValueError):
            return Response({"detail": "El puesto no tiene un número de mesas válido."}, status=400)
        assigned = set()
        assignments = ElectoralWitnessAssignment.objects.filter(puesto=puesto).values_list("mesas", flat=True)
        for mesas in assignments:
            if isinstance(mesas, list):
                assigned.update(int(mesa) for mesa in mesas)
        mesas_disponibles = [mesa for mesa in range(1, total_mesas + 1) if mesa not in assigned]
        return Response(
            {
                "puesto_id": puesto.id,
                "mesas_totales": total_mesas,
                "mesas_asignadas": sorted(assigned),
                "mesas_disponibles": mesas_disponibles,
            }
        )
