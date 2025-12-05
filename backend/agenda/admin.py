from django.contrib import admin

from .models import Agenda


@admin.register(Agenda)
class AgendaAdmin(admin.ModelAdmin):
    list_display = (
        "titulo",
        "candidato",
        "lider",
        "fecha",
        "hora_inicio",
        "estado",
    )
    list_filter = ("estado", "fecha")
    search_fields = ("titulo", "candidato__nombre", "lider__name")
    autocomplete_fields = ("candidato", "lider")
