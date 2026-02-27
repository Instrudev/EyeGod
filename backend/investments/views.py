import json
from django.db.models import Sum, F, ExpressionWrapper, DecimalField
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Investment, BudgetPlan, AuditLog
from .serializers import InvestmentSerializer, BudgetPlanSerializer, AuditLogSerializer
from .permissions import IsAdminOrCandidateOrCoordinator
from collections import defaultdict


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all().order_by("-fecha_hora")
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated] # Only Admin/Candidate ideally
    
    def get_queryset(self):
        user = self.request.user
        if user.role not in ["ADMIN", "CANDIDATO"]:
            return AuditLog.objects.none()
        return super().get_queryset()


class BudgetPlanViewSet(viewsets.ModelViewSet):
    queryset = BudgetPlan.objects.all().order_by("-created_at")
    serializer_class = BudgetPlanSerializer
    # Solo admin puede modificar, Candidato ver
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role not in ["ADMIN", "CANDIDATO"]:
            return BudgetPlan.objects.none()
        return super().get_queryset()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class InvestmentViewSet(viewsets.ModelViewSet):
    queryset = Investment.objects.select_related('departamento', 'municipio', 'responsable').all().order_by("-fecha")
    serializer_class = InvestmentSerializer
    permission_classes = [IsAdminOrCandidateOrCoordinator]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if user.role == "COORDINADOR_ELECTORAL":
            qs = qs.filter(municipio=user.municipio_operacion)
        # Apply filters from querystring
        cat = self.request.query_params.get('categoria')
        tipo = self.request.query_params.get('tipo')
        dep = self.request.query_params.get('departamento')
        mun = self.request.query_params.get('municipio')
        if cat: qs = qs.filter(categoria=cat)
        if tipo: qs = qs.filter(tipo=tipo)
        if dep: qs = qs.filter(departamento_id=dep)
        if mun: qs = qs.filter(municipio_id=mun)
        return qs

    def perform_create(self, serializer):
        # El validador ya aseguró el municipio_operacion para Coordinador
        instance = serializer.save(responsable=self.request.user)
        # Crear Log
        AuditLog.objects.create(
            usuario=self.request.user,
            rol=self.request.user.role,
            entidad_id=instance.id,
            accion=AuditLog.Action.CREATE,
            despues=InvestmentSerializer(instance).data
        )

    def perform_update(self, serializer):
        motivo = serializer.validated_data.pop('motivo', None)
        instance = self.get_object()
        antes_data = InvestmentSerializer(instance).data
        
        estado_nuevo = serializer.validated_data.get('estado', instance.estado)
        
        # Save updates
        updated_instance = serializer.save()
        
        accion = AuditLog.Action.UPDATE
        if estado_nuevo == "ANULADO" and antes_data['estado'] != "ANULADO":
             accion = AuditLog.Action.ANULAR

        AuditLog.objects.create(
            usuario=self.request.user,
            rol=self.request.user.role,
            entidad_id=updated_instance.id,
            accion=accion,
            antes=antes_data,
            despues=InvestmentSerializer(updated_instance).data,
            motivo=motivo
        )

    def perform_destroy(self, instance):
         # Soft delete in general or actual delete? Requirements said soft-delete
         # "No borrar físicamente; usar estado=ANULADO con motivo"
         pass # Destroy is disabled generally. Use PATCH {estado: ANULADO}

    @action(detail=False, methods=['get'])
    def metrics(self, request):
        """Dashboard KPI View returning aggregation explicitly."""
        qs = self.get_queryset().filter(estado="ACTIVO")
        
        gastos_qs = qs.filter(tipo="GASTO")
        aportes_qs = qs.filter(tipo="APORTE")
        
        total_gastos = gastos_qs.aggregate(total=Sum('valor'))['total'] or 0
        total_aportes = aportes_qs.aggregate(total=Sum('valor'))['total'] or 0
        balance_neto = total_aportes - total_gastos

        # Top 5 categorias
        top_cats = list(gastos_qs.values('categoria').annotate(total=Sum('valor')).order_by('-total')[:5])
        # Top 5 municipios
        top_muns = list(gastos_qs.values('municipio__nombre').annotate(total=Sum('valor')).order_by('-total')[:5])
        
        # Execucion Mensual/Categorica simple global
        # Mapeamos presupuesto global vs gastos
        budgets = BudgetPlan.objects.all()
        budgets_grouped = budgets.values('categoria').annotate(presupuesto=Sum('monto_presupuestado'))
        
        ejecucion = []
        riesgo_alerta = False
        
        for bg in budgets_grouped:
            cat = bg['categoria']
            ps = bg['presupuesto']
            gasto_cat = gastos_qs.filter(categoria=cat).aggregate(t=Sum('valor'))['t'] or 0
            pct = round((gasto_cat / ps) * 100, 2) if ps > 0 else 0
            ejecucion.append({'categoria': cat, 'presupuestado': ps, 'ejecutado': gasto_cat, 'porcentaje': pct})
            if pct > 80:
                riesgo_alerta = True
                
        # Grafico dona category
        grafico_categorias = list(gastos_qs.values('categoria').annotate(value=Sum('valor')))

        # Grafico barras muni
        grafico_municipios = list(gastos_qs.values('municipio__nombre').annotate(gastos=Sum('valor')))
        
        return Response({
            "kpis": {
                "total_gastos": total_gastos,
                "total_aportes": total_aportes,
                "balance_neto": balance_neto,
                "riesgo_sobre_ejecucion": riesgo_alerta
            },
            "top_categorias": top_cats,
            "top_municipios": [{"municipio": t["municipio__nombre"], "total": t["total"]} for t in top_muns if t["municipio__nombre"]],
            "ejecucion_presupuesto": ejecucion,
            "charts": {
                "dona_categorias": grafico_categorias,
                "barras_municipios": [{"name": g["municipio__nombre"] or "Global", "gastos": g["gastos"]} for g in grafico_municipios]
            }
        })
