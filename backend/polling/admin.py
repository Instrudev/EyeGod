from django.contrib import admin

from .models import PollingStation


@admin.register(PollingStation)
class PollingStationAdmin(admin.ModelAdmin):
    list_display = ("puesto", "departamento", "municipio", "mesas", "latitud", "longitud", "creado_por", "creado_en")
    search_fields = ("puesto", "departamento", "municipio")
    list_filter = ("creado_en",)
