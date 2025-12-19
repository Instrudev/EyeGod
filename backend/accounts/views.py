from django.db.models import Q
from rest_framework import mixins, status, viewsets
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from rest_framework.exceptions import PermissionDenied

from .permissions import IsAdmin, IsAdminOrLeaderManager
from .serializers import LeaderMetaSerializer, LoginSerializer, UserSerializer
from territory.models import Municipio
from territory.serializers import MunicipioSerializer


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

    def get_queryset(self):
        queryset = super().get_queryset()
        requester = self.request.user
        if requester.is_admin:
            return queryset
        if requester.is_leader:
            return queryset.filter(
                Q(role=User.Roles.COLABORADOR, created_by=requester) | Q(id=requester.id)
            )
        return queryset.none()

    def perform_create(self, serializer):
        requester = self.request.user
        if requester.is_leader:
            incoming_role = serializer.validated_data.get("role", User.Roles.COLABORADOR)
            if incoming_role != User.Roles.COLABORADOR:
                raise PermissionDenied("Solo puedes crear usuarios colaboradores.")
            serializer.save(role=User.Roles.COLABORADOR, created_by=requester)
        else:
            serializer.save()

    def perform_update(self, serializer):
        requester = self.request.user
        instance = serializer.instance
        if requester.is_leader:
            if instance.role != User.Roles.COLABORADOR:
                raise PermissionDenied("Solo puedes modificar colaboradores.")
            if instance.created_by != requester:
                raise PermissionDenied("Solo puedes modificar tus propios colaboradores.")
            incoming_role = serializer.validated_data.get("role", instance.role)
            if incoming_role != User.Roles.COLABORADOR:
                raise PermissionDenied("Solo puedes asignar el rol de colaborador.")
            serializer.save(role=User.Roles.COLABORADOR, created_by=requester)
        else:
            serializer.save()

    @action(
        detail=True,
        methods=["get", "post"],
        url_path="municipios",
        permission_classes=[IsAuthenticated],
    )
    def manage_municipios(self, request, pk=None):
        leader = self.get_object()
        if not leader.is_leader:
            return Response(
                {"detail": "Solo se pueden asignar municipios a líderes."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if request.method == "GET":
            if not (request.user.is_admin or request.user == leader):
                raise PermissionDenied("No tienes permiso para ver estos municipios.")
            data = MunicipioSerializer(leader.municipios.all(), many=True).data
            return Response(data)

        if not request.user.is_admin:
            raise PermissionDenied("Solo el administrador puede asignar municipios.")

        municipio_ids = request.data.get("municipio_ids", [])
        if not isinstance(municipio_ids, list):
            return Response(
                {"detail": "El formato de municipio_ids debe ser una lista."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        municipios = Municipio.objects.filter(id__in=municipio_ids)
        leader.municipios.set(municipios)
        data = MunicipioSerializer(leader.municipios.all(), many=True).data
        return Response(data)

class LeaderMetaView(APIView):
    permission_classes = [IsAdmin]

    def put(self, request, leader_id):
        serializer = LeaderMetaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        leader = User.objects.filter(id=leader_id).first()
        if not leader:
            return Response(
                {"detail": "Líder no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not leader.is_leader:
            return Response(
                {"detail": "El usuario indicado no es líder."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        leader.meta_votantes = serializer.validated_data["meta_votantes"]
        leader.save(update_fields=["meta_votantes"])
        return Response(
            {
                "leader_id": leader.id,
                "meta_votantes": leader.meta_votantes,
                "message": "Meta asignada correctamente",
            }
        )
