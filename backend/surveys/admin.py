from django.contrib import admin

from .models import CasoCiudadano, Encuesta, EncuestaNecesidad, Necesidad

admin.site.register(Necesidad)
admin.site.register(Encuesta)
admin.site.register(EncuestaNecesidad)
admin.site.register(CasoCiudadano)
