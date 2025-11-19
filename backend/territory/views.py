from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsAdmin
from .models import MetaZona, Municipio, Zona, Departamento
from .serializers import (
    DepartamentoSerializer,
    MunicipioSerializer,
    ZonaMetaUpdateSerializer,
    ZonaSerializer,
)


class DepartamentoViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = Departamento.objects.all()
    serializer_class = DepartamentoSerializer
    permission_classes = [IsAuthenticated]


class MunicipioViewSet(
    mixins.ListModelMixin, mixins.CreateModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet
):
    queryset = Municipio.objects.select_related("departamento")
    serializer_class = MunicipioSerializer

    def get_permissions(self):
        if self.request.method in ("POST", "PUT", "PATCH", "DELETE"):
            permission_classes = [IsAdmin]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]


class ZoneViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Zona.objects.select_related("municipio__departamento", "meta")
    serializer_class = ZonaSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        municipio = self.request.query_params.get("municipio")
        tipo = self.request.query_params.get("tipo")
        if municipio:
            qs = qs.filter(municipio_id=municipio)
        if tipo:
            qs = qs.filter(tipo=tipo)
        return qs

    def get_permissions(self):
        if self.request.method in ("POST", "PUT", "PATCH", "DELETE"):
            permission_classes = [IsAdmin]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    @action(detail=True, methods=["patch"], permission_classes=[IsAdmin])
    def meta(self, request, pk=None):
        zona = self.get_object()
        serializer = ZonaMetaUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        meta = serializer.update(zona, serializer.validated_data)
        return Response({"zona": zona.id, "meta_encuestas": meta.meta_encuestas})
