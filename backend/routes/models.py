from django.db import models

from accounts.models import User
from territory.models import Zona


class RutaVisita(models.Model):
    class Estado(models.TextChoices):
        PENDIENTE = "PENDIENTE", "Pendiente"
        EN_CURSO = "EN_CURSO", "En curso"
        COMPLETADA = "COMPLETADA", "Completada"

    nombre_ruta = models.CharField(max_length=150)
    lider_creador = models.ForeignKey(User, on_delete=models.CASCADE, related_name="rutas_creadas")
    fecha_inicio = models.DateField(null=True, blank=True)
    fecha_fin = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=15, choices=Estado.choices, default=Estado.PENDIENTE)

    def __str__(self):
        return self.nombre_ruta

    @property
    def avance(self):
        zonas = [rz.zona for rz in self.ruta_zonas.select_related("zona", "zona__meta")]
        if not zonas:
            return 0
        total = 0
        for zona in zonas:
            meta = zona.meta.meta_encuestas if hasattr(zona, "meta") else 0
            hechas = zona.encuestas.count()
            if meta > 0:
                total += min((hechas / meta) * 100, 100)
        return round(total / zonas.count(), 2)

    def actualizar_estado(self):
        zonas = [rz.zona for rz in self.ruta_zonas.select_related("zona", "zona__meta")]
        if zonas and all(zona.encuestas.count() >= zona.meta.meta_encuestas for zona in zonas if hasattr(zona, "meta")):
            self.estado = self.Estado.COMPLETADA
        elif self.avance > 0:
            self.estado = self.Estado.EN_CURSO
        else:
            self.estado = self.Estado.PENDIENTE
        self.save()


class RutaZona(models.Model):
    ruta = models.ForeignKey(RutaVisita, on_delete=models.CASCADE, related_name="ruta_zonas")
    zona = models.ForeignKey(Zona, on_delete=models.CASCADE, related_name="ruta_zonas")


class RutaColaborador(models.Model):
    ruta = models.ForeignKey(RutaVisita, on_delete=models.CASCADE, related_name="ruta_colaboradores")
    colaborador = models.ForeignKey(User, on_delete=models.CASCADE, related_name="rutas_asignadas")
