from django.db.models import Count
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsAdmin
from surveys.models import CasoCiudadano, Encuesta, EncuestaNecesidad
from territory.models import Zona
from surveys.services import calcular_cobertura_por_zona


class DashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsAdmin]

    def list(self, request):
        return self.resumen(request)

    @action(detail=False, methods=["get"], url_path="resumen")
    def resumen(self, request):
        total_encuestas = Encuesta.objects.count()
        cobertura = calcular_cobertura_por_zona()
        zonas_cumplidas = len([z for z in cobertura if z["estado_cobertura"] == "CUMPLIDA"])
        zonas_sin = len([z for z in cobertura if z["estado_cobertura"] == "SIN_COBERTURA"])
        top_necesidades = (
            EncuestaNecesidad.objects.values("necesidad__nombre")
            .annotate(total=Count("id"))
            .order_by("-total")[:3]
        )
        casos_activos = CasoCiudadano.objects.exclude(estado=CasoCiudadano.Estado.ATENDIDO).count()
        data = {
            "total_encuestas": total_encuestas,
            "zonas_cumplidas": zonas_cumplidas,
            "zonas_sin_cobertura": zonas_sin,
            "top_necesidades": list(top_necesidades),
            "casos_activos": casos_activos,
        }
        return Response(data)

    @action(detail=False, methods=["get"], url_path="mapa")
    def mapa(self, request):
        return Response(calcular_cobertura_por_zona())
