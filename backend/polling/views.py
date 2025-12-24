from rest_framework import mixins, viewsets

from accounts.permissions import IsLeaderOrAdmin, IsSurveySubmitterOrCoordinator
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
