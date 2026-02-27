from django.contrib import admin

from django.urls import path
from django.shortcuts import render, redirect
from django.contrib import messages
import pandas as pd
from .admin_forms import ExcelImportForm
from .models import CasoCiudadano, Encuesta, EncuestaNecesidad, Necesidad, CedulaValidationMaster

admin.site.register(Necesidad)
admin.site.register(Encuesta)
admin.site.register(EncuestaNecesidad)
admin.site.register(CasoCiudadano)

@admin.register(CedulaValidationMaster)
class CedulaValidationMasterAdmin(admin.ModelAdmin):
    list_display = ('cedula', 'primer_nombre', 'primer_apellido', 'departamento', 'municipio', 'puesto')
    search_fields = ('cedula', 'primer_nombre', 'primer_apellido')
    list_filter = ('departamento', 'municipio', 'puesto')
    change_list_template = "admin/surveys/cedulavalidationmaster/change_list.html"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('import-excel/', self.admin_site.admin_view(self.import_excel), name='import-cedulas-excel'),
        ]
        return custom_urls + urls

    def import_excel(self, request):
        if request.method == "POST":
            form = ExcelImportForm(request.POST, request.FILES)
            if form.is_valid():
                excel_file = request.FILES['excel_file']
                try:
                    df = pd.read_excel(excel_file)
                    df = df.where(pd.notnull(df), None) # Handle NaNs
                    
                    created_count = 0
                    updated_count = 0

                    for _, row in df.iterrows():
                        cedula_val = str(row.get('cedula', '')).strip()
                        if not cedula_val or cedula_val.lower() == 'none':
                            continue
                            
                        # Mapping pandas row to django fields safely
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

                    messages.success(request, f"Importación exitosa. {created_count} cédulas nuevas, {updated_count} actualizadas.")
                    return redirect('..')
                except Exception as e:
                    messages.error(request, f"Error procesando el archivo Excel: {e}")
        else:
            form = ExcelImportForm()

        context = {
            **self.admin_site.each_context(request),
            'opts': self.model._meta,
            'form': form,
            'title': "Subir archivo Excel",
        }
        return render(request, "admin/surveys/cedulavalidationmaster/excel_import.html", context)
