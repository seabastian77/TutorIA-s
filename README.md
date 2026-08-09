# TutorIA's 

Backend Node/Express + PostgreSQL, frontend Vanilla JS.

## Estructura
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

## 1. Base de datos

backend/src/config/schema.sql
```
