from django.db.models import Count, F

from territory.models import MetaZona, Zona


def calcular_cobertura_por_zona():
    data = []
    zonas = Zona.objects.select_related("municipio", "municipio__departamento", "meta")
    for zona in zonas:
        meta = zona.meta.meta_encuestas if hasattr(zona, "meta") else 0
        total = zona.encuestas.count()
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
                "meta_encuestas": meta,
                "total_encuestas": total,
                "cobertura_porcentaje": porcentaje,
                "estado_cobertura": estado,
            }
        )
    return data
