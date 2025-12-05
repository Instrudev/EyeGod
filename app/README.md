# PITPC Flutter app

Cliente Flutter ligero para consumir la API existente de PITPC y cubrir los mismos flujos que el frontend web (login, dashboard, encuestas, agenda, asignaciones, colaboradores, líderes, candidatos y reporte unificado).

## Requisitos
- Flutter 3.4+ instalado
- Backend de PITPC accesible; por defecto la app usa `http://localhost:8000/api`. Cambia la URL con `--dart-define=API_URL=https://tu-servidor/api`.

## Ejecución
```
flutter pub get
flutter run --dart-define=API_URL=http://localhost:8000/api
```

## Funcionalidades
- Autenticación con almacenamiento de sesión en `SharedPreferences`.
- Dashboard con resumen de KPIs, tabla de cobertura y necesidades priorizadas.
- Listado y captura de encuestas, mostrando el nombre del ciudadano y datos clave.
- Consultas a agenda, asignaciones, colaboradores, líderes, candidatos y reporte unificado con refresco.
