from rest_framework import mixins, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin, IsCollaborator, IsLeader, IsSurveySubmitter
from .models import Encuesta, Necesidad
from .serializers import CoverageSerializer, NeedSerializer, SurveySerializer
from .services import calcular_cobertura_por_zona


class SurveyViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = Encuesta.objects.select_related("zona", "colaborador")
    serializer_class = SurveySerializer

    def get_permissions(self):
        permission_classes = [IsSurveySubmitter]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_collaborator:
            qs = qs.filter(colaborador=user)
        elif user.is_leader:
            municipios = user.municipio_set.values_list("id", flat=True) if hasattr(user, "municipio_set") else []
            qs = qs.filter(zona__municipio_id__in=municipios)
        return qs

    def perform_create(self, serializer):
        serializer.save()


class NeedViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = Necesidad.objects.all()
    serializer_class = NeedSerializer
    permission_classes = [IsSurveySubmitter]


class CoverageView(APIView):
    permission_classes = [IsSurveySubmitter]

    def get(self, request):
        data = calcular_cobertura_por_zona(request.user)
        serializer = CoverageSerializer(data, many=True)
        return Response(serializer.data)
