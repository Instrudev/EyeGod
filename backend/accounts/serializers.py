from django.contrib.auth import authenticate
from django.db import IntegrityError, transaction
from rest_framework import serializers

from .models import ElectoralWitnessAssignment, User
from polling.models import PollingStation
from territory.models import Municipio


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(username=attrs.get("email"), password=attrs.get("password"))
        if not user:
            raise serializers.ValidationError("Credenciales inválidas")
        attrs["user"] = user
        return attrs


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    municipio_operacion_id = serializers.PrimaryKeyRelatedField(
        source="municipio_operacion",
        queryset=Municipio.objects.all(),
        required=False,
        allow_null=True,
    )
    municipio_operacion_nombre = serializers.CharField(
        source="municipio_operacion.nombre",
        read_only=True,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "name",
            "telefono",
            "cedula",
            "role",
            "is_active",
            "meta_votantes",
            "municipio_operacion_id",
            "municipio_operacion_nombre",
            "password",
        ]
        read_only_fields = ["id", "meta_votantes"]

    def validate(self, attrs):
        role = attrs.get("role") or (self.instance.role if self.instance else None)
        municipio = attrs.get("municipio_operacion") or (self.instance.municipio_operacion if self.instance else None)
        if role == User.Roles.COORDINADOR_ELECTORAL:
            if municipio is None:
                raise serializers.ValidationError(
                    {"municipio_operacion_id": "El municipio es obligatorio para el coordinador."}
                )
            telefono = attrs.get("telefono") or self.initial_data.get("telefono")
            if telefono is None or str(telefono).strip() == "":
                raise serializers.ValidationError({"telefono": "El teléfono es obligatorio."})
            if not self.instance:
                password = self.initial_data.get("password")
                if not password:
                    raise serializers.ValidationError({"password": "La contraseña es obligatoria."})
            if self.instance and self.instance.municipio_operacion_id != municipio.id:
                raise serializers.ValidationError(
                    {"municipio_operacion_id": "El municipio del coordinador no se puede modificar."}
                )
        return attrs


class WitnessCreateSerializer(serializers.Serializer):
    primer_nombre = serializers.CharField()
    segundo_nombre = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    primer_apellido = serializers.CharField()
    segundo_apellido = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    telefono = serializers.CharField()
    correo = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    puesto_id = serializers.PrimaryKeyRelatedField(queryset=PollingStation.objects.all(), source="puesto")
    mesas = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)

    @staticmethod
    def _get_assigned_mesas(puesto):
        assigned = set()
        assignments = ElectoralWitnessAssignment.objects.filter(puesto=puesto).values_list("mesas", flat=True)
        for mesas in assignments:
            if isinstance(mesas, list):
                assigned.update(int(mesa) for mesa in mesas)
        return assigned

    def validate(self, attrs):
        request = self.context["request"]
        coordinator = request.user
        if not coordinator.municipio_operacion:
            raise serializers.ValidationError("El coordinador no tiene municipio asignado.")
        puesto = attrs.get("puesto")
        if not puesto.municipio:
            raise serializers.ValidationError({"puesto_id": "El puesto no tiene municipio definido."})
        def normalize(value):
            return str(value or "").strip().casefold()
        if normalize(puesto.municipio) != normalize(coordinator.municipio_operacion.nombre):
            raise serializers.ValidationError({"puesto_id": "El puesto no pertenece a tu municipio."})
        total_mesas = None
        try:
            total_mesas = int(str(puesto.mesas).strip())
        except (TypeError, ValueError):
            raise serializers.ValidationError({"puesto_id": "El puesto no tiene un número de mesas válido."})
        mesas = attrs.get("mesas", [])
        if len(set(mesas)) != len(mesas):
            raise serializers.ValidationError({"mesas": "Las mesas no pueden repetirse."})
        if any(mesa < 1 or mesa > total_mesas for mesa in mesas):
            raise serializers.ValidationError({"mesas": "Las mesas seleccionadas no son válidas para este puesto."})
        assigned_mesas = self._get_assigned_mesas(puesto)
        conflicts = sorted(set(mesas) & assigned_mesas)
        if conflicts:
            conflicts_str = ", ".join(str(mesa) for mesa in conflicts)
            raise serializers.ValidationError(
                {"mesas": f"Las mesas ya están asignadas: {conflicts_str}."}
            )
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        coordinator = request.user
        puesto = validated_data["puesto"]
        mesas = validated_data["mesas"]
        if User.objects.filter(email=validated_data["correo"]).exists():
            raise serializers.ValidationError({"correo": "El correo ya está registrado."})
        name = " ".join(
            [
                validated_data["primer_nombre"].strip(),
                str(validated_data.get("segundo_nombre") or "").strip(),
                validated_data["primer_apellido"].strip(),
                str(validated_data.get("segundo_apellido") or "").strip(),
            ]
        ).strip()
        try:
            with transaction.atomic():
                assigned_mesas = self._get_assigned_mesas(puesto)
                conflicts = sorted(set(mesas) & assigned_mesas)
                if conflicts:
                    conflicts_str = ", ".join(str(mesa) for mesa in conflicts)
                    raise serializers.ValidationError(
                        {"mesas": f"Las mesas ya están asignadas: {conflicts_str}."}
                    )
                user = User(
                    email=validated_data["correo"],
                    name=name,
                    telefono=validated_data["telefono"],
                    role=User.Roles.TESTIGO_ELECTORAL,
                    municipio_operacion=coordinator.municipio_operacion,
                )
                user.set_password(validated_data["password"])
                user.save()
                ElectoralWitnessAssignment.objects.create(
                    testigo=user,
                    puesto=puesto,
                    mesas=mesas,
                    creado_por=coordinator,
                )
        except IntegrityError:
            raise serializers.ValidationError({"detail": "No fue posible crear el testigo. Verifica los datos."})
        return user


class WitnessListSerializer(serializers.ModelSerializer):
    puesto_nombre = serializers.SerializerMethodField()
    municipio_nombre = serializers.CharField(source="municipio_operacion.nombre", read_only=True)
    mesas = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "name",
            "email",
            "telefono",
            "role",
            "municipio_nombre",
            "puesto_nombre",
            "mesas",
        ]

    def get_mesas(self, obj):
        assignment = obj.asignaciones_testigo.first()
        return assignment.mesas if assignment else []

    def get_puesto_nombre(self, obj):
        assignment = obj.asignaciones_testigo.first()
        return assignment.puesto.puesto if assignment else None
    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class WitnessMesaReleaseSerializer(serializers.Serializer):
    mesa = serializers.IntegerField(min_value=1)
    motivo = serializers.CharField()

    def validate_motivo(self, value):
        if not str(value or "").strip():
            raise serializers.ValidationError("El motivo es obligatorio.")
        return value


class LeaderMetaSerializer(serializers.Serializer):
    meta_votantes = serializers.IntegerField(min_value=0)
