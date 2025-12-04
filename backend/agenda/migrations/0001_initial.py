# Generated manually
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("accounts", "0003_user_add_candidato_role"),
        ("candidates", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Agenda",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("titulo", models.CharField(max_length=255)),
                ("descripcion", models.TextField(blank=True)),
                ("fecha", models.DateField()),
                ("hora_inicio", models.TimeField()),
                ("hora_fin", models.TimeField()),
                ("lugar", models.CharField(max_length=255)),
                (
                    "estado",
                    models.CharField(
                        choices=[
                            ("pendiente", "Pendiente"),
                            ("aceptada", "Aceptada"),
                            ("rechazada", "Rechazada"),
                            ("reprogramacion_solicitada", "Reprogramación solicitada"),
                        ],
                        default="pendiente",
                        max_length=32,
                    ),
                ),
                ("motivo_reprogramacion", models.TextField(blank=True)),
                ("fecha_creacion", models.DateTimeField(auto_now_add=True)),
                ("fecha_actualizacion", models.DateTimeField(auto_now=True)),
                (
                    "candidato",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="agendas",
                        to="candidates.candidato",
                    ),
                ),
                (
                    "lider",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="agendas_creadas",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Agenda",
                "verbose_name_plural": "Agendas",
                "ordering": ["-fecha", "-hora_inicio"],
            },
        ),
    ]
