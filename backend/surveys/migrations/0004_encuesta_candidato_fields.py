from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("surveys", "0003_encuesta_add_cedula"),
    ]

    operations = [
        migrations.AddField(
            model_name="encuesta",
            name="nivel_afinidad",
            field=models.PositiveSmallIntegerField(
                blank=True,
                choices=[
                    (1, "Totalmente de acuerdo"),
                    (2, "De acuerdo"),
                    (3, "Indeciso"),
                    (4, "En desacuerdo"),
                    (5, "Totalmente en desacuerdo"),
                ],
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="encuesta",
            name="disposicion_voto",
            field=models.PositiveSmallIntegerField(
                blank=True,
                choices=[(1, "Seguro vota"), (2, "Tal vez vota"), (3, "No vota")],
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="encuesta",
            name="capacidad_influencia",
            field=models.PositiveSmallIntegerField(
                blank=True,
                choices=[
                    (0, "Ninguna"),
                    (1, "1-2 personas"),
                    (2, "3-5 personas"),
                    (3, "Más de 5 personas"),
                ],
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="encuesta",
            name="votante_valido",
            field=models.BooleanField(default=False, editable=False),
        ),
        migrations.AddField(
            model_name="encuesta",
            name="votante_potencial",
            field=models.BooleanField(default=False, editable=False),
        ),
        migrations.AddConstraint(
            model_name="encuesta",
            constraint=models.UniqueConstraint(
                fields=("cedula",), name="unique_encuesta_cedula"
            ),
        ),
    ]
