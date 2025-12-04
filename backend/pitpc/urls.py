from django.contrib import admin
from django.urls import include, path
from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from rest_framework import permissions, routers
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import AuthViewSet, UserViewSet
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

schema_view = get_schema_view(
    openapi.Info(title="PITPC API", default_version="v1"),
    public=True,
    permission_classes=[permissions.AllowAny],
)

router = routers.DefaultRouter()
router.register(r"usuarios", UserViewSet, basename="usuario")
router.register(r"zonas", ZoneViewSet, basename="zona")
router.register(r"asignaciones", ZonaAsignacionViewSet, basename="asignacion")
router.register(r"municipios", MunicipioViewSet, basename="municipio")
router.register(r"departamentos", DepartamentoViewSet, basename="departamento")
router.register(r"encuestas", SurveyViewSet, basename="encuesta")
router.register(r"necesidades", NeedViewSet, basename="necesidad")
router.register(r"rutas", RouteViewSet, basename="ruta")
router.register(r"dashboard", DashboardViewSet, basename="dashboard")
router.register(r"reportes", ReporteUnicoViewSet, basename="reporte")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/login", AuthViewSet.as_view({"post": "login"}), name="login"),
    path("api/auth/refresh", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/cobertura/zonas", CoverageView.as_view(), name="coverage"),
    path("api/", include(router.urls)),
    path("swagger/", schema_view.with_ui("swagger", cache_timeout=0), name="schema-swagger"),
]
