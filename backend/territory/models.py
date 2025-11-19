from django.db import models


class Departamento(models.Model):
    nombre = models.CharField(max_length=150)

    def __str__(self):
        return self.nombre


class Municipio(models.Model):
    nombre = models.CharField(max_length=150)
    departamento = models.ForeignKey(Departamento, on_delete=models.CASCADE, related_name="municipios")
    lideres = models.ManyToManyField("accounts.User", blank=True, related_name="municipios")

    def __str__(self):
        return f"{self.nombre} - {self.departamento.nombre}"


class Zona(models.Model):
    class Tipo(models.TextChoices):
        COMUNA = "COMUNA", "Comuna"
        CORREGIMIENTO = "CORREGIMIENTO", "Corregimiento"
        BARRIO = "BARRIO", "Barrio"
        VEREDA = "VEREDA", "Vereda"

    nombre = models.CharField(max_length=150)
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    municipio = models.ForeignKey(Municipio, on_delete=models.CASCADE, related_name="zonas")
    lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    lon = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    def __str__(self):
        return f"{self.nombre} ({self.tipo})"


class MetaZona(models.Model):
    zona = models.OneToOneField(Zona, on_delete=models.CASCADE, related_name="meta")
    meta_encuestas = models.PositiveIntegerField(default=10)

    def __str__(self):
        return f"Meta {self.meta_encuestas} para {self.zona}"
