from rest_framework import permissions

class IsAdminOrCandidateOrCoordinator(permissions.BasePermission):
    """
    Control de acceso estricto para el Módulo Estratégico de Inversiones:
    - ADMIN: Acceso total a todo (read/write/delete).
    - CANDIDATO: Acceso total de solo lectura (read).
    - COORDINADOR_ELECTORAL: Puede leer y escribir (crear/editar), no puede eliminar. Solo puede actuar en su propio municipio de operación.
    - RESTO (e.g. Testigo): Sin acceso completo.
    """

    def has_permission(self, request, view):
        if not getattr(request.user, "is_authenticated", False):
            return False

        if request.user.role in ["ADMIN", "CANDIDATO", "COORDINADOR_ELECTORAL"]:
            if request.method in permissions.SAFE_METHODS:
                return True
            # Solo admin y coordinador pueden hacer cambios de escritura
            return request.user.role in ["ADMIN", "COORDINADOR_ELECTORAL"]
            
        return False

    def has_object_permission(self, request, view, obj):
        if request.user.role == "ADMIN":
            return True
        if request.user.role == "CANDIDATO":
            return request.method in permissions.SAFE_METHODS
        if request.user.role == "COORDINADOR_ELECTORAL":
            # Si el objeto pertenece al municipio asignado al coordinador
            # Puede leerlo o modificarlo. Importante: "obj.municipio_id" asume un modelo con FK "municipio"
            if hasattr(obj, 'municipio_id'):
                return str(obj.municipio_id) == str(request.user.municipio_operacion_id)
            return False # Fallback seguro
        return False
