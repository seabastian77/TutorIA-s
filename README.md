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

Puedes usar la misma instancia de PostgreSQL de ConectaProfe (crear las tablas nuevas ahí)
o crear una base nueva en Railway. Luego ejecuta el script:

```
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

Es un SPA simple en HTML/JS/CSS (sin build), igual que ConectaProfe. Para probarlo local
solo abre `frontend/index.html` en el navegador, o sirve la carpeta con una extensión tipo
"Live Server" de VS Code.

Si el backend queda en otra URL (por ejemplo ya desplegado en Railway), antes de cargar
`authApi.js` define en el HTML:

```html
<script>window.TUTORIAS_API_URL = 'https://tu-backend.up.railway.app/api';</script>
```

## 4. Despliegue en Railway (mismo flujo que ConectaProfe)

1. Sube el contenido de `backend/` a un repo de GitHub.
2. Conecta el repo en Railway y agrega la variable `DATABASE_URL` (puede ser la misma
   base de ConectaProfe si prefieres compartirla) y `JWT_SECRET`.
3. Railway detecta `npm start` automáticamente.
4. El frontend lo puedes servir estático (Railway, GitHub Pages, o el mismo backend con
   `express.static` más adelante).

## Qué sigue (próximos módulos)

- Prueba de nivel inicial (MCER)
- Generación de ejercicios adaptativos por IA
- Vocabulario personalizado con repetición espaciada (tabla `vocabulario_usuario` ya existe)
- Conversación con corrección en tiempo real (tabla `conversaciones` ya existe)
