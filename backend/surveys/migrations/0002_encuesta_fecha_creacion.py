from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("surveys", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="encuesta",
            name="fecha_creacion",
            field=models.DateField(auto_now_add=True, null=True),
        ),
        migrations.AlterField(
            model_name="encuesta",
            name="fecha_creacion",
            field=models.DateField(auto_now_add=True),
        ),
    ]
