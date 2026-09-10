# API

Base: `https://tutoria-s-production.up.railway.app/api`

Salvo `/auth/registro`, `/auth/login` y `/health`, **todos los endpoints
necesitan la cabecera**:

```
Authorization: Bearer <token>
```

Sin ella devuelven `401`. Con un token de otro usuario, cada endpoint filtra
por `req.usuario.id`, así que nunca se ven datos ajenos.

## Respuestas de error

Siempre con la misma forma:

```json
{ "error": "Mensaje explicando qué pasó" }
```

Algunos añaden `codigo` para que el frontend distinga el caso (por ejemplo
`sin_monedas` o `tope_alcanzado` en la tienda).

---

## Autenticación

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/auth/registro` | Crea la cuenta. Body: `nombre`, `correo`, `contrasena` |
| POST | `/auth/login` | Devuelve el token. Body: `correo`, `contrasena` |
| GET | `/auth/perfil` | Datos del usuario del token |

## Usuario

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/usuario/progreso` | XP, racha, monedas, escudos, nivel, tendencia, meta diaria |
| GET | `/usuario/logros` | Las 11 insignias con su progreso |
| PATCH | `/usuario/preferencias` | Body: `ayudaEspanol` (booleano) |

## Diagnóstico de nivel

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/nivel/escena` | Genera la siguiente escena del diagnóstico |
| POST | `/nivel/evaluar-abierta` | Evalúa una respuesta escrita libre |
| POST | `/nivel/fallo-opcion` | Registra un fallo de opción múltiple |
| POST | `/nivel/finalizar` | Cierra el diagnóstico y fija el nivel MCER |

## Práctica adaptativa

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/practica/pregunta` | Genera un ejercicio. Body opcional: `tema` |
| POST | `/practica/responder` | Corrige. Devuelve XP, bonus y monedas |

El bonus de lección perfecta salta con cinco aciertos seguidos, calculado sobre
el historial real de la tabla `ejercicios`.

## Conversación por voz

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/voz/responder` | Body: `mensajeUsuario`, `historial`, `nivel` |

## Modo escena

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/escena/nueva` | Guion original generado por IA, con un video de ambiente |
| POST | `/escena/evaluar-linea` | Compara la transcripción con la línea objetivo |

## Vocabulario

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/vocabulario/repaso` | Palabras que toca repasar hoy |
| POST | `/vocabulario/responder` | Body: `id`, `acerto`. Mueve el intervalo |

## Tienda

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/tienda/catalogo` | Artículos, monedas e inventario |
| POST | `/tienda/comprar` | Body: `articuloId` |

El precio vive solo en el servidor. El cliente manda el id, nunca el valor.

## Liga semanal

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/liga/clasificacion` | Tabla del grupo, tu posición y días restantes |

Si es la primera vez de la semana, este endpoint también aplica el ascenso o
descenso que corresponda según cómo le fue la semana anterior.

## Roleplay

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/roleplay/escenarios` | Las cinco situaciones disponibles |
| POST | `/roleplay/iniciar` | Body: `escenarioId`. Devuelve la primera línea |
| POST | `/roleplay/responder` | Body: `escenarioId`, `historial`, `mensajeUsuario` |

## Biblioteca

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/biblioteca/catalogo` | Temas del nivel, marcando los ya leídos |
| GET | `/biblioteca/lectura/:slug` | Abre la lectura (la genera si no existía) |
| POST | `/biblioteca/traducir` | Body: `palabra`, `contexto` |
| POST | `/biblioteca/responder` | Body: `lecturaId`, `respuestas` |

## Laboratorio de audio

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/audio/dictado` | Frase para dictado, con pista |
| POST | `/audio/responder-dictado` | Body: `ejercicioId`, `texto` |
| GET | `/audio/comprension` | Pasaje con tres preguntas |
| POST | `/audio/responder-comprension` | Body: `ejercicioId`, `respuestas` |

El dictado se corrige contra la frase guardada en la base, nunca contra lo que
mande el cliente. La comparación es palabra por palabra, ignorando mayúsculas,
tildes y puntuación.

## Minijuegos

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/juegos/ahorcado/nueva` | Empieza una partida. Devuelve la pista en español y el largo |
| POST | `/juegos/ahorcado/letra` | Body: `partidaId`, `letra` |
| POST | `/juegos/ahorcado/pista` | Gasta una pista de la tienda y descubre una letra |
| POST | `/juegos/sopa/nueva` | Tablero de 10×10 con seis palabras escondidas |
| POST | `/juegos/sopa/hallazgo` | Body: `partidaId`, `fila`, `columna`, `filaFin`, `columnaFin` |
| POST | `/juegos/sopa/terminar` | Cierra la partida, reparte XP y revela lo que faltó |
| POST | `/juegos/emparejar/nueva` | Dos columnas barajadas: palabras y traducciones |
| POST | `/juegos/emparejar/par` | Body: `partidaId`, `izquierdaId`, `derechaId` |

Las palabras salen del vocabulario que el propio estudiante ha ido fallando; si
no tiene suficientes, las completa la IA y, si la IA no responde, una lista fija
por nivel.

Las partidas viven en memoria del servidor durante media hora. El ahorcado nunca
manda la palabra hasta que la partida termina, y en el emparejamiento cada lado
lleva un identificador distinto para que la pareja no se pueda deducir.

## Ejercicios con imagen

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/visual/temas` | Los dos catálogos y si la función está disponible |
| POST | `/visual/ejercicio` | Body: `modo` (`describir` o `reaccionar`), `tema` |
| POST | `/visual/responder` | Body: `ejercicioId`, `texto` |

Las fotos salen de Pexels y quedan cacheadas en la tabla `medios`, así una misma
consulta gasta una sola petición contra su API. La evaluación la hace el modelo
de visión de Groq **contra la imagen guardada en la base**, nunca contra una URL
que mande el cliente.

Sin `PEXELS_API_KEY` configurada, `/visual/temas` responde `disponible: false` y
`/visual/ejercicio` devuelve `503` con el código `sin_medios`. El resto de la
aplicación funciona igual.

La licencia de Pexels obliga a mostrar el nombre del autor y un enlace al sitio:
por eso los tres endpoints devuelven `autor` y `autorUrl`.

## Salud

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/health` | Comprueba que el servicio responde. No pide token |
