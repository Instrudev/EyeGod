from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from rest_framework import permissions, routers
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import AuthViewSet, LeaderMetaView, UserViewSet, WitnessViewSet
from candidates.views import CandidatoViewSet
from agenda.views import AgendaViewSet
from dashboard.views import DashboardViewSet
from reports.views import ReporteUnicoViewSet
from routes.views import RouteViewSet
from surveys.views import CoverageView, NeedViewSet, SurveyViewSet
from territory.views import (
    DepartamentoViewSet,
    MunicipioViewSet,
    ZoneViewSet,
    ZonaAsignacionViewSet,
)
from polling.views import MesaResultViewSet, PollingStationViewSet

schema_view = get_schema_view(
    openapi.Info(title="PITPC API", default_version="v1"),
    public=True,
    permission_classes=[permissions.AllowAny],
)

router = routers.DefaultRouter()
router.register(r"usuarios", UserViewSet, basename="usuario")
router.register(r"candidatos", CandidatoViewSet, basename="candidato")
router.register(r"agendas", AgendaViewSet, basename="agenda")
router.register(r"zonas", ZoneViewSet, basename="zona")
router.register(r"asignaciones", ZonaAsignacionViewSet, basename="asignacion")
router.register(r"municipios", MunicipioViewSet, basename="municipio")
router.register(r"departamentos", DepartamentoViewSet, basename="departamento")
router.register(r"encuestas", SurveyViewSet, basename="encuesta")
router.register(r"necesidades", NeedViewSet, basename="necesidad")
router.register(r"rutas", RouteViewSet, basename="ruta")
router.register(r"dashboard", DashboardViewSet, basename="dashboard")
router.register(r"reportes", ReporteUnicoViewSet, basename="reporte")
router.register(r"testigos", WitnessViewSet, basename="testigo")
router.register(r"puestos-votacion", PollingStationViewSet, basename="puesto-votacion")
router.register(r"resultados-mesas", MesaResultViewSet, basename="resultado-mesa")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/login", AuthViewSet.as_view({"post": "login"}), name="login"),
    path("api/auth/refresh", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/cobertura/zonas", CoverageView.as_view(), name="coverage"),
    path(
        "api/admin/leaders/<int:leader_id>/meta/",
        LeaderMetaView.as_view(),
        name="leader-meta",
    ),
    path("api/", include(router.urls)),
    path("swagger/", schema_view.with_ui("swagger", cache_timeout=0), name="schema-swagger"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
