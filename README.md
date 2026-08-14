# TutorIA's — Asistente de Estudio de Inglés con IA

TutorIA's es una plataforma web que usa inteligencia artificial para ayudar a estudiantes hispanohablantes a aprender inglés de forma personalizada: diagnostica tu nivel, se adapta a tu ritmo, te corrige en tiempo real y te ayuda a practicar pronunciación por voz.

Backend Node/Express + PostgreSQL · Frontend HTML/CSS/JavaScript vanilla · IA vía Groq.

---

## ✨ Funcionalidades

- **🧠 Diagnóstico Inmersivo de nivel** — en vez de una prueba estática, la IA arma una historia interactiva adaptativa (opción múltiple + respuestas abiertas) que ajusta la dificultad en tiempo real y entrega un perfil de habilidades (vocabulario, gramática, comprensión, fluidez) al finalizar.
- **💪 Práctica diaria adaptativa** — ejercicios ilimitados generados por IA, con dificultad ajustada según el rendimiento reciente del usuario.
- **🎙️ Conversación por voz con la IA** — reconocimiento y síntesis de voz del navegador para practicar hablando en inglés en tiempo real, con corrección de errores.
- **🎬 Modo Escena** — guiones cortos 100% originales generados por IA (nunca diálogos de películas reales) para practicar pronunciación escuchando y repitiendo líneas.
- **📚 Vocabulario con repetición espaciada** — cada palabra que el usuario falla (en práctica, diagnóstico o escena) se guarda automáticamente y se repasa con tarjetas tipo flashcard usando un algoritmo de repetición espaciada.
- **🏆 Logros** — medallas que se desbloquean según la actividad del usuario (rachas, puntos, vocabulario dominado, nivel alcanzado, etc.).
- **🎯 Meta diaria y sistema de puntos/racha** — gamificación que motiva la práctica constante, con indicador de tendencia (mejorando / estable / bajando).

---

## 🗂️ Estructura del proyecto

```
tutorias/
├── backend/
│   ├── src/
│   │   ├── config/        # db.js (conexión PostgreSQL) + schema.sql
│   │   ├── controllers/   # authController, nivelController, practicaController,
│   │   │                  # usuarioController, vozController, escenaController,
│   │   │                  # vocabularioController
│   │   ├── models/        # userModel.js, ejercicioModel.js
│   │   ├── routes/        # una ruta por controller
│   │   ├── services/      # iaService.js (todas las llamadas a Groq)
│   │   ├── middleware/    # authMiddleware.js (verificación de token)
│   │   ├── utils/         # gamificacion.js, vocabulario.js
│   │   └── tests/
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── assets/
    │   ├── components/    # un archivo por vista (pruebaNivel, practica, voz,
    │   │                  # escena, vocabulario, logros, progreso, formAuth)
    │   ├── services/      # un archivo API por módulo (fetch al backend)
    │   ├── store/         # sesion.js (estado global vía localStorage)
    │   ├── utils/         # validaciones.js
    │   └── styles/        # global.css
    ├── index.html
    └── package.json       # sirve el sitio como estático (usado en Railway)
```

---

## 🧱 Base de datos

Tablas principales (PostgreSQL):

- `usuarios` — cuentas, nivel MCER actual, puntos, racha, actividad diaria
- `vocabulario_usuario` — palabras guardadas con repetición espaciada
- `ejercicios` — historial de práctica diaria
- `conversaciones` — historial de intercambios de voz (libres y de escena)
- `diagnosticos_nivel` — resultados de cada Diagnóstico Inmersivo completado

El esquema completo está en `backend/src/config/schema.sql`.

---

## ⚙️ Instalación local

### 1. Base de datos

Ejecuta `backend/src/config/schema.sql` en tu instancia de PostgreSQL (crea todas las tablas y columnas necesarias).

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edita .env con tu DATABASE_URL, un JWT_SECRET seguro, y tu GROQ_API_KEY
npm run dev
```

El backend queda corriendo en `http://localhost:3000`.

**Endpoints principales:**

| Ruta | Método | Descripción |
|---|---|---|
| `/api/auth/registro` | POST | Crear cuenta |
| `/api/auth/login` | POST | Iniciar sesión |
| `/api/nivel/escena` | POST | Siguiente escena del diagnóstico |
| `/api/nivel/finalizar` | POST | Cerrar diagnóstico y obtener nivel |
| `/api/practica/pregunta` | POST | Siguiente ejercicio de práctica |
| `/api/voz/responder` | POST | Conversación libre por voz |
| `/api/escena/nueva` | POST | Nueva escena de pronunciación |
| `/api/vocabulario/repaso` | GET | Palabras pendientes de repasar |
| `/api/usuario/progreso` | GET | Puntos, racha, tendencia, meta diaria |
| `/api/usuario/logros` | GET | Estado de todos los logros |

### 3. Frontend

```html
<script>window.TUTORIAS_API_URL = 'http://localhost:3000/api';</script>
```

Abre `frontend/index.html` directamente en el navegador, o sírvelo con cualquier servidor estático.

---

## 🌐 Despliegue

- **Backend + PostgreSQL**: [Railway](https://railway.app)
- **Frontend**: desplegado como sitio estático (Netlify o Railway, usando `npx serve`)

---

## 🤖 Inteligencia Artificial

Todas las funciones de IA usan **Groq** (`openai/gpt-oss-120b`) a través de `groq-sdk`, centralizadas en `backend/src/services/iaService.js`. El modo Escena genera contenido 100% original — nunca reproduce diálogos, personajes ni guiones de obras existentes.

---

## 🛠️ Stack técnico

**Lenguajes:** JavaScript (Node.js + Vanilla JS), HTML5, CSS3, SQL

**Backend:** Express.js, PostgreSQL (`pg`), JWT (`jsonwebtoken`), `bcryptjs`, `cors`, `dotenv`, `groq-sdk`

**Frontend:** HTML/CSS/JS puro, Font Awesome, Google Fonts, Web Speech API (reconocimiento y síntesis de voz nativos del navegador)

**Herramientas:** VS Code, GitHub Desktop, pgAdmin 4
