from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0004_user_add_contact_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="meta_votantes",
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name="user",
            name="score_confiabilidad",
            field=models.FloatField(default=0.0, editable=False),
        ),
    ]
