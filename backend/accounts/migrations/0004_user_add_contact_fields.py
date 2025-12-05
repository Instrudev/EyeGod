from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0003_user_add_candidato_role"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="cedula",
            field=models.CharField(max_length=50, null=True, blank=True),
        ),
        migrations.AddField(
            model_name="user",
            name="telefono",
            field=models.CharField(max_length=50, null=True, blank=True),
        ),
    ]
