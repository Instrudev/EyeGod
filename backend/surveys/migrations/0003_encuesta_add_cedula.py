from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ("surveys", "0002_encuesta_fecha_creacion"),
    ]

    operations = [
        migrations.AddField(
            model_name="encuesta",
            name="cedula",
            field=models.CharField(
                blank=True,
                max_length=15,
                null=True,
                validators=[
                    django.core.validators.RegexValidator(
                        message="Solo se permiten números en la cédula.", regex="^\\d+$"
                    )
                ],
            ),
        ),
    ]

