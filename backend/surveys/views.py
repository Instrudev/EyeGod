from typing import Optional

from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin, IsCollaborator, IsLeader, IsSurveySubmitter
from .models import CedulaValidationMaster, Encuesta, Necesidad, SurveyValidationAudit
from .serializers import CoverageSerializer, NeedSerializer, SurveySerializer
from .services import calcular_cobertura_por_zona


class SurveyViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = Encuesta.objects.select_related("zona", "colaborador")
    serializer_class = SurveySerializer

    def get_permissions(self):
        if self.action in ["previsualizar_validaciones", "confirmar_validaciones", "cancelar_validaciones"]:
            permission_classes = [IsAdmin]
        else:
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

    def _build_snapshot(self, encuesta: Encuesta):
        return {
            "cedula": encuesta.cedula,
            "primer_nombre": encuesta.primer_nombre,
            "segundo_nombre": encuesta.segundo_nombre,
            "primer_apellido": encuesta.primer_apellido,
            "segundo_apellido": encuesta.segundo_apellido,
            "telefono": encuesta.telefono,
            "correo": encuesta.correo,
            "sexo": encuesta.sexo,
            "pais": encuesta.pais,
            "departamento": encuesta.departamento,
            "municipio": encuesta.municipio,
            "puesto": encuesta.puesto,
            "mesa": encuesta.mesa,
            "estado_validacion": encuesta.estado_validacion,
        }

    def _build_master_snapshot(self, master: Optional[CedulaValidationMaster]):
        if not master:
            return None
        return {
            "cedula": master.cedula,
            "primer_nombre": master.primer_nombre,
            "segundo_nombre": master.segundo_nombre,
            "primer_apellido": master.primer_apellido,
            "segundo_apellido": master.segundo_apellido,
            "telefono": master.telefono,
            "correo": master.correo,
            "sexo": master.sexo,
            "pais": master.pais,
            "departamento": master.departamento,
            "municipio": master.municipio,
            "puesto": master.puesto,
            "mesa": master.mesa,
        }

    def _build_changes(self, current, proposed):
        if not proposed:
            return {}
        return {
            key: current.get(key) != proposed.get(key)
            for key in proposed.keys()
            if key in current
        }

    def _apply_master(self, encuesta: Encuesta, master: CedulaValidationMaster):
        def normalize(value):
            if value is None:
                return None
            if isinstance(value, str) and value.strip() == "":
                return None
            return value

        updates = {
            "primer_nombre": normalize(master.primer_nombre),
            "segundo_nombre": normalize(master.segundo_nombre),
            "primer_apellido": normalize(master.primer_apellido),
            "segundo_apellido": normalize(master.segundo_apellido),
            "telefono": normalize(master.telefono) or encuesta.telefono,
            "correo": normalize(master.correo),
            "sexo": normalize(master.sexo),
            "pais": normalize(master.pais),
            "departamento": normalize(master.departamento),
            "municipio": normalize(master.municipio),
            "puesto": normalize(master.puesto),
            "mesa": normalize(master.mesa),
            "estado_validacion": Encuesta.EstadoValidacion.VALIDADO,
        }
        for key, value in updates.items():
            if value is not None:
                setattr(encuesta, key, value)

    @action(detail=False, methods=["post"], url_path="validaciones/previsualizar")
    def previsualizar_validaciones(self, request):
        ids = request.data.get("ids", [])
        if not isinstance(ids, list) or not ids:
            return Response({"detail": "Debe enviar una lista de registros."}, status=status.HTTP_400_BAD_REQUEST)
        encuestas = list(Encuesta.objects.filter(id__in=ids))
        cedulas = [encuesta.cedula for encuesta in encuestas if encuesta.cedula]
        masters = CedulaValidationMaster.objects.filter(cedula__in=cedulas)
        master_map = {master.cedula: master for master in masters}

        items = []
        matches = 0
        for encuesta in encuestas:
            master = master_map.get(encuesta.cedula)
            current = self._build_snapshot(encuesta)
            proposed = self._build_master_snapshot(master)
            if master:
                matches += 1
            items.append(
                {
                    "registro_id": encuesta.id,
                    "cedula": encuesta.cedula,
                    "match": bool(master),
                    "current": current,
                    "proposed": proposed,
                    "changes": self._build_changes(current, proposed),
                }
            )

        return Response(
            {
                "items": items,
                "summary": {
                    "total": len(encuestas),
                    "matches": matches,
                    "no_match": len(encuestas) - matches,
                },
            }
        )

    @action(detail=False, methods=["post"], url_path="validaciones/confirmar")
    def confirmar_validaciones(self, request):
        ids = request.data.get("ids", [])
        tipo = request.data.get("tipo_validacion", SurveyValidationAudit.TipoValidacion.MASIVA)
        if not isinstance(ids, list) or not ids:
            return Response({"detail": "Debe enviar una lista de registros."}, status=status.HTTP_400_BAD_REQUEST)
        encuestas = list(Encuesta.objects.filter(id__in=ids))
        cedulas = [encuesta.cedula for encuesta in encuestas if encuesta.cedula]
        masters = CedulaValidationMaster.objects.filter(cedula__in=cedulas)
        master_map = {master.cedula: master for master in masters}

        resumen = {
            "total": len(encuestas),
            "validados": 0,
            "no_encontrados": 0,
            "cancelados": 0,
            "errores": 0,
        }
        errores = []

        for encuesta in encuestas:
            try:
                master = master_map.get(encuesta.cedula)
                before_snapshot = self._build_snapshot(encuesta)
                proposed = self._build_master_snapshot(master)
                if master:
                    self._apply_master(encuesta, master)
                    encuesta.save()
                    resumen["validados"] += 1
                    resultado = SurveyValidationAudit.EstadoResultado.CONFIRMADO
                else:
                    encuesta.estado_validacion = Encuesta.EstadoValidacion.NO_VALIDADO
                    encuesta.save(update_fields=["estado_validacion"])
                    resumen["no_encontrados"] += 1
                    resultado = SurveyValidationAudit.EstadoResultado.SIN_COINCIDENCIA
                SurveyValidationAudit.objects.create(
                    registro=encuesta,
                    cedula=encuesta.cedula or "",
                    usuario=request.user,
                    rol_usuario=request.user.role,
                    tipo_validacion=tipo,
                    datos_antes=before_snapshot,
                    datos_nuevos=proposed,
                    estado_resultado=resultado,
                )
            except Exception as exc:
                resumen["errores"] += 1
                errores.append({"registro_id": encuesta.id, "error": str(exc)})

        return Response({"summary": resumen, "errors": errores})

    @action(detail=False, methods=["post"], url_path="validaciones/cancelar")
    def cancelar_validaciones(self, request):
        ids = request.data.get("ids", [])
        tipo = request.data.get("tipo_validacion", SurveyValidationAudit.TipoValidacion.MASIVA)
        if not isinstance(ids, list) or not ids:
            return Response({"detail": "Debe enviar una lista de registros."}, status=status.HTTP_400_BAD_REQUEST)
        encuestas = list(Encuesta.objects.filter(id__in=ids))
        cedulas = [encuesta.cedula for encuesta in encuestas if encuesta.cedula]
        masters = CedulaValidationMaster.objects.filter(cedula__in=cedulas)
        master_map = {master.cedula: master for master in masters}

        resumen = {
            "total": len(encuestas),
            "validados": 0,
            "no_encontrados": 0,
            "cancelados": len(encuestas),
            "errores": 0,
        }
        errores = []

        for encuesta in encuestas:
            try:
                master = master_map.get(encuesta.cedula)
                SurveyValidationAudit.objects.create(
                    registro=encuesta,
                    cedula=encuesta.cedula or "",
                    usuario=request.user,
                    rol_usuario=request.user.role,
                    tipo_validacion=tipo,
                    datos_antes=self._build_snapshot(encuesta),
                    datos_nuevos=self._build_master_snapshot(master),
                    estado_resultado=SurveyValidationAudit.EstadoResultado.CANCELADO,
                )
            except Exception as exc:
                resumen["errores"] += 1
                errores.append({"registro_id": encuesta.id, "error": str(exc)})

        return Response({"summary": resumen, "errors": errores})


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
