from django.conf import settings
from django.db import models


class Agenda(models.Model):
    class Estados(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        ACEPTADA = "aceptada", "Aceptada"
        RECHAZADA = "rechazada", "Rechazada"
        REPROGRAMACION_SOLICITADA = "reprogramacion_solicitada", "Reprogramación solicitada"

    lider = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="agendas_creadas",
    )
    candidato = models.ForeignKey(
        "candidates.Candidato",
        on_delete=models.CASCADE,
        related_name="agendas",
    )
    titulo = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True)
    fecha = models.DateField()
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    lugar = models.CharField(max_length=255)
    estado = models.CharField(
        max_length=32, choices=Estados.choices, default=Estados.PENDIENTE
    )
    motivo_reprogramacion = models.TextField(blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-fecha", "-hora_inicio"]
        verbose_name = "Agenda"
        verbose_name_plural = "Agendas"

    def __str__(self):
        return f"{self.titulo} - {self.get_estado_display()}"
