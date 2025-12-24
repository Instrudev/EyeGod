import datetime

from django.conf import settings
from django.db.models import Count, Q, Sum
from django.db.models.functions import Coalesce
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.models import ElectoralWitnessAssignment, User
from accounts.permissions import IsAdminOrCandidate, IsCandidate, IsNonCandidate
from surveys.models import CasoCiudadano, Encuesta, EncuestaNecesidad
from territory.models import Zona, ZonaAsignacion
from surveys.services import calcular_cobertura_por_zona
from candidates.models import Candidato
from polling.models import MesaResult, PollingStation


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

    @action(detail=False, methods=["get"], url_path="candidato", permission_classes=[IsCandidate])
    def candidato(self, request):
        total_registros = Encuesta.objects.count()
        votantes_validos = Encuesta.objects.filter(votante_valido=True).count()
        votantes_potenciales = Encuesta.objects.filter(votante_potencial=True).count()

        municipios_qs = (
            Encuesta.objects.values(
                "zona__municipio_id",
                "zona__municipio__nombre",
                "zona__municipio__lat",
                "zona__municipio__lon",
            )
            .annotate(
                total=Count("id"),
                validos=Count("id", filter=Q(votante_valido=True)),
                potenciales=Count("id", filter=Q(votante_potencial=True)),
            )
            .order_by("zona__municipio__nombre")
        )
        cobertura_municipios = []
        for item in municipios_qs:
            total = item["total"] or 0
            validos = item["validos"] or 0
            cobertura_municipios.append(
                {
                    "municipio_id": item["zona__municipio_id"],
                    "municipio_nombre": item["zona__municipio__nombre"],
                    "lat": item["zona__municipio__lat"],
                    "lon": item["zona__municipio__lon"],
                    "total_registros": total,
                    "votantes_validos": validos,
                    "votantes_potenciales": item["potenciales"] or 0,
                    "cumplimiento_porcentaje": round((validos / total) * 100, 2) if total else 0,
                }
            )

        leaders = User.objects.filter(role=User.Roles.LIDER).order_by("name")
        ranking = []
        alertas = []
        today = datetime.date.today()
        for leader in leaders:
            leader_encuestas = Encuesta.objects.filter(
                Q(colaborador=leader) | Q(colaborador__created_by=leader)
            )
            total = leader_encuestas.count()
            validos = leader_encuestas.filter(votante_valido=True).count()
            meta = leader.meta_votantes or 0
            cumplimiento = round((validos / meta) * 100, 2) if meta else 0
            score = round((validos / total) * 100, 2) if total else 0
            if leader.score_confiabilidad != score:
                leader.score_confiabilidad = score
                leader.save(update_fields=["score_confiabilidad"])
            ranking.append(
                {
                    "lider_id": leader.id,
                    "lider_nombre": leader.name,
                    "meta_votantes": meta,
                    "votantes_validos": validos,
                    "cumplimiento_porcentaje": cumplimiento,
                    "score_confiabilidad": score,
                }
            )
            last_survey = leader_encuestas.order_by("-fecha_creacion").values_list(
                "fecha_creacion", flat=True
            ).first()
            if not last_survey or (today - last_survey).days > 14:
                alertas.append(
                    {
                        "tipo": "lider_sin_registros",
                        "mensaje": f"{leader.name} no registra encuestas recientes.",
                    }
                )
            if total and (validos / total) < 0.6:
                alertas.append(
                    {
                        "tipo": "lider_registros_invalidos",
                        "mensaje": f"{leader.name} tiene baja confiabilidad en registros.",
                    }
                )

        for municipio in cobertura_municipios:
            if municipio["total_registros"] and municipio["cumplimiento_porcentaje"] < 30:
                alertas.append(
                    {
                        "tipo": "municipio_bajo_desempeno",
                        "mensaje": f"Bajo desempeño en {municipio['municipio_nombre']}.",
                    }
                )

        data = {
            "total_registros": total_registros,
            "votantes_validos": votantes_validos,
            "votantes_potenciales": votantes_potenciales,
            "cobertura_municipios": cobertura_municipios,
            "ranking_lideres": ranking,
            "alertas": alertas,
        }
        return Response(data)

    @action(detail=False, methods=["get"], url_path="alertas", permission_classes=[IsAdminOrCandidate])
    def alertas(self, request):
        today = datetime.date.today()
        campaign_start = getattr(settings, "CAMPAIGN_START_DATE", None)
        campaign_end = getattr(settings, "CAMPAIGN_END_DATE", None)
        if isinstance(campaign_start, str):
            campaign_start = datetime.date.fromisoformat(campaign_start)
        if isinstance(campaign_end, str):
            campaign_end = datetime.date.fromisoformat(campaign_end)

        alerts = []
        leaders = User.objects.filter(role=User.Roles.LIDER).order_by("name")
        for leader in leaders:
            encuestas_qs = Encuesta.objects.filter(
                Q(colaborador=leader) | Q(colaborador__created_by=leader)
            )
            valid_qs = encuestas_qs.filter(votante_valido=True)
            valid_count = valid_qs.count()
            total_count = encuestas_qs.count()
            last_valid_date = valid_qs.order_by("-fecha_creacion").values_list(
                "fecha_creacion", flat=True
            ).first()

            if not last_valid_date or (today - last_valid_date).days > 5:
                alerts.append(
                    {
                        "tipo": "lider_inactivo",
                        "nivel": "ALTO",
                        "leader_id": leader.id,
                        "leader_nombre": leader.name,
                        "mensaje": f"Líder {leader.name}: sin registros válidos en los últimos 5 días.",
                        "fecha_evaluacion": today.isoformat(),
                    }
                )

            if campaign_start and campaign_end and leader.meta_votantes:
                days_elapsed = max(1, (today - campaign_start).days + 1)
                days_remaining = max(0, (campaign_end - today).days)
                ritmo_diario = valid_count / days_elapsed
                proyeccion_total = valid_count + (ritmo_diario * days_remaining)
                if proyeccion_total < leader.meta_votantes:
                    alerts.append(
                        {
                            "tipo": "meta_en_riesgo",
                            "nivel": "MEDIO",
                            "leader_id": leader.id,
                            "leader_nombre": leader.name,
                            "mensaje": f"Líder {leader.name}: al ritmo actual no alcanzará la meta asignada.",
                            "fecha_evaluacion": today.isoformat(),
                        }
                    )

            if total_count:
                invalid_count = total_count - valid_count
                porcentaje_invalidos = (invalid_count / total_count) * 100
                if porcentaje_invalidos > 40:
                    alerts.append(
                        {
                            "tipo": "baja_calidad_registros",
                            "nivel": "MEDIO",
                            "leader_id": leader.id,
                            "leader_nombre": leader.name,
                            "mensaje": f"Líder {leader.name}: alto porcentaje de registros no válidos.",
                            "fecha_evaluacion": today.isoformat(),
                        }
                    )

        priority = {"ALTO": 0, "MEDIO": 1, "BAJO": 2}
        alerts.sort(key=lambda item: (priority.get(item["nivel"], 3), item["leader_nombre"]))
        return Response(alerts)

    @action(detail=False, methods=["get"], url_path="mesas-coordinador")
    def mesas_coordinador(self, request):
        if request.user.role != User.Roles.COORDINADOR_ELECTORAL:
            return Response(
                {"detail": "No autorizado para acceder a las mesas del coordinador."},
                status=status.HTTP_403_FORBIDDEN,
            )
        coordinator_assignments = (
            ElectoralWitnessAssignment.objects.filter(creado_por=request.user)
            .select_related("puesto", "testigo")
            .order_by("puesto__puesto", "testigo__name")
        )
        puestos = {assignment.puesto_id: assignment.puesto for assignment in coordinator_assignments}
        assigned_by_puesto = {}
        for assignment in coordinator_assignments:
            assigned_by_puesto.setdefault(assignment.puesto_id, []).append(assignment)

        response = []
        for puesto_id, puesto in puestos.items():
            assigned_all = set()
            for mesas in ElectoralWitnessAssignment.objects.filter(puesto=puesto).values_list("mesas", flat=True):
                if isinstance(mesas, list):
                    assigned_all.update(int(mesa) for mesa in mesas)
            try:
                total_mesas = int(str(puesto.mesas).strip())
            except (TypeError, ValueError):
                total_mesas = 0
            total_range = set(range(1, total_mesas + 1))
            mesas_sin_testigo = sorted(total_range - assigned_all)

            mesas_asignadas = []
            for assignment in assigned_by_puesto.get(puesto_id, []):
                for mesa in assignment.mesas or []:
                    mesas_asignadas.append(
                        {
                            "mesa": mesa,
                            "estado": None,
                            "testigo_id": assignment.testigo_id,
                            "testigo_nombre": assignment.testigo.name,
                            "testigo_email": assignment.testigo.email,
                        }
                    )

            response.append(
                {
                    "puesto_id": puesto.id,
                    "puesto_nombre": puesto.puesto,
                    "municipio": puesto.municipio,
                    "mesas_totales": total_mesas,
                    "mesas_asignadas": sorted(mesas_asignadas, key=lambda item: item["mesa"]),
                    "mesas_sin_testigo": mesas_sin_testigo,
                }
            )

        return Response(sorted(response, key=lambda item: item["puesto_nombre"]))

    @action(detail=False, methods=["get"], url_path="reportes-filtros")
    def reportes_filtros(self, request):
        if not request.user.is_admin:
            return Response(
                {"detail": "No autorizado para acceder a esta información."},
                status=status.HTTP_403_FORBIDDEN,
            )
        departamento = request.query_params.get("departamento")
        municipio = request.query_params.get("municipio")

        stations = PollingStation.objects.all()
        if departamento:
            stations = stations.filter(departamento__iexact=departamento)
        if municipio:
            stations = stations.filter(municipio__iexact=municipio)

        departamentos = (
            PollingStation.objects.values_list("departamento", flat=True).distinct().order_by("departamento")
        )
        municipios = stations.values_list("municipio", flat=True).distinct().order_by("municipio")
        puestos = stations.values("id", "puesto").order_by("puesto")
        return Response(
            {
                "departamentos": list(departamentos),
                "municipios": list(municipios),
                "puestos": list(puestos),
            }
        )

    @action(detail=False, methods=["get"], url_path="estadisticas-reportes")
    def estadisticas_reportes(self, request):
        if not request.user.is_admin:
            return Response(
                {"detail": "No autorizado para acceder a esta información."},
                status=status.HTTP_403_FORBIDDEN,
            )
        departamento = request.query_params.get("departamento")
        municipio = request.query_params.get("municipio")
        puesto_id = request.query_params.get("puesto_id")

        stations = PollingStation.objects.all()
        if departamento:
            stations = stations.filter(departamento__iexact=departamento)
        if municipio:
            stations = stations.filter(municipio__iexact=municipio)
        if puesto_id:
            stations = stations.filter(id=puesto_id)

        station_map = {station.id: station for station in stations}
        assignments = ElectoralWitnessAssignment.objects.filter(puesto__in=station_map.keys()).select_related(
            "testigo", "puesto"
        )

        assigned_by_puesto = {}
        assigned_testigos = {}
        for assignment in assignments:
            assigned_by_puesto.setdefault(assignment.puesto_id, set())
            for mesa in assignment.mesas or []:
                assigned_by_puesto[assignment.puesto_id].add(int(mesa))
                assigned_testigos.setdefault((assignment.puesto_id, int(mesa)), assignment.testigo)

        results = MesaResult.objects.filter(
            puesto__in=station_map.keys(),
            estado=MesaResult.Estado.ENVIADA,
        ).select_related("testigo", "puesto")
        candidatos = {candidato.id: candidato.nombre for candidato in Candidato.objects.all()}
        votos_por_candidato = {candidato_id: 0 for candidato_id in candidatos.keys()}

        result_by_key = {}
        for result in results:
            result_by_key[(result.puesto_id, result.mesa)] = result
            for voto in result.votos or []:
                candidato_id = voto.get("id")
                cantidad = voto.get("votos")
                if candidato_id in votos_por_candidato and isinstance(cantidad, int) and cantidad >= 0:
                    votos_por_candidato[candidato_id] += cantidad

        total_asignadas = 0
        total_enviadas = 0
        total_pendientes = 0
        total_incidencias = 0
        rows = []
        for station_id, station in station_map.items():
            mesas_asignadas = sorted(assigned_by_puesto.get(station_id, set()))
            total_asignadas += len(mesas_asignadas)
            mesas_enviadas = 0
            mesas_detalle = []
            for mesa in mesas_asignadas:
                result = result_by_key.get((station_id, mesa))
                if result and result.estado == MesaResult.Estado.ENVIADA:
                    mesas_enviadas += 1
                testigo = assigned_testigos.get((station_id, mesa))
                mesas_detalle.append(
                    {
                        "mesa": mesa,
                        "estado": result.estado if result else MesaResult.Estado.PENDIENTE,
                        "testigo_id": testigo.id if testigo else None,
                        "testigo_nombre": testigo.name if testigo else None,
                        "testigo_email": testigo.email if testigo else None,
                        "enviado_en": result.enviado_en if result else None,
                        "resultado_id": result.id if result else None,
                    }
                )
            pendientes = len(mesas_asignadas) - mesas_enviadas
            total_enviadas += mesas_enviadas
            total_pendientes += pendientes
            rows.append(
                {
                    "puesto_id": station.id,
                    "puesto": station.puesto,
                    "municipio": station.municipio,
                    "departamento": station.departamento,
                    "total_mesas_asignadas": len(mesas_asignadas),
                    "total_enviadas": mesas_enviadas,
                    "total_pendientes": pendientes,
                    "total_incidencias": 0,
                    "mesas_detalle": mesas_detalle,
                }
            )

        data = {
            "totales": {
                "total_mesas_asignadas": total_asignadas,
                "total_enviadas": total_enviadas,
                "total_pendientes": total_pendientes,
                "total_incidencias": total_incidencias,
            },
            "votos_por_candidato": [
                {"candidato_id": candidato_id, "candidato_nombre": nombre, "total_votos": total}
                for candidato_id, nombre in candidatos.items()
                for total in [votos_por_candidato.get(candidato_id, 0)]
            ],
            "filas": rows,
        }
        return Response(data)
