from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0006_user_meta_votantes_positive"),
        ("accounts", "0004_testigo_assignment"),
        ("polling", "0002_pollingstation_details"),
    ]

    operations = [
        migrations.CreateModel(
            name="ElectoralWitnessReleaseAudit",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("mesa", models.PositiveIntegerField()),
                ("rol_liberador", models.CharField(max_length=30)),
                ("motivo", models.TextField()),
                ("creado_en", models.DateTimeField(auto_now_add=True)),
                (
                    "liberado_por",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="liberaciones_realizadas",
                        to="accounts.user",
                    ),
                ),
                (
                    "puesto",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="liberaciones_testigos",
                        to="polling.pollingstation",
                    ),
                ),
                (
                    "testigo",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="liberaciones_mesas",
                        to="accounts.user",
                    ),
                ),
            ],
            options={"ordering": ["-creado_en"]},
        ),
    ]
