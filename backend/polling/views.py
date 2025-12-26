from django.db import transaction
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsLeaderOrAdmin, IsSurveySubmitterOrCoordinator
from accounts.models import ElectoralWitnessAssignment
from candidates.models import Candidato
from .models import MesaResult, PollingStation
from .serializers import MesaResultPayloadSerializer, PollingStationSerializer


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


class MesaResultViewSet(viewsets.ViewSet):
    def _ensure_witness(self, request):
        if not request.user or not request.user.is_authenticated or not request.user.is_witness:
            return Response(
                {"detail": "No autorizado para registrar resultados."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return None

    def _get_assignment(self, user, puesto_id, mesa):
        assignment = ElectoralWitnessAssignment.objects.select_related("puesto").filter(
            testigo=user, puesto_id=puesto_id
        ).first()
        if not assignment or mesa not in (assignment.mesas or []):
            return None
        return assignment

    def list(self, request):
        denial = self._ensure_witness(request)
        if denial:
            return denial
        assignment = ElectoralWitnessAssignment.objects.select_related("puesto").filter(
            testigo=request.user
        ).first()
        if not assignment:
            return Response([])
        mesas = assignment.mesas or []
        results = MesaResult.objects.filter(puesto=assignment.puesto, mesa__in=mesas)
        result_by_mesa = {result.mesa: result for result in results}
        data = []
        for mesa in mesas:
            result = result_by_mesa.get(mesa)
            data.append(
                {
                    "puesto_id": assignment.puesto_id,
                    "puesto_nombre": assignment.puesto.puesto,
                    "municipio": assignment.puesto.municipio,
                    "mesa": mesa,
                    "estado": result.estado if result else MesaResult.Estado.PENDIENTE,
                }
            )
        return Response(data)

    @action(detail=False, methods=["get", "post"], url_path=r"mesa/(?P<puesto_id>[^/.]+)/(?P<mesa>[^/.]+)")
    def mesa(self, request, puesto_id=None, mesa=None):
        denial = self._ensure_witness(request)
        if denial:
            return denial
        try:
            mesa_int = int(mesa)
        except (TypeError, ValueError):
            return Response({"detail": "La mesa indicada no es válida."}, status=status.HTTP_400_BAD_REQUEST)

        assignment = self._get_assignment(request.user, puesto_id, mesa_int)
        if not assignment:
            return Response(
                {"detail": "No tienes acceso a esta mesa."},
                status=status.HTTP_403_FORBIDDEN,
            )
        puesto = assignment.puesto
        candidates = list(Candidato.objects.order_by("nombre").values("id", "nombre"))
        result = MesaResult.objects.filter(puesto=puesto, mesa=mesa_int).first()

        if request.method == "GET":
            payload = {
                "puesto_id": puesto.id,
                "puesto_nombre": puesto.puesto,
                "municipio": puesto.municipio,
                "mesa": mesa_int,
                "estado": result.estado if result else MesaResult.Estado.PENDIENTE,
                "editable": not result or result.estado != MesaResult.Estado.ENVIADA,
                "candidatos": candidates,
                "votos": result.votos if result else None,
                "voto_blanco": result.voto_blanco if result else None,
                "voto_nulo": result.voto_nulo if result else None,
            }
            return Response(payload)

        if result and result.estado == MesaResult.Estado.ENVIADA:
            return Response(
                {"detail": "Los resultados de esta mesa ya fueron enviados."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = MesaResultPayloadSerializer(
            data=request.data,
            context={"candidate_ids": [item["id"] for item in candidates]},
        )
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        votos = payload["candidatos"]
        voto_blanco = payload["voto_blanco"]
        voto_nulo = payload["voto_nulo"]

        with transaction.atomic():
            if result:
                result.votos = votos
                result.voto_blanco = voto_blanco
                result.voto_nulo = voto_nulo
                result.estado = MesaResult.Estado.ENVIADA
                result.enviado_en = timezone.now()
                result.testigo = request.user
                result.municipio = puesto.municipio
                result.save()
            else:
                MesaResult.objects.create(
                    puesto=puesto,
                    mesa=mesa_int,
                    testigo=request.user,
                    municipio=puesto.municipio,
                    votos=votos,
                    voto_blanco=voto_blanco,
                    voto_nulo=voto_nulo,
                    estado=MesaResult.Estado.ENVIADA,
                    enviado_en=timezone.now(),
                )

        return Response({"detail": "Resultados enviados correctamente."}, status=status.HTTP_201_CREATED)
