from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Roles(models.TextChoices):
        ADMIN = "ADMIN", "Administrador"
        COORDINADOR_ELECTORAL = "COORDINADOR_ELECTORAL", "Coordinador Electoral"
        TESTIGO_ELECTORAL = "TESTIGO_ELECTORAL", "Testigo Electoral"
        LIDER = "LIDER", "Líder"
        COLABORADOR = "COLABORADOR", "Colaborador"
        CANDIDATO = "CANDIDATO", "Candidato"

    username = None
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255)
    telefono = models.CharField(max_length=50, null=True, blank=True)
    cedula = models.CharField(max_length=50, null=True, blank=True)
    role = models.CharField(max_length=30, choices=Roles.choices, default=Roles.COLABORADOR)
    is_active = models.BooleanField(default=True)
    meta_votantes = models.PositiveIntegerField(default=0)
    score_confiabilidad = models.FloatField(default=0.0, editable=False)
    municipio_operacion = models.ForeignKey(
        "territory.Municipio",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="coordinadores",
    )
    created_by = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="collaborators_created",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    def __str__(self):
        return self.name

    @property
    def is_admin(self):
        return self.role == self.Roles.ADMIN

    @property
    def is_leader(self):
        return self.role == self.Roles.LIDER

    @property
    def is_collaborator(self):
        return self.role == self.Roles.COLABORADOR

    @property
    def is_coordinator(self):
        return self.role == self.Roles.COORDINADOR_ELECTORAL

    @property
    def is_witness(self):
        return self.role == self.Roles.TESTIGO_ELECTORAL


class ElectoralWitnessAssignment(models.Model):
    testigo = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="asignaciones_testigo",
    )
    puesto = models.ForeignKey(
        "polling.PollingStation",
        on_delete=models.CASCADE,
        related_name="asignaciones_testigos",
    )
    mesas = models.JSONField()
    creado_por = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="testigos_creados",
    )
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["testigo"], name="unique_testigo_assignment"),
        ]

    @property
    def is_candidate(self):
        return self.role == self.Roles.CANDIDATO


class ElectoralWitnessReleaseAudit(models.Model):
    testigo = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="liberaciones_mesas",
    )
    puesto = models.ForeignKey(
        "polling.PollingStation",
        on_delete=models.CASCADE,
        related_name="liberaciones_testigos",
    )
    mesa = models.PositiveIntegerField()
    liberado_por = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="liberaciones_realizadas",
    )
    rol_liberador = models.CharField(max_length=30)
    motivo = models.TextField()
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-creado_en"]
