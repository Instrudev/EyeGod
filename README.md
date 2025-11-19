# Plataforma de Inteligencia Territorial y Participación Ciudadana (PITPC)

Sistema full-stack para planear operativos de campo, gestionar rutas de encuestadores y visualizar indicadores territoriales.

## Stack
- **Backend:** Django + Django REST Framework + MySQL, autenticación JWT (SimpleJWT) y documentación Swagger.
- **Frontend:** React + TypeScript + Vite + TailwindCSS, Leaflet, Recharts.
- **Infraestructura:** Dockerfiles separados y `docker-compose` con servicios para base de datos, API y SPA.

## Estructura
```
backend/   # API REST Django
frontend/  # SPA React
```

## Backend
1. Crear entorno virtual e instalar dependencias
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```
2. Configurar variables de entorno
```bash
cp .env.example .env
# Ajustar credenciales MySQL
```
3. Aplicar migraciones y cargar datos demo
```bash
python manage.py migrate
python manage.py seed_demo
```
4. Ejecutar servidor
```bash
python manage.py runserver 0.0.0.0:8000
```

### Usuarios demo
- Admin: `admin@pitpc.com / admin123`
- Líder: `lider@pitpc.com / lider123`
- Colaborador: `colaborador@pitpc.com / colab123`

## Frontend
```bash
cd frontend
npm install
npm run dev -- --host
```
Configurar `VITE_API_URL` (ver `.env.example`).

## Ejecución con Docker Compose
```bash
docker-compose up --build
```
Accesos:
- API: `http://localhost:8000/api`
- SPA: `http://localhost:5173`

## Endpoints principales
- `POST /api/auth/login`
- `GET /api/zonas`, `PATCH /api/zonas/:id/meta`
- `GET/POST /api/encuestas`
- `GET /api/cobertura/zonas`
- `GET/POST /api/rutas`, `GET /api/rutas/mis-rutas`
- `GET /api/dashboard/resumen` y `/mapa`

## Testing
Ejecutar pruebas Django:
```bash
cd backend
pytest  # o python manage.py test
```
