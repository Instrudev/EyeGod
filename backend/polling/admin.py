from django.contrib import admin

from .models import PollingStation


@admin.register(PollingStation)
class PollingStationAdmin(admin.ModelAdmin):
    list_display = ("nombre", "latitud", "longitud", "creado_por", "creado_en")
    search_fields = ("nombre",)
    list_filter = ("creado_en",)
