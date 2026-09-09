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
| POST | `/escena/nueva` | Guion original generado por IA |
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

## Salud

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/health` | Comprueba que el servicio responde. No pide token |
