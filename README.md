# TutorIA's — Asistente de estudio de inglés con IA

Backend Node/Express + PostgreSQL, frontend Vanilla JS.

## Estructura

```
tutorias/
├── backend/
│   ├── src/
│   │   ├── config/       # db.js (conexión PostgreSQL) + schema.sql
│   │   ├── controllers/  # authController.js
│   │   ├── models/       # userModel.js
│   │   ├── routes/       # authRoutes.js
│   │   ├── services/     # authService.js (lógica de negocio: hash, JWT)
│   │   ├── middleware/   # authMiddleware.js (verificación de token)
│   │   ├── utils/        # respuestas.js
│   │   └── tests/        # auth.test.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── assets/
    │   ├── components/   # formAuth.js (lógica login/registro)
    │   ├── services/     # authApi.js (consumo del backend)
    │   ├── store/         # sesion.js (estado global vía localStorage)
    │   ├── utils/         # validaciones.js
    │   └── styles/        # global.css (tema blanco y negro)
    └── index.html
```

## 1. Base de datos

backend/src/config/schema.sql
```

Esto crea las tablas: `usuarios`, `vocabulario_usuario`, `ejercicios`, `conversaciones`.

## 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edita .env con tu DATABASE_URL real y un JWT_SECRET seguro
npm run dev
```

El backend queda corriendo en `http://localhost:3000`.

Endpoints disponibles:
- `POST /api/auth/registro` → { nombre, correo, contrasena }
- `POST /api/auth/login` → { correo, contrasena }
- `GET /api/auth/perfil` → requiere header `Authorization: Bearer <token>`

## 3. Frontend
```html
<script>window.TUTORIAS_API_URL = 'https://tu-backend.up.railway.app/api';</script>
```
