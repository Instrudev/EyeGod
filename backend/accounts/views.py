from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from rest_framework.exceptions import PermissionDenied

from .permissions import IsAdmin, IsAdminOrLeaderManager
from .serializers import LoginSerializer, UserSerializer


class AuthViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]

    def login(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        data = {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data,
        }
        return Response(data)


class UserViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    filterset_fields = ["role", "is_active"]
    search_fields = ["name", "email"]

    def get_permissions(self):
        if self.request.method == "DELETE":
            permission_classes = [IsAdmin]
        elif self.request.method in ("POST", "PUT", "PATCH"):
            permission_classes = [IsAdminOrLeaderManager]
        else:
            from accounts.permissions import IsLeaderOrAdmin

            permission_classes = [IsLeaderOrAdmin]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        requester = self.request.user
        if requester.is_leader:
            incoming_role = serializer.validated_data.get("role", User.Roles.COLABORADOR)
            if incoming_role != User.Roles.COLABORADOR:
                raise PermissionDenied("Solo puedes crear usuarios colaboradores.")
            serializer.save(role=User.Roles.COLABORADOR)
        else:
            serializer.save()

    def perform_update(self, serializer):
        requester = self.request.user
        instance = serializer.instance
        if requester.is_leader:
            if instance.role != User.Roles.COLABORADOR:
                raise PermissionDenied("Solo puedes modificar colaboradores.")
            incoming_role = serializer.validated_data.get("role", instance.role)
            if incoming_role != User.Roles.COLABORADOR:
                raise PermissionDenied("Solo puedes asignar el rol de colaborador.")
            serializer.save(role=User.Roles.COLABORADOR)
        else:
            serializer.save()
