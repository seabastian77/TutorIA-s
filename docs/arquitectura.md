# Arquitectura

## En una frase

TutorIA's es una aplicación web de tres piezas: un frontend en JavaScript
vanilla que corre en el navegador, un backend en Node/Express que expone una
API REST, y una base de datos PostgreSQL. La inteligencia artificial no vive
en el proyecto: se consume como servicio externo desde el backend.

## Diagrama

```
   Navegador                    Railway                      Servicios
┌───────────────┐        ┌──────────────────┐         ┌──────────────────┐
│   Frontend    │        │     Backend      │         │      Groq        │
│  index.html   │ HTTPS  │  Node + Express  │  HTTPS  │ openai/gpt-oss   │
│  JS vanilla   │──────► │   API REST       │────────►│     -120b        │
│               │  JWT   │                  │         └──────────────────┘
│ Web Speech    │        │                  │
│ API (voz)     │        │                  │  SQL    ┌──────────────────┐
└───────────────┘        │                  │────────►│   PostgreSQL     │
                         └──────────────────┘         └──────────────────┘
```

## Por qué está partido así

**El frontend no habla nunca con la IA.** Todas las llamadas a Groq salen del
backend. Si el navegador tuviera la clave de la API, cualquiera podría sacarla
del código y gastarla. Por eso `GROQ_API_KEY` solo existe como variable de
entorno en Railway.

**El navegador pone la voz, no el servidor.** Tanto el reconocimiento de voz
(Web Speech API) como la lectura en voz alta (SpeechSynthesis) corren en el
navegador del estudiante. Eso evita pagar un servicio de audio y hace que la
respuesta sea inmediata, a cambio de depender de Chrome o Edge.

**Las respuestas correctas nunca viajan al cliente.** Cuando el backend manda
un ejercicio de opción múltiple de lectura o de audio, quita el campo
`respuestaCorrecta` antes de responder, y guarda el ejercicio completo en la
base. Al corregir, compara contra lo guardado, no contra lo que mande el
navegador.

## Estructura de carpetas

```
src/backend/
├── server.js                 Arranque, CORS y montaje de rutas
└── src/
    ├── config/               Conexión a la base y archivos .sql
    ├── controllers/          Un archivo por área: qué hacer con cada petición
    ├── routes/               Un archivo por área: qué URL llama a qué controlador
    ├── services/             Todo lo que habla con la IA (los prompts viven aquí)
    ├── models/               Consultas SQL reutilizables
    ├── middleware/           Verificación del token JWT
    └── utils/                Gamificación, ligas, vocabulario, perfil

src/frontend/
├── index.html                Todas las vistas, ocultas con la clase .oculto
└── src/
    ├── components/           Un archivo por pantalla: escucha clics y pinta
    ├── services/             Un archivo por área: llamadas fetch a la API
    ├── store/                Sesión (token y usuario en localStorage)
    ├── utils/                Validaciones de formulario
    └── styles/               global.css — hoja única
```

## Cómo se navega en el frontend

No hay router ni framework. Todas las pantallas están en `index.html` y se
muestran u ocultan con la clase `.oculto`. Cada componente conoce el id de su
vista y la del panel principal, y las intercambia al entrar y al salir.

Es la decisión correcta para el tamaño del proyecto: sin build, sin
dependencias, y el archivo se puede servir como estático desde cualquier
lado.

## Autenticación

1. El usuario se registra o entra en `/api/auth/registro` o `/api/auth/login`
2. El backend devuelve un JWT firmado con `JWT_SECRET`
3. El frontend lo guarda en `localStorage` (módulo `store/sesion.js`)
4. Cada petición posterior manda la cabecera `Authorization: Bearer <token>`
5. `middleware/authMiddleware.js` lo verifica y deja `req.usuario` disponible

Las contraseñas se guardan con `bcryptjs`, nunca en texto plano.

## Cómo se genera el contenido

Los prompts están concentrados en dos archivos:

- `services/iaService.js` — diagnóstico de nivel, práctica, voz y escenas
- `services/iaContenido.js` — roleplay, lecturas y laboratorio de audio
- `services/juegosContenido.js` — palabras para los minijuegos

Todos piden a Groq una respuesta en JSON (`response_format: json_object`) y la
parsean. El nivel MCER del estudiante y el interruptor de ayuda en español se
inyectan en cada prompt, así que el mismo endpoint devuelve contenido distinto
para un A1 que para un B2.

**Las lecturas se cachean.** Generar un cuento cuesta tiempo y tokens, así que
la primera vez que alguien abre una lectura de un nivel se guarda en la tabla
`lecturas`. El siguiente estudiante del mismo nivel la lee de la base.

## Gamificación

`utils/gamificacion.js` es el único sitio donde se suma XP y se mueve la
racha. Todos los módulos (práctica, diagnóstico, voz, escena, roleplay,
lecturas, audio, minijuegos) llaman a la misma función `registrarActividad`, así
que las reglas viven en un solo lugar.

`utils/ligas.js` maneja la competencia semanal. La semana arranca el lunes; una
fila por usuario y semana en `liga_semanal` sostiene la clasificación y permite
calcular ascensos sin perder el historial.

## Minijuegos

`utils/juegosLogica.js` no toca la base ni la IA: arma la sopa de letras,
resuelve el estado del ahorcado y comprueba las selecciones del tablero. Al ser
funciones puras se pueden probar con Jest sin levantar nada.

Las partidas se guardan en un `Map` en memoria del servidor con media hora de
vida. No se crean tablas nuevas: lo único que llega a la base es el XP al
terminar y el descuento de la pista que se gasta. Así el cliente nunca recibe la
palabra del ahorcado ni las coordenadas de la sopa hasta que la partida acaba.

## Ejercicios con imagen

Groq no genera imágenes, solo las entiende. Por eso las fotos vienen de **Pexels**
(licencia libre, gratis) y Groq pone el modelo de visión que las evalúa.

`services/medios.js` habla con Pexels y guarda todo lo que trae en la tabla
`medios`. La caché es lo que hace viable el plan gratuito: cada consulta se pide
una vez y sirve para siempre, en vez de gastar una petición por ejercicio.

`services/iaVision.js` manda al modelo la imagen y lo que escribió el estudiante.
Como el modelo a veces envuelve el JSON en texto, `utils/medioFormato.js` lo
extrae; esas funciones son puras y por eso se pueden probar con Jest.

En el modo escena el video es solo ambiente: los videos de stock no traen
diálogo, así que el guion lo sigue generando la IA y se escucha con la voz del
navegador. El archivo se sirve desde el CDN de Pexels, nunca desde Railway.

## Migraciones automáticas

`config/migraciones.js` corre al arrancar el servidor, antes de atender la
primera petición: ejecuta `schema.sql` y después cada `migracion-*.sql` en orden
alfabético, cada archivo dentro de su propia transacción.

Todos los `.sql` usan `IF NOT EXISTS`, así que volver a correrlos no cambia lo
que ya existe ni borra datos. La base se pone al día sola en cada despliegue y
no puede quedar desfasada del código.

Si una migración falla, el servidor arranca igual y deja el error en el log y en
Sentry: es preferible una app degradada a una app caída.

## Errores en producción

`utils/errores.js` expone `reportarError`, que deja el error en el log y se lo
manda a Sentry. Los controladores capturan sus propios errores y devuelven 500,
así que sin este paso Sentry nunca los vería: el manejador de Express solo
alcanza los errores que nadie atrapó.

Sentry se enciende únicamente si existe `SENTRY_DSN`. Sin esa variable,
`captureException` no hace nada y el backend se comporta igual que antes.

## Despliegue

Todo vive en un mismo proyecto de Railway con tres servicios: el backend, el
frontend y PostgreSQL. El backend se despliega con root directory
`src/backend`; el frontend con `src/frontend`.

Las variables de entorno que necesita el backend están en `.env.example`.
