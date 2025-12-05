from django.contrib import admin

from .models import Candidato


@admin.register(Candidato)
class CandidatoAdmin(admin.ModelAdmin):
    list_display = ("nombre", "cargo", "partido", "usuario")
    search_fields = ("nombre", "cargo", "partido", "usuario__email")
