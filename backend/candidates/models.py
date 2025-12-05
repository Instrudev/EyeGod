from django.conf import settings
from django.db import models


class Candidato(models.Model):
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="candidato",
    )
    nombre = models.CharField(max_length=255)
    cargo = models.CharField(max_length=255)
    foto = models.ImageField(upload_to="candidatos/fotos/", null=True, blank=True)
    partido = models.CharField(max_length=255)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Candidato"
        verbose_name_plural = "Candidatos"

    def __str__(self):
        return self.nombre
