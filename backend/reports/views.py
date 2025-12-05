import datetime
import io
from collections import Counter, defaultdict

from django.db.models import Count
from django.utils.timezone import now
from django.http import HttpResponse
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsAdmin
from accounts.models import User
from routes.models import RutaVisita
from surveys.models import CasoCiudadano, Encuesta, EncuestaNecesidad
from territory.models import Departamento, MetaZona, Municipio, Zona


def _parse_date(value: str | None):
    if not value:
        return None
    try:
        return datetime.date.fromisoformat(value)
    except ValueError:
        return None


def _calcular_estado_cobertura(porcentaje: float):
    if porcentaje <= 0:
        return "SIN_COBERTURA"
    if porcentaje < 50:
        return "BAJA"
    if 50 <= porcentaje < 100:
        return "MEDIA"
    return "CUMPLIDA"


def _build_report_data(start_date=None, end_date=None):
    encuestas = Encuesta.objects.select_related("zona", "zona__municipio", "colaborador")
    if start_date:
        encuestas = encuestas.filter(fecha_creacion__gte=start_date)
    if end_date:
        encuestas = encuestas.filter(fecha_creacion__lte=end_date)

    encuestas_por_zona = {
        item["zona_id"]: item["total"]
        for item in encuestas.values("zona_id").annotate(total=Count("id"))
    }

    metas_por_zona = {
        mz.zona_id: mz.meta_encuestas for mz in MetaZona.objects.select_related("zona")
    }

    zonas = (
        Zona.objects.select_related("municipio", "municipio__departamento", "meta")
        .prefetch_related("encuestas")
        .all()
    )

    cobertura_zonas = []
    resumen_por_municipio = defaultdict(lambda: {"total_zonas": 0, "total_encuestas": 0, "meta_total": 0})
    for zona in zonas:
        meta = metas_por_zona.get(zona.id, 0)
        total = encuestas_por_zona.get(zona.id, 0)
        porcentaje = round((total / meta) * 100, 2) if meta else 0
        estado = _calcular_estado_cobertura(porcentaje)
        cobertura_zonas.append(
            {
                "id": zona.id,
                "nombre": zona.nombre,
                "municipio": zona.municipio.nombre,
                "meta_encuestas": meta,
                "total_encuestas": total,
                "cobertura_porcentaje": porcentaje,
                "estado": estado,
            }
        )
        resumen = resumen_por_municipio[zona.municipio.nombre]
        resumen["total_zonas"] += 1
        resumen["total_encuestas"] += total
        resumen["meta_total"] += meta

    cobertura_municipios = []
    for municipio_nombre, resumen in resumen_por_municipio.items():
        meta_total = resumen["meta_total"] or 0
        porcentaje = round((resumen["total_encuestas"] / meta_total) * 100, 2) if meta_total else 0
        cobertura_municipios.append(
            {
                "municipio": municipio_nombre,
                "total_zonas": resumen["total_zonas"],
                "total_encuestas": resumen["total_encuestas"],
                "meta_total": meta_total,
                "cobertura_porcentaje": porcentaje,
            }
        )

    necesidades_qs = EncuestaNecesidad.objects.select_related("encuesta__zona__municipio", "necesidad")
    if start_date:
        necesidades_qs = necesidades_qs.filter(encuesta__fecha_creacion__gte=start_date)
    if end_date:
        necesidades_qs = necesidades_qs.filter(encuesta__fecha_creacion__lte=end_date)

    top_necesidades = list(
        necesidades_qs.values("necesidad__nombre").annotate(total=Count("id")).order_by("-total")[:5]
    )
    necesidades_por_municipio = list(
        necesidades_qs.values("encuesta__zona__municipio__nombre")
        .annotate(total=Count("id"))
        .order_by("-total")
    )
    necesidades_por_municipio_zona = list(
        necesidades_qs.values(
            "encuesta__zona__id",
            "encuesta__zona__municipio__nombre",
            "encuesta__zona__nombre",
        )
        .annotate(total=Count("id"))
        .order_by("encuesta__zona__municipio__nombre", "-total")
    )
    necesidades_por_zona_detalle = list(
        necesidades_qs.values(
            "encuesta__zona__id",
            "encuesta__zona__nombre",
            "encuesta__zona__municipio__nombre",
            "necesidad__nombre",
        )
        .annotate(total=Count("id"))
        .order_by(
            "encuesta__zona__municipio__nombre",
            "encuesta__zona__nombre",
            "-total",
        )
    )
    necesidades_por_zona = list(
        necesidades_qs.values("encuesta__zona__nombre", "encuesta__zona__municipio__nombre")
        .annotate(total=Count("id"))
        .order_by("-total")
    )

    comentarios = encuestas.exclude(comentario_problema__isnull=True).exclude(comentario_problema__exact="")
    comentarios_data = [
        {
            "zona": encuesta.zona.nombre,
            "municipio": encuesta.zona.municipio.nombre,
            "comentario": encuesta.comentario_problema,
            "fecha": encuesta.fecha_creacion.isoformat(),
            "encuestador": encuesta.colaborador.name,
            "caso_critico": encuesta.caso_critico,
        }
        for encuesta in comentarios
    ]

    palabras = Counter()
    for item in comentarios_data:
        for palabra in item["comentario"].lower().replace(",", " ").replace(".", " ").split():
            if len(palabra) > 4:
                palabras[palabra] += 1
    temas_recurrentes = [
        {"tema": palabra, "total": total} for palabra, total in palabras.most_common(8)
    ]

    casos = CasoCiudadano.objects.select_related("encuesta__zona__municipio")
    total_casos = casos.count()
    casos_por_prioridad = list(casos.values("nivel_prioridad").annotate(total=Count("id")))
    casos_por_estado = list(casos.values("estado").annotate(total=Count("id")))
    casos_criticos = [
        {
            "id": caso.id,
            "prioridad": caso.nivel_prioridad,
            "estado": caso.estado,
            "zona": caso.encuesta.zona.nombre,
            "municipio": caso.encuesta.zona.municipio.nombre,
        }
        for caso in casos.filter(nivel_prioridad=CasoCiudadano.Prioridad.ALTA)[:20]
    ]

    rutas = RutaVisita.objects.prefetch_related("ruta_zonas__zona__meta", "ruta_colaboradores").all()
    rutas_resumen = []
    for ruta in rutas:
        zona_items = []
        for rz in ruta.ruta_zonas.select_related("zona", "zona__municipio"):
            meta = metas_por_zona.get(rz.zona_id, 0)
            total = encuestas_por_zona.get(rz.zona_id, 0)
            porcentaje = round((total / meta) * 100, 2) if meta else 0
            zona_items.append(
                {
                    "nombre": rz.zona.nombre,
                    "municipio": rz.zona.municipio.nombre,
                    "meta_encuestas": meta,
                    "total_encuestas": total,
                    "cobertura_porcentaje": porcentaje,
                }
            )
        rutas_resumen.append(
            {
                "id": ruta.id,
                "nombre": ruta.nombre_ruta,
                "estado": ruta.estado,
                "colaboradores": ruta.ruta_colaboradores.count(),
                "zonas": zona_items,
                "avance": ruta.avance,
            }
        )

    encuestas_por_colaborador = {
        item["colaborador_id"]: item["total"]
        for item in encuestas.values("colaborador_id").annotate(total=Count("id"))
    }

    necesidades_por_colaborador = defaultdict(Counter)
    for item in necesidades_qs.values("encuesta__colaborador_id", "necesidad__nombre").annotate(total=Count("id")):
        necesidades_por_colaborador[item["encuesta__colaborador_id"]][item["necesidad__nombre"]] = item["total"]

    zonas_por_colaborador = defaultdict(set)
    for item in encuestas.values("colaborador_id", "zona__nombre"):
        zonas_por_colaborador[item["colaborador_id"]].add(item["zona__nombre"])

    series_por_colaborador = defaultdict(list)
    for item in encuestas.values("colaborador_id", "fecha_creacion").annotate(total=Count("id")).order_by("fecha_creacion"):
        series_por_colaborador[item["colaborador_id"]].append(
            {"fecha": item["fecha_creacion"].isoformat(), "total": item["total"]}
        )

    colaboradores_activos = User.objects.filter(id__in=encuestas_por_colaborador.keys())
    encuestadores = []
    for colab in colaboradores_activos:
        top_needs = necesidades_por_colaborador.get(colab.id, {})
        encuestadores.append(
            {
                "id": colab.id,
                "nombre": colab.name,
                "total_encuestas": encuestas_por_colaborador.get(colab.id, 0),
                "zonas": sorted(list(zonas_por_colaborador.get(colab.id, []))),
                "necesidades_top": [
                    {"nombre": n, "total": total}
                    for n, total in Counter(top_needs).most_common(3)
                ],
                "serie": series_por_colaborador.get(colab.id, []),
            }
        )

    data = {
        "titulo": "REPORTE ÚNICO DE INTELIGENCIA TERRITORIAL",
        "generado_en": now().isoformat(),
        "resumen_general": {
            "total_departamentos": Departamento.objects.count(),
            "total_municipios": Municipio.objects.count(),
            "total_zonas": Zona.objects.count(),
            "total_encuestas": encuestas.count(),
            "total_necesidades": necesidades_qs.count(),
            "total_casos": CasoCiudadano.objects.count(),
        },
        "cobertura": {
            "zonas": cobertura_zonas,
            "municipios": cobertura_municipios,
        },
        "necesidades": {
            "top": top_necesidades,
            "por_municipio": necesidades_por_municipio,
            "por_municipio_zona": necesidades_por_municipio_zona,
            "por_zona_detalle": necesidades_por_zona_detalle,
            "por_zona": necesidades_por_zona,
        },
        "comentarios": {
            "detalle": comentarios_data,
            "temas_recurrentes": temas_recurrentes,
        },
        "casos": {
            "total": total_casos,
            "por_prioridad": casos_por_prioridad,
            "por_estado": casos_por_estado,
            "criticos": casos_criticos,
        },
        "rutas": {
            "total": rutas.count(),
            "detalle": rutas_resumen,
        },
        "encuestadores": encuestadores,
    }
    return data


class ReporteUnicoViewSet(viewsets.ViewSet):
    permission_classes = [IsAdmin]

    def list(self, request):
        start_date = _parse_date(request.query_params.get("start_date"))
        end_date = _parse_date(request.query_params.get("end_date"))
        data = _build_report_data(start_date, end_date)
        return Response(data)

    @action(detail=False, methods=["get"], url_path="pdf")
    def pdf(self, request):
        start_date = _parse_date(request.query_params.get("start_date"))
        end_date = _parse_date(request.query_params.get("end_date"))
        data = _build_report_data(start_date, end_date)

        buffer = io.BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        y = height - 50

        pdf.setFont("Helvetica-Bold", 14)
        pdf.drawString(50, y, "REPORTE ÚNICO DE INTELIGENCIA TERRITORIAL")
        y -= 20
        pdf.setFont("Helvetica", 10)
        pdf.drawString(50, y, f"Generado: {data['generado_en']}")
        y -= 30

        def section(title):
            nonlocal y
            if y < 100:
                pdf.showPage()
                y = height - 50
            pdf.setFont("Helvetica-Bold", 12)
            pdf.drawString(50, y, title)
            y -= 16
            pdf.setFont("Helvetica", 10)

        section("1. Resumen general")
        resumen = data["resumen_general"]
        for label, key in [
            ("Departamentos", "total_departamentos"),
            ("Municipios", "total_municipios"),
            ("Zonas", "total_zonas"),
            ("Encuestas", "total_encuestas"),
            ("Necesidades", "total_necesidades"),
            ("Casos ciudadanos", "total_casos"),
        ]:
            pdf.drawString(60, y, f"{label}: {resumen[key]}")
            y -= 14
        y -= 10

        section("2. Cobertura por zona")
        for item in data["cobertura"]["zonas"][:20]:
            pdf.drawString(
                60,
                y,
                f"{item['nombre']} ({item['municipio']}) - {item['total_encuestas']} encuestas / meta {item['meta_encuestas']} ({item['cobertura_porcentaje']}%) [{item['estado']}]",
            )
            y -= 14
            if y < 80:
                pdf.showPage()
                y = height - 50
                pdf.setFont("Helvetica", 10)
        y -= 10

        section("3. Necesidades principales")
        for item in data["necesidades"]["top"]:
            pdf.drawString(60, y, f"{item['necesidad__nombre']}: {item['total']}")
            y -= 14
        y -= 10

        section("4. Casos ciudadanos")
        pdf.drawString(60, y, f"Total casos: {data['casos']['total']}")
        y -= 14
        for item in data["casos"]["por_prioridad"]:
            pdf.drawString(60, y, f"Prioridad {item['nivel_prioridad']}: {item['total']}")
            y -= 14
        y -= 10

        section("5. Rutas de visita")
        for ruta in data["rutas"]["detalle"]:
            pdf.drawString(
                60,
                y,
                f"{ruta['nombre']} - {ruta['estado']} | Avance: {ruta['avance']}% | Colaboradores: {ruta['colaboradores']}",
            )
            y -= 14
            if y < 80:
                pdf.showPage()
                y = height - 50
                pdf.setFont("Helvetica", 10)
        y -= 10

        section("6. Actividad por encuestadores")
        for enc in data["encuestadores"][:20]:
            pdf.drawString(
                60,
                y,
                f"{enc['nombre']}: {enc['total_encuestas']} encuestas | Zonas: {', '.join(enc['zonas'][:3])}",
            )
            y -= 14
            if y < 80:
                pdf.showPage()
                y = height - 50
                pdf.setFont("Helvetica", 10)

        y -= 20
        pdf.setFont("Helvetica-Oblique", 9)
        pdf.drawString(
            50,
            y,
            "Nota: Información confidencial para uso institucional."
        )

        y -= 20
        pdf.drawString(50, y, "Firma / Sello:")
        pdf.line(120, y - 5, 300, y - 5)

        pdf.showPage()
        pdf.save()
        pdf_value = buffer.getvalue()
        buffer.close()

        response = HttpResponse(pdf_value, content_type="application/pdf")
        response["Content-Disposition"] = "attachment; filename=reporte_unico.pdf"
        return response
