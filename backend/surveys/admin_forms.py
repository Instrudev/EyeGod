from django import forms
from django.core.validators import FileExtensionValidator


class ExcelImportForm(forms.Form):
    excel_file = forms.FileField(
        label="Archivo Excel",
        validators=[FileExtensionValidator(allowed_extensions=['xlsx', 'xls'])],
        help_text="Por favor, sube un archivo con extensión .xlsx o .xls",
    )
