from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0005_user_add_leader_kpis"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="meta_votantes",
            field=models.PositiveIntegerField(default=0),
        ),
    ]
