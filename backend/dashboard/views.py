import datetime

from django.db.models import Count, Sum
from django.db.models.functions import Coalesce
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.models import User
from accounts.permissions import IsNonCandidate
from surveys.models import CasoCiudadano, Encuesta, EncuestaNecesidad
from territory.models import Zona, ZonaAsignacion
from surveys.services import calcular_cobertura_por_zona


class DashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsNonCandidate]

    def _deny_for_collaborator(self, request):
        if getattr(request.user, "role", None) == User.Roles.COLABORADOR:
            return Response(
                {"detail": "No autorizado para acceder al tablero completo."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return None

    def list(self, request):
        return self.resumen(request)

    @action(detail=False, methods=["get"], url_path="resumen")
    def resumen(self, request):
        denial = self._deny_for_collaborator(request)
        if denial:
            return denial
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
        denial = self._deny_for_collaborator(request)
        if denial:
            return denial
        return Response(calcular_cobertura_por_zona())

    @action(detail=False, methods=["get"], url_path="encuestas_por_dia")
    def encuestas_por_dia(self, request):
        denial = self._deny_for_collaborator(request)
        if denial:
            return denial
        start = request.query_params.get("start_date")
        end = request.query_params.get("end_date")

        try:
            start_date = datetime.date.fromisoformat(start) if start else None
            end_date = datetime.date.fromisoformat(end) if end else None
        except ValueError:
            return Response(
                {"detail": "Formato de fecha inválido. Usa AAAA-MM-DD."}, status=400
            )

        qs = Encuesta.objects.all()
        if start_date:
            qs = qs.filter(fecha_creacion__gte=start_date)
        if end_date:
            qs = qs.filter(fecha_creacion__lte=end_date)

        data = (
            qs.values("fecha_creacion")
            .annotate(total=Count("id"))
            .order_by("fecha_creacion")
        )
        return Response(list(data))

    @action(detail=False, methods=["get"], url_path="avance_colaboradores")
    def avance_colaboradores(self, request):
        denial = self._deny_for_collaborator(request)
        if denial:
            return denial
        start = request.query_params.get("start_date")
        end = request.query_params.get("end_date")

        try:
            start_date = datetime.date.fromisoformat(start) if start else None
            end_date = datetime.date.fromisoformat(end) if end else None
        except ValueError:
            return Response(
                {"detail": "Formato de fecha inválido. Usa AAAA-MM-DD."}, status=400
            )

        encuestas = Encuesta.objects.all()
        if start_date:
            encuestas = encuestas.filter(fecha_creacion__gte=start_date)
        if end_date:
            encuestas = encuestas.filter(fecha_creacion__lte=end_date)

        colaboradores_qs = User.objects.filter(role=User.Roles.COLABORADOR)
        if request.user.role == User.Roles.LIDER:
            colaboradores_qs = colaboradores_qs.filter(created_by=request.user)
            encuestas = encuestas.filter(colaborador__created_by=request.user)

        encuestas_por_colaborador = {
            item["colaborador_id"]: item["total"]
            for item in encuestas.values("colaborador_id").annotate(total=Count("id"))
        }

        metas_por_colaborador = {
            item["colaborador_id"]: item["meta_total"] or 0
            for item in ZonaAsignacion.objects.filter(colaborador__in=colaboradores_qs)
            .values("colaborador_id")
            .annotate(meta_total=Coalesce(Sum("zona__meta__meta_encuestas"), 0))
        }

        colaboradores = colaboradores_qs.order_by("name").values("id", "name")

        data = [
            {
                "id": c["id"],
                "nombre": c["name"],
                "encuestas_realizadas": encuestas_por_colaborador.get(c["id"], 0),
                "meta_encuestas": metas_por_colaborador.get(c["id"], 0),
            }
            for c in colaboradores
        ]

        return Response(data)
