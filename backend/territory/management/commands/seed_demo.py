from django.core.management.base import BaseCommand

from accounts.models import User
from surveys.models import Necesidad
from territory.models import Departamento, MetaZona, Municipio, Zona


class Command(BaseCommand):
    help = "Carga datos demo para PITPC"

    def handle(self, *args, **options):
        admin, _ = User.objects.get_or_create(email="admin@pitpc.com", defaults={"name": "Admin", "role": User.Roles.ADMIN})
        admin.set_password("admin123")
        admin.is_staff = True
        admin.is_superuser = True
        admin.save()

        leader, _ = User.objects.get_or_create(email="lider@pitpc.com", defaults={"name": "Líder", "role": User.Roles.LIDER})
        leader.set_password("lider123")
        leader.save()

        colaborador, _ = User.objects.get_or_create(
            email="colaborador@pitpc.com", defaults={"name": "Colaborador", "role": User.Roles.COLABORADOR}
        )
        colaborador.set_password("colab123")
        colaborador.save()

        dep, _ = Departamento.objects.get_or_create(nombre="Antioquia")
        muni, _ = Municipio.objects.get_or_create(
            nombre="Medellín", departamento=dep, defaults={"lat": 6.2476, "lon": -75.5658}
        )
        muni.lideres.add(leader)
        barrios = [
            ("Comuna 1", 6.2797, -75.5403),
            ("Comuna 2", 6.2852, -75.5795),
            ("Comuna 3", 6.295, -75.5635),
        ]
        for b, lat, lon in barrios:
            zona, _ = Zona.objects.get_or_create(
                nombre=b, municipio=muni, tipo=Zona.Tipo.COMUNA, defaults={"lat": lat, "lon": lon}
            )
            MetaZona.objects.get_or_create(zona=zona, defaults={"meta_encuestas": 10})

        for necesidad in ["Salud", "Educación", "Vías", "Empleo", "Seguridad"]:
            Necesidad.objects.get_or_create(nombre=necesidad)

        self.stdout.write(self.style.SUCCESS("Datos demo creados"))
