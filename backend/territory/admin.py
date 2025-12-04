from django.contrib import admin

from .models import Departamento, MetaZona, Municipio, Zona, ZonaAsignacion

admin.site.register(Departamento)
admin.site.register(Municipio)
admin.site.register(Zona)
admin.site.register(MetaZona)
admin.site.register(ZonaAsignacion)
