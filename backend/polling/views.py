from rest_framework import mixins, viewsets

from accounts.permissions import IsLeaderOrAdmin, IsSurveySubmitter
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
            permission_classes = [IsSurveySubmitter]
        return [permission() for permission in permission_classes]
