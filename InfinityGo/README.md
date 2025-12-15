# InfinityGo

InfinityGo es una aplicación móvil Android construida con Expo (managed workflow) y TypeScript. Consume los servicios REST existentes en `http://localhost:8000/api` para permitir autenticación y visualización del panel de control territorial.

## Requisitos previos
- Node.js 18+
- npm o yarn
- Expo CLI (`npm install -g expo`)
- Android Studio o un dispositivo/emulador Android configurado

## Configuración
1. Copia el archivo `.env.example` a `.env` y ajusta la URL del backend si es necesario:
   ```bash
   cp .env.example .env
   ```
2. Instala dependencias del proyecto (si encuentras conflictos de dependencias con React Native, usa `--legacy-peer-deps`):
   ```bash
   npm install --legacy-peer-deps
   ```

## Ejecución en Android
- Inicia el servidor de desarrollo y abre el emulador/dispositivo Android:
  ```bash
  npm run android
  ```

## Estructura principal
```
/InfinityGo
├── App.tsx
├── app.json
├── src/
│   ├── api/          # Cliente HTTP y rutas de API
│   ├── navigation/   # Navegación con react-navigation (stack + bottom tabs para administrador)
│   ├── screens/      # Pantallas (Login, Panel territorial, creación de líderes/candidatos/encuestas)
│   ├── services/     # Lógica de consumo de endpoints
│   ├── store/        # Contexto de autenticación
│   ├── hooks/        # Hooks reutilizables
│   └── utils/        # Utilidades (almacenamiento)
```

## Endpoints consumidos
- `POST /auth/login`: inicio de sesión y obtención de tokens JWT.
- `GET /dashboard/resumen`: métricas generales del tablero (encuestas, cobertura, necesidades, casos activos).
- `GET /cobertura/zonas`: datos georreferenciados para el mapa de cobertura.
- `GET /dashboard/encuestas_por_dia` y `GET /dashboard/avance_colaboradores`: resultados por rango de fechas.
- `POST /usuarios/` y `POST /usuarios/{id}/municipios/`: creación de líderes y asignación de municipios.
- `POST /candidatos/`: registro de candidatos con credenciales generadas.
- `POST /encuestas/`: registro de encuestas territoriales.
- `GET /municipios/`, `GET /zonas/`, `GET /necesidades/`: catálogos para los formularios móviles.

## Funcionalidades
- Inicio de sesión con credenciales de correo y contraseña del backend.
- Persistencia y manejo de token de acceso con AsyncStorage.
- Navegación condicional según autenticación y bottom navigation exclusivo para administradores.
- Pantalla de panel territorial con encabezado de usuario, filtros por rango de fechas, métricas (encuestas, zonas cumplidas/sin cobertura, casos activos) y mapa de cobertura con marcadores.
- Soporte de rango de fechas con búsqueda de encuestas por día y avance de colaboradores.
- Módulos móviles para administradores:
  - Creación de líderes con asignación de municipios.
  - Registro de candidatos con generación de credenciales.
  - Registro de encuestas territoriales con selección de necesidades (máximo 3) y consentimiento informado.

## Variables de entorno
- `EXPO_PUBLIC_API_URL`: URL base del backend (por defecto `http://localhost:8000/api`).

## Notas
- La aplicación está configurada exclusivamente para Android en `app.json` y define el paquete `com.infinitygo.app`. Los assets de icono y splash se deben añadir a la carpeta `assets/` si se requieren.
