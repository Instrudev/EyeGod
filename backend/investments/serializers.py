from rest_framework import serializers
from .models import Investment, BudgetPlan, AuditLog

class AuditLogSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.ReadOnlyField(source='usuario.name')
    
    class Meta:
        model = AuditLog
        fields = "__all__"

class InvestmentSerializer(serializers.ModelSerializer):
    departamento_nombre = serializers.ReadOnlyField(source='departamento.nombre')
    municipio_nombre = serializers.ReadOnlyField(source='municipio.nombre')
    responsable_nombre = serializers.ReadOnlyField(source='responsable.name')
    motivo = serializers.CharField(write_only=True, required=False, allow_blank=True, help_text="Motivo para edición o anulación (requerido al editar/anular).")

    class Meta:
        model = Investment
        fields = "__all__"
        read_only_fields = ['responsable', 'estado', 'created_at', 'updated_at']

    def validate(self, data):
        request = self.context.get('request')
        user = request.user
        
        # Validación: si es COORDINADOR, el municipio del Gasto *debe* coincidir con su asignado.
        # Al crear, si no viene municipio, inyectamos o forzamos error.
        municipio = data.get('municipio')
        if not self.instance and user.role == "COORDINADOR_ELECTORAL":
            if not municipio:
                data['municipio'] = user.municipio_operacion
            elif municipio != user.municipio_operacion:
                raise serializers.ValidationError({"municipio": "Como coordinador solo puede registrar inversiones en su municipio asignado."})
        
        # Si se está actualizando (o anulando en un patch/put), debe venir motivo
        if self.instance and not data.get('motivo') and request.method in ['PUT', 'PATCH']:
            # Permitimos PATCH si es solo subir un componente, pero si cambian estado o valor forzoso:
            if 'valor' in data or 'estado' in data:
               raise serializers.ValidationError({"motivo": "Debe especificar un motivo para editar o anular este registro."})
               
        return data


class BudgetPlanSerializer(serializers.ModelSerializer):
    departamento_nombre = serializers.ReadOnlyField(source='departamento.nombre')
    municipio_nombre = serializers.ReadOnlyField(source='municipio.nombre')
    created_by_nombre = serializers.ReadOnlyField(source='created_by.name')

    class Meta:
        model = BudgetPlan
        fields = "__all__"
        read_only_fields = ['created_by', 'created_at', 'updated_at']
