from typing import Optional

from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin, IsCollaborator, IsLeader, IsSurveySubmitter
from .models import CedulaValidationMaster, Encuesta, Necesidad, SurveyValidationAudit
from .serializers import CoverageSerializer, NeedSerializer, SurveySerializer, CedulaValidationMasterSerializer, ExcelUploadSerializer
from .services import calcular_cobertura_por_zona
import pandas as pd


class SurveyViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Encuesta.objects.select_related("zona", "colaborador")
    serializer_class = SurveySerializer

    def get_permissions(self):
        if self.action in ["previsualizar_validaciones", "confirmar_validaciones", "cancelar_validaciones"]:
            permission_classes = [IsAdmin]
        else:
            permission_classes = [IsSurveySubmitter]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_collaborator:
            qs = qs.filter(colaborador=user)
        elif user.is_leader:
            municipios = user.municipio_set.values_list("id", flat=True) if hasattr(user, "municipio_set") else []
            qs = qs.filter(zona__municipio_id__in=municipios)
        return qs

    def perform_create(self, serializer):
        serializer.save()

    def _build_snapshot(self, encuesta: Encuesta):
        return {
            "cedula": encuesta.cedula,
            "primer_nombre": encuesta.primer_nombre,
            "segundo_nombre": encuesta.segundo_nombre,
            "primer_apellido": encuesta.primer_apellido,
            "segundo_apellido": encuesta.segundo_apellido,
            "telefono": encuesta.telefono,
            "correo": encuesta.correo,
            "sexo": encuesta.sexo,
            "pais": encuesta.pais,
            "departamento": encuesta.departamento,
            "municipio": encuesta.municipio,
            "puesto": encuesta.puesto,
            "mesa": encuesta.mesa,
            "estado_validacion": encuesta.estado_validacion,
        }

    def _build_master_snapshot(self, master: Optional[CedulaValidationMaster]):
        if not master:
            return None
        return {
            "cedula": master.cedula,
            "primer_nombre": master.primer_nombre,
            "segundo_nombre": master.segundo_nombre,
            "primer_apellido": master.primer_apellido,
            "segundo_apellido": master.segundo_apellido,
            "telefono": master.telefono,
            "correo": master.correo,
            "sexo": master.sexo,
            "pais": master.pais,
            "departamento": master.departamento,
            "municipio": master.municipio,
            "puesto": master.puesto,
            "mesa": master.mesa,
        }

    def _build_changes(self, current, proposed):
        if not proposed:
            return {}
        return {
            key: current.get(key) != proposed.get(key)
            for key in proposed.keys()
            if key in current
        }

    def _apply_master(self, encuesta: Encuesta, master: CedulaValidationMaster):
        def normalize(value):
            if value is None:
                return None
            if isinstance(value, str) and value.strip() == "":
                return None
            return value

        updates = {
            "primer_nombre": normalize(master.primer_nombre),
            "segundo_nombre": normalize(master.segundo_nombre),
            "primer_apellido": normalize(master.primer_apellido),
            "segundo_apellido": normalize(master.segundo_apellido),
            "telefono": normalize(master.telefono) or encuesta.telefono,
            "correo": normalize(master.correo),
            "sexo": normalize(master.sexo),
            "pais": normalize(master.pais),
            "departamento": normalize(master.departamento),
            "municipio": normalize(master.municipio),
            "puesto": normalize(master.puesto),
            "mesa": normalize(master.mesa),
            "estado_validacion": Encuesta.EstadoValidacion.VALIDADO,
        }
        for key, value in updates.items():
            if value is not None:
                setattr(encuesta, key, value)

    @action(detail=False, methods=["post"], url_path="validaciones/previsualizar")
    def previsualizar_validaciones(self, request):
        ids = request.data.get("ids", [])
        if not isinstance(ids, list) or not ids:
            return Response({"detail": "Debe enviar una lista de registros."}, status=status.HTTP_400_BAD_REQUEST)
        encuestas = list(Encuesta.objects.filter(id__in=ids))
        cedulas = [encuesta.cedula for encuesta in encuestas if encuesta.cedula]
        masters = CedulaValidationMaster.objects.filter(cedula__in=cedulas)
        master_map = {master.cedula: master for master in masters}

        items = []
        matches = 0
        for encuesta in encuestas:
            master = master_map.get(encuesta.cedula)
            current = self._build_snapshot(encuesta)
            proposed = self._build_master_snapshot(master)
            if master:
                matches += 1
            items.append(
                {
                    "registro_id": encuesta.id,
                    "cedula": encuesta.cedula,
                    "match": bool(master),
                    "current": current,
                    "proposed": proposed,
                    "changes": self._build_changes(current, proposed),
                }
            )

        return Response(
            {
                "items": items,
                "summary": {
                    "total": len(encuestas),
                    "matches": matches,
                    "no_match": len(encuestas) - matches,
                },
            }
        )

    @action(detail=False, methods=["post"], url_path="validaciones/confirmar")
    def confirmar_validaciones(self, request):
        ids = request.data.get("ids", [])
        tipo = request.data.get("tipo_validacion", SurveyValidationAudit.TipoValidacion.MASIVA)
        if not isinstance(ids, list) or not ids:
            return Response({"detail": "Debe enviar una lista de registros."}, status=status.HTTP_400_BAD_REQUEST)
        encuestas = list(Encuesta.objects.filter(id__in=ids))
        cedulas = [encuesta.cedula for encuesta in encuestas if encuesta.cedula]
        masters = CedulaValidationMaster.objects.filter(cedula__in=cedulas)
        master_map = {master.cedula: master for master in masters}

        resumen = {
            "total": len(encuestas),
            "validados": 0,
            "no_encontrados": 0,
            "cancelados": 0,
            "errores": 0,
        }
        errores = []

        for encuesta in encuestas:
            try:
                master = master_map.get(encuesta.cedula)
                before_snapshot = self._build_snapshot(encuesta)
                proposed = self._build_master_snapshot(master)
                if master:
                    self._apply_master(encuesta, master)
                    encuesta.save()
                    resumen["validados"] += 1
                    resultado = SurveyValidationAudit.EstadoResultado.CONFIRMADO
                else:
                    encuesta.estado_validacion = Encuesta.EstadoValidacion.NO_VALIDADO
                    encuesta.save(update_fields=["estado_validacion"])
                    resumen["no_encontrados"] += 1
                    resultado = SurveyValidationAudit.EstadoResultado.SIN_COINCIDENCIA
                SurveyValidationAudit.objects.create(
                    registro=encuesta,
                    cedula=encuesta.cedula or "",
                    usuario=request.user,
                    rol_usuario=request.user.role,
                    tipo_validacion=tipo,
                    tipo_evento=SurveyValidationAudit.TipoEvento.VALIDACION,
                    datos_antes=before_snapshot,
                    datos_nuevos=proposed,
                    estado_resultado=resultado,
                    estado_validacion_anterior=before_snapshot.get("estado_validacion"),
                    estado_validacion_nuevo=encuesta.estado_validacion,
                )
            except Exception as exc:
                resumen["errores"] += 1
                errores.append({"registro_id": encuesta.id, "error": str(exc)})

        return Response({"summary": resumen, "errors": errores})

    @action(detail=False, methods=["post"], url_path="validaciones/cancelar")
    def cancelar_validaciones(self, request):
        ids = request.data.get("ids", [])
        tipo = request.data.get("tipo_validacion", SurveyValidationAudit.TipoValidacion.MASIVA)
        if not isinstance(ids, list) or not ids:
            return Response({"detail": "Debe enviar una lista de registros."}, status=status.HTTP_400_BAD_REQUEST)
        encuestas = list(Encuesta.objects.filter(id__in=ids))
        cedulas = [encuesta.cedula for encuesta in encuestas if encuesta.cedula]
        masters = CedulaValidationMaster.objects.filter(cedula__in=cedulas)
        master_map = {master.cedula: master for master in masters}

        resumen = {
            "total": len(encuestas),
            "validados": 0,
            "no_encontrados": 0,
            "cancelados": len(encuestas),
            "errores": 0,
        }
        errores = []

        for encuesta in encuestas:
            try:
                master = master_map.get(encuesta.cedula)
                SurveyValidationAudit.objects.create(
                    registro=encuesta,
                    cedula=encuesta.cedula or "",
                    usuario=request.user,
                    rol_usuario=request.user.role,
                    tipo_validacion=tipo,
                    tipo_evento=SurveyValidationAudit.TipoEvento.VALIDACION,
                    datos_antes=self._build_snapshot(encuesta),
                    datos_nuevos=self._build_master_snapshot(master),
                    estado_resultado=SurveyValidationAudit.EstadoResultado.CANCELADO,
                    estado_validacion_anterior=encuesta.estado_validacion,
                    estado_validacion_nuevo=encuesta.estado_validacion,
                )
            except Exception as exc:
                resumen["errores"] += 1
                errores.append({"registro_id": encuesta.id, "error": str(exc)})

        return Response({"summary": resumen, "errors": errores})

    def perform_update(self, serializer):
        encuesta = self.get_object()
        before_snapshot = self._build_snapshot(encuesta)
        estado_anterior = encuesta.estado_validacion
        updated = serializer.save()
        estado_nuevo = updated.estado_validacion
        if estado_anterior == Encuesta.EstadoValidacion.VALIDADO:
            updated.estado_validacion = Encuesta.EstadoValidacion.VALIDADO_AJUSTADO
            updated.save(update_fields=["estado_validacion"])
            estado_nuevo = updated.estado_validacion
        SurveyValidationAudit.objects.create(
            registro=updated,
            cedula=updated.cedula or "",
            usuario=self.request.user,
            rol_usuario=self.request.user.role,
            tipo_validacion=SurveyValidationAudit.TipoValidacion.INDIVIDUAL,
            tipo_evento=SurveyValidationAudit.TipoEvento.EDICION_MANUAL,
            datos_antes=before_snapshot,
            datos_nuevos=self._build_snapshot(updated),
            estado_resultado=SurveyValidationAudit.EstadoResultado.CONFIRMADO,
            estado_validacion_anterior=estado_anterior,
            estado_validacion_nuevo=estado_nuevo,
        )

    @action(detail=False, methods=["get"], url_path="descargar-plantilla")
    def descargar_plantilla(self, request):
        if not request.user.is_admin:
            return Response({"detail": "Solo el administrador puede descargar la plantilla."}, status=status.HTTP_403_FORBIDDEN)
        
        import io
        
        columns = [
            "zona_id", "cedula", "primer_nombre", "segundo_nombre", "primer_apellido", "segundo_apellido",
            "telefono", "telefono_alternativo", "correo", "sexo", "pais", "departamento", "municipio",
            "puesto", "mesa", "comentario_problema", "consentimiento", "caso_critico", "nivel_afinidad",
            "disposicion_voto", "capacidad_influencia"
        ]
        
        df = pd.DataFrame(columns=columns)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Plantilla_Encuestas')
            
            worksheet = writer.sheets['Plantilla_Encuestas']
            for i, column in enumerate(columns):
                column_width = max(len(column) + 2, 15)
                worksheet.column_dimensions[chr(65 + i)].width = column_width

        output.seek(0)
        
        from django.http import HttpResponse
        response = HttpResponse(
            output.read(), 
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response['Content-Disposition'] = 'attachment; filename="plantilla_encuestas.xlsx"'
        return response

    @action(detail=False, methods=["post"], url_path="iniciar-cruce")
    def iniciar_cruce(self, request):
        if not request.user.is_admin:
            return Response({"detail": "Solo el administrador puede iniciar el cruce de datos."}, status=status.HTTP_403_FORBIDDEN)
            
        import uuid
        import threading
        from django.core.cache import cache
        
        task_id = str(uuid.uuid4())
        cache.set(f'task_{task_id}', {'status': 'processing', 'progress': 0, 'file_content': None}, timeout=3600)
        
        # Obtener todas las cédulas registradas en las encuestas
        qs = self.get_queryset().exclude(cedula__isnull=True).exclude(cedula__exact='')
        encuestas_cedulas = list(qs.values_list('cedula', flat=True).distinct())
        
        def _generar_cruce_background(task_id, encuestas_cedulas):
            import io
            import pandas as pd
            from django.core.cache import cache
            try:
                # Cruzar con la tabla master
                # Converting list explicitly is safe because typical load is a few tens of thousands max
                masters = list(CedulaValidationMaster.objects.filter(cedula__in=encuestas_cedulas))
                total_masters = len(masters)
                
                if total_masters == 0:
                    cache.set(f'task_{task_id}', {'status': 'error', 'detail': 'No se encontraron coincidencias.'}, timeout=3600)
                    return
                
                data = []
                # Artificial incrementing chunks to simulate/give real progress based on building rows
                chunk_size = max(1, total_masters // 20)
                
                for i, m in enumerate(masters):
                    data.append({
                        "Cedula": m.cedula,
                        "Primer Nombre": m.primer_nombre or "",
                        "Segundo Nombre": m.segundo_nombre or "",
                        "Primer Apellido": m.primer_apellido or "",
                        "Segundo Apellido": m.segundo_apellido or "",
                        "Telefono": m.telefono or "",
                        "Correo": m.correo or "",
                        "Departamento": m.departamento or "",
                        "Municipio": m.municipio or "",
                        "Puesto": m.puesto or "",
                        "Mesa": m.mesa or ""
                    })
                    
                    if i % chunk_size == 0 or i == total_masters - 1:
                        # Update progress up to 90%
                        progress = int((i / total_masters) * 90)
                        cache.set(f'task_{task_id}', {'status': 'processing', 'progress': progress, 'file_content': None}, timeout=3600)
                        
                # Construir el Excel (this can take a moment, assigning the last 10%)
                df = pd.DataFrame(data)
                output = io.BytesIO()
                with pd.ExcelWriter(output, engine='openpyxl') as writer:
                    df.to_excel(writer, index=False, sheet_name='Cruces_Encontrados')
                    
                    worksheet = writer.sheets['Cruces_Encontrados']
                    for i, col in enumerate(df.columns):
                        column_width = max(df[col].astype(str).map(len).max(), len(col)) + 2
                        worksheet.column_dimensions[chr(65 + i)].width = column_width
        
                # Guardar el contenido en el caché
                output.seek(0)
                cache.set(f'task_{task_id}', {'status': 'completed', 'progress': 100, 'file_content': output.read()}, timeout=3600)
                
            except Exception as e:
                import traceback
                traceback.print_exc()
                cache.set(f'task_{task_id}', {'status': 'error', 'detail': str(e)}, timeout=3600)

        # Iniciar el hilo
        thread = threading.Thread(target=_generar_cruce_background, args=(task_id, encuestas_cedulas))
        thread.daemon = True
        thread.start()
        
        return Response({"task_id": task_id}, status=status.HTTP_202_ACCEPTED)

    @action(detail=False, methods=["get"], url_path="estado-cruce")
    def estado_cruce(self, request):
        if not request.user.is_admin:
            return Response(status=status.HTTP_403_FORBIDDEN)
            
        task_id = request.query_params.get("task_id")
        if not task_id:
            return Response({"detail": "task_id es requerido"}, status=status.HTTP_400_BAD_REQUEST)
            
        from django.core.cache import cache
        task_data = cache.get(f'task_{task_id}')
        
        if not task_data:
            return Response({"detail": "Tarea no encontrada o expirada"}, status=status.HTTP_404_NOT_FOUND)
            
        return Response({
            "status": task_data.get("status"), 
            "progress": task_data.get("progress"),
            "detail": task_data.get("detail")
        })

    @action(detail=False, methods=["get"], url_path="descargar-archivo-cruce")
    def descargar_archivo_cruce(self, request):
        if not request.user.is_admin:
            return Response({"detail": "Solo el administrador puede descargar el archivo."}, status=status.HTTP_403_FORBIDDEN)
            
        task_id = request.query_params.get("task_id")
        if not task_id:
            return Response({"detail": "task_id es requerido"}, status=status.HTTP_400_BAD_REQUEST)
            
        from django.core.cache import cache
        from django.http import HttpResponse
        
        task_data = cache.get(f'task_{task_id}')
        if not task_data or task_data.get("status") != "completed" or not task_data.get("file_content"):
            return Response({"detail": "El archivo no está listo para su descarga o ya expiró."}, status=status.HTTP_404_NOT_FOUND)
            
        # Optional: delete the task immediately so logic cleans up, though it will naturally expire
        cache.delete(f'task_{task_id}')
        
        response = HttpResponse(
            task_data.get("file_content"), 
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response['Content-Disposition'] = 'attachment; filename="cruce_cedulas_master_vs_registros.xlsx"'
        return response

    @action(detail=False, methods=["post"], url_path="importar-excel")
    def importar_excel(self, request):
        if not request.user.is_admin:
            return Response({"detail": "Solo el administrador puede importar registros masivamente."}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = ExcelUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        excel_file = serializer.validated_data["excel_file"]

        try:
            df = pd.read_excel(excel_file)
            df = df.where(pd.notnull(df), None)

            created_count = 0
            errors = []

            def safe_int(val, default):
                if pd.isna(val) or val is None or str(val).strip() == "":
                    return default
                try:
                    return int(float(val))
                except (ValueError, TypeError):
                    return default

            for idx, row in df.iterrows():
                try:
                    cedula_val = str(row.get("cedula", "")).strip()
                    if not cedula_val or cedula_val.lower() == "none" or pd.isna(row.get("cedula")):
                        errors.append(f"Fila {idx + 2}: Cédula vacía o inválida")
                        continue
                    
                    if Encuesta.objects.filter(cedula=cedula_val).exists():
                        errors.append(f"Fila {idx + 2}: Ya existe registro con cédula {cedula_val}")
                        continue
                        
                    zona_id = safe_int(row.get("zona_id"), None)
                    if not zona_id:
                        errors.append(f"Fila {idx + 2}: zona_id es requerido")
                        continue

                    encuesta = Encuesta(
                        zona_id=zona_id,
                        colaborador=request.user,
                        cedula=cedula_val,
                        primer_nombre=str(row.get("primer_nombre", "")) if not pd.isna(row.get("primer_nombre")) and row.get("primer_nombre") else None,
                        segundo_nombre=str(row.get("segundo_nombre", "")) if not pd.isna(row.get("segundo_nombre")) and row.get("segundo_nombre") else None,
                        primer_apellido=str(row.get("primer_apellido", "")) if not pd.isna(row.get("primer_apellido")) and row.get("primer_apellido") else None,
                        segundo_apellido=str(row.get("segundo_apellido", "")) if not pd.isna(row.get("segundo_apellido")) and row.get("segundo_apellido") else None,
                        telefono=str(row.get("telefono", "")) if not pd.isna(row.get("telefono")) and row.get("telefono") else "",
                        telefono_alternativo=str(row.get("telefono_alternativo", "")) if not pd.isna(row.get("telefono_alternativo")) and row.get("telefono_alternativo") else None,
                        correo=str(row.get("correo", "")) if not pd.isna(row.get("correo")) and row.get("correo") else None,
                        sexo=str(row.get("sexo", "")) if not pd.isna(row.get("sexo")) and row.get("sexo") else None,
                        pais=str(row.get("pais", "")) if not pd.isna(row.get("pais")) and row.get("pais") else None,
                        departamento=str(row.get("departamento", "")) if not pd.isna(row.get("departamento")) and row.get("departamento") else None,
                        municipio=str(row.get("municipio", "")) if not pd.isna(row.get("municipio")) and row.get("municipio") else None,
                        puesto=str(row.get("puesto", "")) if not pd.isna(row.get("puesto")) and row.get("puesto") else None,
                        mesa=str(row.get("mesa", "")) if not pd.isna(row.get("mesa")) and row.get("mesa") else None,
                        comentario_problema=str(row.get("comentario_problema", "")) if not pd.isna(row.get("comentario_problema")) and row.get("comentario_problema") else None,
                        consentimiento=bool(row.get("consentimiento", True)),
                        caso_critico=bool(row.get("caso_critico", False)),
                        nivel_afinidad=safe_int(row.get("nivel_afinidad"), Encuesta.NivelAfinidad.INDECISO),
                        disposicion_voto=safe_int(row.get("disposicion_voto"), Encuesta.DisposicionVoto.TAL_VEZ_VOTA),
                        capacidad_influencia=safe_int(row.get("capacidad_influencia"), Encuesta.CapacidadInfluencia.NINGUNA),
                    )
                    encuesta.save()
                    created_count += 1
                except Exception as e:
                    errors.append(f"Fila {idx + 2}: {str(e)}")

            response_data = {
                "detail": f"Importación finalizada. {created_count} registros creados exitosamente."
            }
            if errors:
                response_data["errors"] = errors
                
            return Response(response_data, status=status.HTTP_200_OK if created_count > 0 else status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({"detail": f"Error procesando el archivo Excel: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


class NeedViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = Necesidad.objects.all()
    serializer_class = NeedSerializer
    permission_classes = [IsSurveySubmitter]


class CoverageView(APIView):
    permission_classes = [IsSurveySubmitter]

    def get(self, request):
        data = calcular_cobertura_por_zona(request.user)
        serializer = CoverageSerializer(data, many=True)
        return Response(serializer.data)


class CedulaValidationMasterViewSet(viewsets.ModelViewSet):
    queryset = CedulaValidationMaster.objects.all()
    serializer_class = CedulaValidationMasterSerializer
    permission_classes = [IsAdmin]
    search_fields = ['cedula', 'primer_nombre', 'primer_apellido']

    @action(detail=False, methods=['post'], url_path='import-excel')
    def import_excel(self, request):
        serializer = ExcelUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        excel_file = serializer.validated_data['excel_file']
        
        try:
            df = pd.read_excel(excel_file)
            df = df.where(pd.notnull(df), None) # Handle NaNs
            
            created_count = 0
            updated_count = 0

            for _, row in df.iterrows():
                cedula_val = str(row.get('cedula', '')).strip()
                if not cedula_val or cedula_val.lower() == 'none':
                    continue
                    
                data = {
                    'pais': row.get('pais'),
                    'departamento': row.get('departamento'),
                    'municipio': row.get('municipio'),
                    'puesto': str(row.get('puesto', '')) if row.get('puesto') else None,
                    'mesa': str(row.get('mesa', '')) if row.get('mesa') else None,
                    'primer_nombre': str(row.get('primer_nombre', '')) if row.get('primer_nombre') else None,
                    'segundo_nombre': str(row.get('segundo_nombre', '')) if row.get('segundo_nombre') else None,
                    'primer_apellido': str(row.get('primer_apellido', '')) if row.get('primer_apellido') else None,
                    'segundo_apellido': str(row.get('segundo_apellido', '')) if row.get('segundo_apellido') else None,
                    'telefono': str(row.get('telefono', '')) if row.get('telefono') else None,
                    'correo': str(row.get('correo', '')) if row.get('correo') else None,
                    'sexo': str(row.get('sexo', '')) if row.get('sexo') else None,
                }

                obj, created = CedulaValidationMaster.objects.update_or_create(
                    cedula=cedula_val,
                    defaults=data
                )
                if created:
                    created_count += 1
                else:
                    updated_count += 1

            return Response({
                "detail": f"Importación exitosa. {created_count} cédulas nuevas, {updated_count} actualizadas."
            })
            
        except Exception as e:
            return Response({"detail": f"Error procesando el archivo Excel: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
