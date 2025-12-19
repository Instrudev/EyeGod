from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Roles(models.TextChoices):
        ADMIN = "ADMIN", "Administrador"
        LIDER = "LIDER", "Líder"
        COLABORADOR = "COLABORADOR", "Colaborador"
        CANDIDATO = "CANDIDATO", "Candidato"

    username = None
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255)
    telefono = models.CharField(max_length=50, null=True, blank=True)
    cedula = models.CharField(max_length=50, null=True, blank=True)
    role = models.CharField(max_length=20, choices=Roles.choices, default=Roles.COLABORADOR)
    is_active = models.BooleanField(default=True)
    meta_votantes = models.PositiveIntegerField(default=0)
    score_confiabilidad = models.FloatField(default=0.0, editable=False)
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
    def is_candidate(self):
        return self.role == self.Roles.CANDIDATO
