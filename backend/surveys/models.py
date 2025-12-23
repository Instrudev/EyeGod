from django.core.validators import RegexValidator
from django.db import models

from accounts.models import User
from territory.models import Zona


class Necesidad(models.Model):
    nombre = models.CharField(max_length=100)

    def __str__(self):
        return self.nombre


class Encuesta(models.Model):
    class NivelAfinidad(models.IntegerChoices):
        TOTALMENTE_DE_ACUERDO = 1, "Totalmente de acuerdo"
        DE_ACUERDO = 2, "De acuerdo"
        INDECISO = 3, "Indeciso"
        EN_DESACUERDO = 4, "En desacuerdo"
        TOTALMENTE_EN_DESACUERDO = 5, "Totalmente en desacuerdo"

    class DisposicionVoto(models.IntegerChoices):
        SEGURO_VOTA = 1, "Seguro vota"
        TAL_VEZ_VOTA = 2, "Tal vez vota"
        NO_VOTA = 3, "No vota"

    class CapacidadInfluencia(models.IntegerChoices):
        NINGUNA = 0, "Ninguna"
        UNO_DOS = 1, "1-2 personas"
        TRES_CINCO = 2, "3-5 personas"
        MAS_DE_CINCO = 3, "Más de 5 personas"

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

    class EstadoValidacion(models.TextChoices):
        PENDIENTE = "PENDIENTE", "Pendiente de validación"
        VALIDADO = "VALIDADO", "Validado"
        NO_VALIDADO = "NO_VALIDADO", "No validado"
        VALIDADO_AJUSTADO = "VALIDADO_AJUSTADO", "Validado con ajustes"

    zona = models.ForeignKey(Zona, on_delete=models.CASCADE, related_name="encuestas")
    colaborador = models.ForeignKey(User, on_delete=models.CASCADE, related_name="encuestas")
    fecha_hora = models.DateTimeField(auto_now_add=True)
    fecha_creacion = models.DateField(auto_now_add=True)
    cedula = models.CharField(
        max_length=15,
        validators=[RegexValidator(regex=r"^\d+$", message="Solo se permiten números en la cédula.")],
        null=True,
        blank=True,
    )
    primer_nombre = models.CharField(max_length=80, blank=True, null=True)
    segundo_nombre = models.CharField(max_length=80, blank=True, null=True)
    primer_apellido = models.CharField(max_length=80, blank=True, null=True)
    segundo_apellido = models.CharField(max_length=80, blank=True, null=True)
    telefono = models.CharField(max_length=30)
    correo = models.EmailField(blank=True, null=True)
    sexo = models.CharField(max_length=20, blank=True, null=True)
    pais = models.CharField(max_length=80, blank=True, null=True)
    departamento = models.CharField(max_length=80, blank=True, null=True)
    municipio = models.CharField(max_length=80, blank=True, null=True)
    puesto = models.CharField(max_length=120, blank=True, null=True)
    mesa = models.CharField(max_length=40, blank=True, null=True)
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
    nivel_afinidad = models.PositiveSmallIntegerField(
        choices=NivelAfinidad.choices, null=True, blank=True
    )
    disposicion_voto = models.PositiveSmallIntegerField(
        choices=DisposicionVoto.choices, null=True, blank=True
    )
    capacidad_influencia = models.PositiveSmallIntegerField(
        choices=CapacidadInfluencia.choices, null=True, blank=True
    )
    estado_validacion = models.CharField(
        max_length=20,
        choices=EstadoValidacion.choices,
        default=EstadoValidacion.PENDIENTE,
    )
    votante_valido = models.BooleanField(default=False, editable=False)
    votante_potencial = models.BooleanField(default=False, editable=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["cedula"], name="unique_encuesta_cedula"),
        ]

    def __str__(self):
        return f"Encuesta {self.id} - {self.zona.nombre}"

    def _apply_votante_flags(self):
        self.votante_valido = False
        self.votante_potencial = False
        if not self.cedula:
            return
        if self.nivel_afinidad is None or self.disposicion_voto is None:
            return
        if self.nivel_afinidad in (
            self.NivelAfinidad.TOTALMENTE_DE_ACUERDO,
            self.NivelAfinidad.DE_ACUERDO,
        ) and self.disposicion_voto == self.DisposicionVoto.SEGURO_VOTA:
            self.votante_valido = True
            return
        if (
            self.nivel_afinidad == self.NivelAfinidad.INDECISO
            and self.disposicion_voto
            in (self.DisposicionVoto.SEGURO_VOTA, self.DisposicionVoto.TAL_VEZ_VOTA)
        ):
            self.votante_potencial = True

    def _update_leader_score(self):
        leader = None
        if self.colaborador_id and self.colaborador.is_leader:
            leader = self.colaborador
        elif (
            self.colaborador_id
            and self.colaborador.created_by_id
            and self.colaborador.created_by.is_leader
        ):
            leader = self.colaborador.created_by
        if not leader:
            return
        from django.db.models import Q

        qs = Encuesta.objects.filter(
            Q(colaborador=leader) | Q(colaborador__created_by=leader)
        )
        total = qs.count()
        validos = qs.filter(votante_valido=True).count()
        score = round((validos / total) * 100, 2) if total else 0
        if leader.score_confiabilidad != score:
            leader.score_confiabilidad = score
            leader.save(update_fields=["score_confiabilidad"])

    def save(self, *args, **kwargs):
        self._apply_votante_flags()
        super().save(*args, **kwargs)
        self._update_leader_score()


class CedulaValidationMaster(models.Model):
    cedula = models.CharField(max_length=15, unique=True)
    pais = models.CharField(max_length=80, blank=True, null=True)
    departamento = models.CharField(max_length=80, blank=True, null=True)
    municipio = models.CharField(max_length=80, blank=True, null=True)
    puesto = models.CharField(max_length=120, blank=True, null=True)
    mesa = models.CharField(max_length=40, blank=True, null=True)
    primer_nombre = models.CharField(max_length=80, blank=True, null=True)
    segundo_nombre = models.CharField(max_length=80, blank=True, null=True)
    primer_apellido = models.CharField(max_length=80, blank=True, null=True)
    segundo_apellido = models.CharField(max_length=80, blank=True, null=True)
    telefono = models.CharField(max_length=30, blank=True, null=True)
    correo = models.EmailField(blank=True, null=True)
    sexo = models.CharField(max_length=20, blank=True, null=True)

    class Meta:
        ordering = ["cedula"]

    def __str__(self):
        return f"Cédula {self.cedula}"


class SurveyValidationAudit(models.Model):
    class TipoValidacion(models.TextChoices):
        INDIVIDUAL = "INDIVIDUAL", "Individual"
        MASIVA = "MASIVA", "Masiva"

    class EstadoResultado(models.TextChoices):
        CONFIRMADO = "CONFIRMADO", "Confirmado"
        CANCELADO = "CANCELADO", "Cancelado"
        SIN_COINCIDENCIA = "SIN_COINCIDENCIA", "Sin coincidencia"

    class TipoEvento(models.TextChoices):
        VALIDACION = "VALIDACION", "Validación"
        EDICION_MANUAL = "EDICION_MANUAL", "Edición manual"

    registro = models.ForeignKey(
        Encuesta,
        on_delete=models.SET_NULL,
        null=True,
        related_name="auditorias_validacion",
    )
    cedula = models.CharField(max_length=15)
    usuario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    rol_usuario = models.CharField(max_length=20)
    fecha_hora = models.DateTimeField(auto_now_add=True)
    tipo_validacion = models.CharField(max_length=15, choices=TipoValidacion.choices)
    tipo_evento = models.CharField(
        max_length=20, choices=TipoEvento.choices, default=TipoEvento.VALIDACION
    )
    datos_antes = models.JSONField()
    datos_nuevos = models.JSONField(null=True, blank=True)
    estado_resultado = models.CharField(max_length=20, choices=EstadoResultado.choices)
    estado_validacion_anterior = models.CharField(max_length=20, blank=True, null=True)
    estado_validacion_nuevo = models.CharField(max_length=20, blank=True, null=True)

    class Meta:
        ordering = ["-fecha_hora"]


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
