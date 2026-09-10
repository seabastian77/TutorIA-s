# TutorIA's

Asistente de estudio de inglés con inteligencia artificial. Evalúa tu nivel,
te pone a practicar lo que necesitas, te escucha hablar y te corrige.

**Aplicación:** https://tutorias-frontend-production.up.railway.app

---

## Qué hace

**Diagnóstico de nivel.** Ocho escenas encadenadas donde la dificultad se
ajusta según respondes, mezclando opción múltiple y respuesta abierta. Al final
te da tu nivel MCER (A1 a b2) y una puntuación por habilidad.

**Práctica adaptativa.** Ejercicios ilimitados generados por IA. Eliges qué
estudiar hoy entre 18 temas: gramática, vocabulario o situaciones de la vida
real. La dificultad sube cuando aciertas y baja cuando fallas.

**Conversación por voz.** Hablas al micrófono y la IA te responde y te corrige
en tiempo real.

**Situaciones reales.** Cinco escenarios de roleplay: pedir un café, pasar
migración en el aeropuerto, una entrevista de trabajo, el check-in de un hotel
y una cita médica. La IA se queda en personaje.

**Biblioteca.** Cuentos originales a tu nivel. Tocas cualquier palabra y ves
qué significa en ese contexto — y la palabra entra sola a tu vocabulario.

**Laboratorio de audio.** Dictados que te marcan cada palabra en verde o rojo,
y ejercicios de comprensión auditiva.

**Modo escena.** Guiones originales para leer en voz alta y practicar
pronunciación.

**Mi vocabulario.** Las palabras que fallas se guardan solas y vuelven con
repetición espaciada.

**Ejercicios con imagen.** Fotos reales de escenas cotidianas: escribes qué está
pasando y un modelo de visión compara tu descripción con lo que de verdad se ve.
En las situaciones reales, además, te dice si tu reacción encajaba con el momento.

**Minijuegos.** El ahorcado con la pista en español, una sopa de letras a
contrarreloj y un juego de emparejar palabra y traducción. Los tres se arman con
las palabras que tú vienes fallando.

**Gamificación.** XP con bonus por rachas de aciertos, monedas, tienda con
escudos que salvan tu racha, once insignias y ligas semanales de 30 personas
donde suben los siete primeros.

---

## Tecnología

| Capa | Qué se usó |
|---|---|
| Frontend | HTML, CSS y JavaScript vanilla — sin framework ni build |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL |
| IA | Groq — `openai/gpt-oss-120b` y `qwen/qwen3.6-27b` para las imágenes |
| Fotos y video | Pexels (licencia libre, con atribución) |
| Voz | Web Speech API del navegador |
| Despliegue | Railway |

Todo el contenido (ejercicios, cuentos, guiones, conversaciones) es original y
generado en el momento por IA. No hay bancos de preguntas fijos ni material de
terceros.

---

## Estructura

```
TutorIA-s/
├── .github/          Workflows de CI y plantillas de issues
├── src/
│   ├── backend/      API REST en Node + Express
│   └── frontend/     Aplicación web
├── docs/             Arquitectura, base de datos y API
├── tests/            Pruebas con Jest
├── LICENSE
├── README.md
└── package.json
```

La documentación técnica está en [`docs/`](docs/):
[arquitectura](docs/arquitectura.md) ·
[base de datos](docs/base-de-datos.md) ·
[API](docs/api.md)

---

## Cómo levantarlo en local

Necesitas Node 18 o superior y una base PostgreSQL.

```bash
git clone https://github.com/seabastian77/TutorIA-s.git
cd TutorIA-s
npm run install:all
```

Crea `src/backend/.env` con tus datos (hay una plantilla en
`src/backend/.env.example`):

```
PORT=3000
DATABASE_URL=postgresql://usuario:clave@host:puerto/basededatos
JWT_SECRET=una_clave_larga_y_secreta
GROQ_API_KEY=tu_clave_de_groq
SENTRY_DSN=          # opcional: sin él, el backend corre igual
PEXELS_API_KEY=      # opcional: sin él, los ejercicios con imagen no aparecen
```

No hace falta crear las tablas a mano. Al arrancar, el backend corre solo
`schema.sql` y todas las migraciones de `src/backend/src/config/`:

```bash
npm run dev
```

Para el frontend, abre `src/frontend/index.html` con Live Server y cambia la
constante `window.TUTORIAS_API_URL` al final del archivo para que apunte a
`http://localhost:3000/api`.

---

## Pruebas

```bash
npm test
```

Cubren la comparación de dictados, el marcado de pronunciación palabra por
palabra, el cálculo de semanas de la liga, la lógica de los minijuegos y el
formato de los medios que llegan de Pexels y del modelo de visión.

---

## Requisitos del navegador

Las funciones de voz (conversación, modo escena y laboratorio de audio) usan la
Web Speech API, disponible en **Chrome y Edge de escritorio**. El resto de la
aplicación funciona en cualquier navegador moderno.

---

## Licencia

MIT — ver [LICENSE](LICENSE).
