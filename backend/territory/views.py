from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsAdmin, IsLeader
from .models import MetaZona, Zona
from .serializers import ZonaMetaUpdateSerializer, ZonaSerializer


class ZoneViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
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

    @action(detail=True, methods=["patch"], permission_classes=[IsAdmin])
    def meta(self, request, pk=None):
        zona = self.get_object()
        serializer = ZonaMetaUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        meta = serializer.update(zona, serializer.validated_data)
        return Response({"zona": zona.id, "meta_encuestas": meta.meta_encuestas})
