from django.conf import settings
from django.db import models


class PollingStation(models.Model):
    nombre = models.CharField(max_length=255, blank=True, null=True)
    departamento = models.CharField(max_length=120)
    municipio = models.CharField(max_length=120)
    puesto = models.CharField(max_length=255)
    mesas = models.CharField(max_length=120)
    direccion = models.CharField(max_length=255)
    latitud = models.DecimalField(max_digits=9, decimal_places=6)
    longitud = models.DecimalField(max_digits=9, decimal_places=6)
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="polling_stations",
    )
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-creado_en"]
        constraints = [
            models.UniqueConstraint(
                fields=["departamento", "municipio", "puesto", "mesas", "direccion", "latitud", "longitud"],
                name="unique_polling_station",
            )
        ]

    def __str__(self) -> str:
        return f"{self.puesto} ({self.latitud}, {self.longitud})"


class MesaResult(models.Model):
    class Estado(models.TextChoices):
        PENDIENTE = "PENDIENTE", "Pendiente"
        ENVIADA = "ENVIADA", "Enviada"

    puesto = models.ForeignKey(
        "polling.PollingStation",
        on_delete=models.CASCADE,
        related_name="resultados_mesas",
    )
    testigo = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="resultados_mesas",
    )
    municipio = models.CharField(max_length=120)
    mesa = models.PositiveIntegerField()
    votos = models.JSONField()
    voto_blanco = models.PositiveIntegerField()
    voto_nulo = models.PositiveIntegerField()
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.PENDIENTE)
    enviado_en = models.DateTimeField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["puesto", "mesa"], name="unique_mesa_result"),
        ]
