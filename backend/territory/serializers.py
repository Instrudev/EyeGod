from rest_framework import serializers

from accounts.models import User
from .models import Departamento, MetaZona, Municipio, Zona, ZonaAsignacion


class DepartamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Departamento
        fields = ["id", "nombre"]


class MunicipioSerializer(serializers.ModelSerializer):
    departamento = DepartamentoSerializer(read_only=True)
    departamento_detalle = DepartamentoSerializer(source="departamento", read_only=True)
    departamento_id = serializers.PrimaryKeyRelatedField(
        queryset=Departamento.objects.all(), source="departamento", write_only=True
    )

    class Meta:
        model = Municipio
        fields = ["id", "nombre", "departamento", "departamento_detalle", "departamento_id", "lat", "lon"]

    def validate_departamento_id(self, value):
        if value is None:
            raise serializers.ValidationError("Debe seleccionar un departamento")
        return value


class MetaZonaSerializer(serializers.ModelSerializer):
    class Meta:
        model = MetaZona
        fields = ["meta_encuestas"]


class ZonaSerializer(serializers.ModelSerializer):
    municipio = MunicipioSerializer(read_only=True)
    municipio_id = serializers.PrimaryKeyRelatedField(
        queryset=Municipio.objects.all(), source="municipio", write_only=True
    )
    meta = MetaZonaSerializer(read_only=True)

    class Meta:
        model = Zona
        fields = [
            "id",
            "nombre",
            "tipo",
            "lat",
            "lon",
            "municipio",
            "municipio_id",
            "meta",
        ]

    def create(self, validated_data):
        zona = super().create(validated_data)
        MetaZona.objects.get_or_create(zona=zona, defaults={"meta_encuestas": 10})
        return zona

    def validate_municipio_id(self, value):
        if value is None:
            raise serializers.ValidationError("Debe seleccionar un municipio")
        return value


class ZonaAsignacionSerializer(serializers.ModelSerializer):
    colaborador_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=User.Roles.COLABORADOR), source="colaborador"
    )
    colaborador_nombre = serializers.CharField(source="colaborador.name", read_only=True)
    zona_id = serializers.PrimaryKeyRelatedField(queryset=Zona.objects.all(), source="zona")
    zona_nombre = serializers.CharField(source="zona.nombre", read_only=True)
    zona_tipo = serializers.CharField(source="zona.tipo", read_only=True)
    municipio_id = serializers.IntegerField(source="zona.municipio_id", read_only=True)
    municipio_nombre = serializers.CharField(source="zona.municipio.nombre", read_only=True)

    class Meta:
        model = ZonaAsignacion
        fields = [
            "id",
            "colaborador_id",
            "colaborador_nombre",
            "zona_id",
            "zona_nombre",
            "zona_tipo",
            "municipio_id",
            "municipio_nombre",
            "created_at",
        ]

    def validate_colaborador_id(self, value):
        if not value.is_active:
            raise serializers.ValidationError("El colaborador está inactivo")
        if not value.is_collaborator:
            raise serializers.ValidationError("Solo se pueden asignar colaboradores")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        zona = attrs.get("zona")
        if request and request.user.is_leader and zona:
            if not zona.municipio.lideres.filter(id=request.user.id).exists():
                raise serializers.ValidationError(
                    "Solo puedes asignar zonas de los municipios que lideras"
                )
        return attrs

    def create(self, validated_data):
        asignacion = ZonaAsignacion.objects.create(
            asignado_por=self.context.get("request").user, **validated_data
        )
        return asignacion


class ZonaMetaUpdateSerializer(serializers.Serializer):
    meta_encuestas = serializers.IntegerField(min_value=1)

    def update(self, instance, validated_data):
        meta_obj, _ = MetaZona.objects.get_or_create(zona=instance)
        meta_obj.meta_encuestas = validated_data["meta_encuestas"]
        meta_obj.save()
        return meta_obj
