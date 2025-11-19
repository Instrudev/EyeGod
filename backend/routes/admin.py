from django.contrib import admin

from .models import RutaColaborador, RutaVisita, RutaZona

admin.site.register(RutaVisita)
admin.site.register(RutaZona)
admin.site.register(RutaColaborador)
