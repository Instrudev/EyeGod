from django.db import transaction
from django.db.models import Q
from rest_framework import mixins, status, viewsets
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import ElectoralWitnessReleaseAudit, User
from rest_framework.exceptions import PermissionDenied, ValidationError

from .permissions import IsAdmin, IsAdminOrLeaderManager, IsCoordinator
from .serializers import (
    LeaderMetaSerializer,
    LoginSerializer,
    UserSerializer,
    WitnessCreateSerializer,
    WitnessListSerializer,
    WitnessMesaReleaseSerializer,
)
from surveys.models import Encuesta, SurveyValidationAudit
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
        incoming_role = serializer.validated_data.get("role", User.Roles.COLABORADOR)
        if incoming_role == User.Roles.COORDINADOR_ELECTORAL and not requester.is_admin:
            raise PermissionDenied("Solo el administrador puede crear coordinadores electorales.")
        if requester.is_leader:
            if incoming_role != User.Roles.COLABORADOR:
                raise PermissionDenied("Solo puedes crear usuarios colaboradores.")
            serializer.save(role=User.Roles.COLABORADOR, created_by=requester)
        else:
            serializer.save()

    def perform_update(self, serializer):
        requester = self.request.user
        instance = serializer.instance
        incoming_role = serializer.validated_data.get("role", instance.role)
        if incoming_role == User.Roles.COORDINADOR_ELECTORAL and not requester.is_admin:
            raise PermissionDenied("Solo el administrador puede modificar coordinadores electorales.")
        if requester.is_leader:
            if instance.role != User.Roles.COLABORADOR:
                raise PermissionDenied("Solo puedes modificar colaboradores.")
            if instance.created_by != requester:
                raise PermissionDenied("Solo puedes modificar tus propios colaboradores.")
            if incoming_role != User.Roles.COLABORADOR:
                raise PermissionDenied("Solo puedes asignar el rol de colaborador.")
            serializer.save(role=User.Roles.COLABORADOR, created_by=requester)
        else:
            serializer.save()


class WitnessViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsCoordinator]

    def get_queryset(self):
        coordinator = self.request.user
        if coordinator.is_admin:
            return User.objects.filter(
                role=User.Roles.TESTIGO_ELECTORAL,
            ).prefetch_related("asignaciones_testigo", "municipio_operacion")
        return User.objects.filter(
            role=User.Roles.TESTIGO_ELECTORAL,
            created_by=coordinator,
        ).prefetch_related("asignaciones_testigo", "municipio_operacion")

    def get_serializer_class(self):
        if self.action == "create":
            return WitnessCreateSerializer
        return WitnessListSerializer

    def perform_create(self, serializer):
        coordinator = self.request.user
        serializer.save()
        created_user = serializer.instance
        created_user.created_by = coordinator
        created_user.save(update_fields=["created_by"])

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        output_serializer = WitnessListSerializer(serializer.instance, context=self.get_serializer_context())
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["post"],
        url_path="liberar-mesa",
        permission_classes=[IsAuthenticated],
    )
    def liberar_mesa(self, request, pk=None):
        user = request.user
        if not (user.is_admin or user.is_coordinator):
            raise PermissionDenied("No tienes permiso para liberar mesas.")
        testigo = self.get_object()
        assignment = testigo.asignaciones_testigo.select_related("puesto").first()
        if not assignment:
            raise ValidationError({"detail": "El testigo no tiene mesas asignadas."})
        serializer = WitnessMesaReleaseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        mesa = serializer.validated_data["mesa"]
        motivo = serializer.validated_data["motivo"].strip()
        puesto = assignment.puesto

        if user.is_coordinator:
            if not user.municipio_operacion:
                raise ValidationError({"detail": "El coordinador no tiene municipio asignado."})
            if str(puesto.municipio).strip().casefold() != str(user.municipio_operacion.nombre).strip().casefold():
                raise ValidationError({"detail": "No puedes liberar mesas fuera de tu municipio."})

        try:
            total_mesas = int(str(puesto.mesas).strip())
        except (TypeError, ValueError):
            raise ValidationError({"mesa": "El puesto no tiene un número de mesas válido."})
        if mesa < 1 or mesa > total_mesas:
            raise ValidationError({"mesa": "La mesa indicada no es válida para este puesto."})

        assigned_mesas = assignment.mesas or []
        if mesa not in assigned_mesas:
            raise ValidationError({"mesa": "La mesa indicada no está asignada a este testigo."})

        encuestas = Encuesta.objects.filter(
            puesto__iexact=str(puesto.puesto).strip(),
            municipio__iexact=str(puesto.municipio).strip(),
            mesa__iexact=str(mesa).strip(),
        )
        cerrada = encuestas.filter(
            estado_validacion__in=[
                Encuesta.EstadoValidacion.VALIDADO,
                Encuesta.EstadoValidacion.VALIDADO_AJUSTADO,
            ]
        ).exists()
        confirmada = SurveyValidationAudit.objects.filter(
            registro__in=encuestas,
            estado_resultado=SurveyValidationAudit.EstadoResultado.CONFIRMADO,
        ).exists()
        if cerrada or confirmada:
            raise ValidationError({"mesa": "La mesa indicada está confirmada o cerrada y no se puede liberar."})
        if encuestas.exists():
            raise ValidationError({"mesa": "La mesa indicada tiene resultados registrados y no se puede liberar."})

        with transaction.atomic():
            assignment_locked = (
                testigo.asignaciones_testigo.select_for_update().select_related("puesto").first()
            )
            if not assignment_locked or mesa not in (assignment_locked.mesas or []):
                raise ValidationError({"mesa": "La mesa indicada ya no está asignada a este testigo."})
            assignment_locked.mesas = [item for item in assignment_locked.mesas if item != mesa]
            assignment_locked.save(update_fields=["mesas"])
            ElectoralWitnessReleaseAudit.objects.create(
                testigo=testigo,
                puesto=puesto,
                mesa=mesa,
                liberado_por=user,
                rol_liberador=user.role,
                motivo=motivo,
            )

        return Response({"detail": "Mesa liberada correctamente."}, status=status.HTTP_200_OK)
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
