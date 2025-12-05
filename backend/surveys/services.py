from django.db.models import Count, Q

from territory.models import MetaZona, Zona
from .models import EncuestaNecesidad


def calcular_cobertura_por_zona(user=None):
    data = []
    zona_filter = Q()
    if user and getattr(user, "is_collaborator", False):
        zona_filter = Q(encuestas__colaborador=user) | Q(asignaciones__colaborador=user)

    zonas = (
        Zona.objects.filter(zona_filter)
        .select_related("municipio", "municipio__departamento", "meta")
        .distinct()
    )
    needs_qs = EncuestaNecesidad.objects.all()
    if user and getattr(user, "is_collaborator", False):
        needs_qs = needs_qs.filter(encuesta__colaborador=user)

    necesidades_por_zona = {}
    for item in (
        needs_qs.values("encuesta__zona_id", "necesidad__nombre")
        .annotate(total=Count("id"))
        .order_by("-total")
    ):
        zona_id = item["encuesta__zona_id"]
        necesidades_por_zona.setdefault(zona_id, []).append(
            {"nombre": item["necesidad__nombre"], "total": item["total"]}
        )
    for zona in zonas:
        try:
            meta_obj = zona.meta
            meta = meta_obj.meta_encuestas if meta_obj else 0
        except MetaZona.DoesNotExist:
            meta = 0
        encuestas_qs = zona.encuestas.all()
        if user and getattr(user, "is_collaborator", False):
            encuestas_qs = encuestas_qs.filter(colaborador=user)
        total = encuestas_qs.count()
        porcentaje = 0
        if meta > 0:
            porcentaje = round((total / meta) * 100, 2)
        estado = "SIN_COBERTURA"
        if porcentaje == 0:
            estado = "SIN_COBERTURA"
        elif 0 < porcentaje < 50:
            estado = "BAJA"
        elif 50 <= porcentaje < 100:
            estado = "MEDIA"
        elif porcentaje >= 100:
            estado = "CUMPLIDA"
        data.append(
            {
                "zona": zona.id,
                "zona_nombre": zona.nombre,
                "municipio_nombre": zona.municipio.nombre,
                "lat": zona.lat or zona.municipio.lat,
                "lon": zona.lon or zona.municipio.lon,
                "municipio_lat": zona.municipio.lat,
                "municipio_lon": zona.municipio.lon,
                "necesidades": necesidades_por_zona.get(zona.id, []),
                "meta_encuestas": meta,
                "total_encuestas": total,
                "cobertura_porcentaje": porcentaje,
                "estado_cobertura": estado,
            }
        )
    return data
