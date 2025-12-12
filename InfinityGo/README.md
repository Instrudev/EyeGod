# InfinityGo

InfinityGo es una aplicación móvil Android construida con Expo (managed workflow) y TypeScript. Consume los servicios REST existentes en `http://localhost:8000/api` para permitir autenticación y visualización de métricas de tablero.

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
2. Instala dependencias del proyecto:
   ```bash
   npm install
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
│   ├── navigation/   # Navegación con react-navigation
│   ├── screens/      # Pantallas (Login, Panel)
│   ├── services/     # Lógica de consumo de endpoints
│   ├── store/        # Contexto de autenticación
│   ├── hooks/        # Hooks reutilizables
│   └── utils/        # Utilidades (almacenamiento)
```

## Endpoints consumidos
- `POST /auth/login`: inicio de sesión y obtención de tokens JWT.
- `GET /dashboard/resumen`: métricas generales del tablero (encuestas, cobertura, necesidades, casos activos).

## Funcionalidades
- Inicio de sesión con credenciales de correo y contraseña del backend.
- Persistencia y manejo de token de acceso con AsyncStorage.
- Navegación condicional según autenticación.
- Pantalla de tablero con estados de carga y error, refresco manual y botón de cierre de sesión.

## Variables de entorno
- `EXPO_PUBLIC_API_URL`: URL base del backend (por defecto `http://localhost:8000/api`).

## Notas
- La aplicación está configurada exclusivamente para Android en `app.json` y define el paquete `com.infinitygo.app` con icono y splash personalizados ubicados en `assets/`.
