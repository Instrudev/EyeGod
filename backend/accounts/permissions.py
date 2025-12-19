from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_admin)


class IsLeader(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_leader)


class IsCollaborator(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_collaborator)


class IsCandidate(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_candidate)


class IsNonCandidate(permissions.BasePermission):
    """Blocks access for users with rol CANDIDATO."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and not getattr(user, "is_candidate", False))


class IsLeaderOrAdmin(permissions.BasePermission):
    """Allows leaders or admins to manage certain resources."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_leader or user.is_admin))


class IsAdminOrLeaderManager(permissions.BasePermission):
    """Allows admins or leaders to manage collaborator-level resources."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.is_admin:
            return True
        return bool(user.is_leader and request.method in ("POST", "PUT", "PATCH"))


class IsSurveySubmitter(permissions.BasePermission):
    """Allows Admins, Leaders, or Collaborators to registrar encuestas."""

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_admin or user.is_leader or user.is_collaborator)
        )
