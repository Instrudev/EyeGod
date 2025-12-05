from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_user_created_by"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="role",
            field=models.CharField(
                choices=[
                    ("ADMIN", "Administrador"),
                    ("LIDER", "Líder"),
                    ("COLABORADOR", "Colaborador"),
                    ("CANDIDATO", "Candidato"),
                ],
                default="COLABORADOR",
                max_length=20,
            ),
        ),
    ]
