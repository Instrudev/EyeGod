from django.db import models
from django.conf import settings

class Investment(models.Model):
    class Type(models.TextChoices):
        GASTO = "GASTO", "Gasto"
        APORTE = "APORTE", "Aporte"

    class Category(models.TextChoices):
        PUBLICIDAD = "PUBLICIDAD", "Publicidad"
        LOGISTICA = "LOGISTICA", "Logística"
        TRANSPORTE = "TRANSPORTE", "Transporte"
        EVENTOS = "EVENTOS", "Eventos"
        OPERATIVO = "OPERATIVO", "Operativo"
        JURIDICO = "JURIDICO", "Jurídico"
        DIGITAL = "DIGITAL", "Digital"
        OTRO = "OTRO", "Otro"

    class PaymentMethod(models.TextChoices):
        EFECTIVO = "EFECTIVO", "Efectivo"
        TRANSFERENCIA = "TRANSFERENCIA", "Transferencia"
        TARJETA = "TARJETA", "Tarjeta"
        OTRO = "OTRO", "Otro"

    class State(models.TextChoices):
        ACTIVO = "ACTIVO", "Activo"
        ANULADO = "ANULADO", "Anulado"

    tipo = models.CharField(max_length=20, choices=Type.choices)
    categoria = models.CharField(max_length=50, choices=Category.choices)
    descripcion = models.TextField()
    valor = models.DecimalField(max_digits=15, decimal_places=2)
    fecha = models.DateField()
    
    departamento = models.ForeignKey(
        "territory.Departamento", on_delete=models.SET_NULL, null=True, blank=True, related_name="investments"
    )
    municipio = models.ForeignKey(
        "territory.Municipio", on_delete=models.SET_NULL, null=True, blank=True, related_name="investments"
    )
    
    responsable = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="investments_registered")
    medio_pago = models.CharField(max_length=50, choices=PaymentMethod.choices)
    proveedor = models.CharField(max_length=255, null=True, blank=True)
    comprobante = models.FileField(upload_to="investments/comprobantes/", null=True, blank=True)
    
    estado = models.CharField(max_length=20, choices=State.choices, default=State.ACTIVO)
    motivo_anulacion = models.TextField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.get_tipo_display()} - {self.valor} ({self.get_categoria_display()})"


class BudgetPlan(models.Model):
    periodo_inicio = models.DateField()
    periodo_fin = models.DateField()
    categoria = models.CharField(max_length=50, choices=Investment.Category.choices)
    monto_presupuestado = models.DecimalField(max_digits=15, decimal_places=2)
    
    # Optional geography linking (could be global if null)
    departamento = models.ForeignKey(
        "territory.Departamento", on_delete=models.CASCADE, null=True, blank=True, related_name="budgets"
    )
    municipio = models.ForeignKey(
        "territory.Municipio", on_delete=models.CASCADE, null=True, blank=True, related_name="budgets"
    )
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="budgets_created")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        scope = self.municipio.nombre if self.municipio else (self.departamento.nombre if self.departamento else "Global")
        return f"Budget {scope} - {self.get_categoria_display()} ({self.monto_presupuestado})"


class AuditLog(models.Model):
    class Action(models.TextChoices):
        CREATE = "CREATE", "Create"
        UPDATE = "UPDATE", "Update"
        ANULAR = "ANULAR", "Anular"

    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="audit_logs")
    rol = models.CharField(max_length=50)
    fecha_hora = models.DateTimeField(auto_now_add=True)
    
    # Soft link to the Investment
    entidad_id = models.IntegerField()
    accion = models.CharField(max_length=20, choices=Action.choices)
    
    antes = models.JSONField(null=True, blank=True)
    despues = models.JSONField(null=True, blank=True)
    motivo = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"[{self.fecha_hora}] {self.usuario} ({self.get_accion_display()} Inv {self.entidad_id})"
