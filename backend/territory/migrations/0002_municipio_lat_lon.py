from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("territory", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="municipio",
            name="lat",
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True),
        ),
        migrations.AddField(
            model_name="municipio",
            name="lon",
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True),
        ),
    ]
