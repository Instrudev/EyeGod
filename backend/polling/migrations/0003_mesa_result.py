from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("polling", "0002_pollingstation_details"),
        ("accounts", "0007_electoral_witness_release_audit"),
    ]

    operations = [
        migrations.CreateModel(
            name="MesaResult",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("municipio", models.CharField(max_length=120)),
                ("mesa", models.PositiveIntegerField()),
                ("votos", models.JSONField()),
                ("voto_blanco", models.PositiveIntegerField()),
                ("voto_nulo", models.PositiveIntegerField()),
                ("estado", models.CharField(choices=[("PENDIENTE", "Pendiente"), ("ENVIADA", "Enviada")], default="PENDIENTE", max_length=20)),
                ("enviado_en", models.DateTimeField(blank=True, null=True)),
                ("creado_en", models.DateTimeField(auto_now_add=True)),
                ("actualizado_en", models.DateTimeField(auto_now=True)),
                (
                    "puesto",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="resultados_mesas",
                        to="polling.pollingstation",
                    ),
                ),
                (
                    "testigo",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="resultados_mesas",
                        to="accounts.user",
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="mesaresult",
            constraint=models.UniqueConstraint(fields=("puesto", "mesa"), name="unique_mesa_result"),
        ),
    ]
