from django.db import models

from accounts.models import User
from territory.models import Zona


class Necesidad(models.Model):
    nombre = models.CharField(max_length=100)

    def __str__(self):
        return self.nombre


class Encuesta(models.Model):
    class TipoVivienda(models.TextChoices):
        PROPIA = "PROPIA", "Propia"
        ARRIENDO = "ARRIENDO", "Arriendo"
        FAMILIAR = "FAMILIAR", "Familiar"
        OTRO = "OTRO", "Otro"

    class RangoEdad(models.TextChoices):
        JOVEN = "14-25", "14-25"
        ADULTO = "26-40", "26-40"
        ADULTO_MAYOR = "41-60", "41-60"
        MAYOR = "60+", "60+"

    class Ocupacion(models.TextChoices):
        ESTUDIANTE = "ESTUDIANTE", "Estudiante"
        EMPLEADO = "EMPLEADO", "Empleado"
        INDEPENDIENTE = "INDEPENDIENTE", "Independiente"
        DESEMPLEADO = "DESEMPLEADO", "Desempleado"
        AGRICULTOR = "AGRICULTOR", "Agricultor"
        OTRO = "OTRO", "Otro"

    zona = models.ForeignKey(Zona, on_delete=models.CASCADE, related_name="encuestas")
    colaborador = models.ForeignKey(User, on_delete=models.CASCADE, related_name="encuestas")
    fecha_hora = models.DateTimeField(auto_now_add=True)
    nombre_ciudadano = models.CharField(max_length=150, blank=True, null=True)
    telefono = models.CharField(max_length=30)
    tipo_vivienda = models.CharField(max_length=20, choices=TipoVivienda.choices)
    rango_edad = models.CharField(max_length=10, choices=RangoEdad.choices)
    ocupacion = models.CharField(max_length=20, choices=Ocupacion.choices)
    tiene_ninos = models.BooleanField(default=False)
    tiene_adultos_mayores = models.BooleanField(default=False)
    tiene_personas_con_discapacidad = models.BooleanField(default=False)
    comentario_problema = models.TextField(blank=True, null=True)
    consentimiento = models.BooleanField(default=False)
    lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    lon = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    caso_critico = models.BooleanField(default=False)

    def __str__(self):
        return f"Encuesta {self.id} - {self.zona.nombre}"


class EncuestaNecesidad(models.Model):
    encuesta = models.ForeignKey(Encuesta, on_delete=models.CASCADE, related_name="necesidades")
    necesidad = models.ForeignKey(Necesidad, on_delete=models.CASCADE)
    prioridad = models.IntegerField(choices=[(1, "Alta"), (2, "Media"), (3, "Baja")])

    class Meta:
        unique_together = ("encuesta", "prioridad")


class CasoCiudadano(models.Model):
    class Prioridad(models.TextChoices):
        BAJA = "BAJA", "Baja"
        MEDIA = "MEDIA", "Media"
        ALTA = "ALTA", "Alta"

    class Estado(models.TextChoices):
        REGISTRADO = "REGISTRADO", "Registrado"
        EN_REVISION = "EN_REVISION", "En revisión"
        ATENDIDO = "ATENDIDO", "Atendido"

    encuesta = models.OneToOneField(Encuesta, on_delete=models.CASCADE, related_name="caso")
    nivel_prioridad = models.CharField(max_length=10, choices=Prioridad.choices)
    estado = models.CharField(max_length=15, choices=Estado.choices, default=Estado.REGISTRADO)
    notas_seguimiento = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Caso {self.id} - {self.nivel_prioridad}"
