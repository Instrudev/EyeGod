from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("territory", "0002_municipio_lat_lon"),
    ]

    operations = [
        migrations.CreateModel(
            name="ZonaAsignacion",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "asignado_por",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="asignaciones_realizadas",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "colaborador",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="asignaciones_zona",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "zona",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="asignaciones",
                        to="territory.zona",
                    ),
                ),
            ],
            options={
                "verbose_name": "Asignación de zona",
                "verbose_name_plural": "Asignaciones de zona",
                "unique_together": {("colaborador", "zona")},
            },
        ),
    ]
