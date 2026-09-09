# Base de datos

PostgreSQL, alojado en Railway. El esquema completo está en
`src/backend/src/config/schema.sql`, que es la única fuente de verdad: para una
base nueva se ejecuta ese archivo entero.

Para una base que ya existe hay migraciones incrementales, pensadas para
ejecutarse desde pgAdmin. Todas usan `IF NOT EXISTS`, así que se pueden correr
dos veces sin romper nada.

| Archivo | Qué agrega |
|---|---|
| `schema.sql` | Todo, desde cero |
| `migracion-gamificacion.sql` | Monedas, escudos, ligas y tienda |
| `migracion-contenido.sql` | Lecturas, roleplay y ayuda en español |

## Tablas

### usuarios

El centro de todo. Guarda la cuenta y también el estado de gamificación.

| Columna | Tipo | Para qué |
|---|---|---|
| `id` | SERIAL PK | |
| `nombre` | VARCHAR(100) | Se muestra en el saludo y en la liga |
| `correo` | VARCHAR(150) UNIQUE | Login |
| `contrasena_hash` | VARCHAR(255) | bcrypt, nunca texto plano |
| `nivel_mcer` | VARCHAR(2) | A1 a C2. Lo fija el diagnóstico |
| `puntos` | INTEGER | XP acumulado de por vida |
| `racha_dias` | INTEGER | Días seguidos practicando |
| `racha_maxima` | INTEGER | Récord histórico |
| `ultima_actividad` | DATE | Con esta se calcula si la racha sigue viva |
| `actividades_hoy` | INTEGER | Progreso de la meta diaria |
| `monedas` | INTEGER | Moneda de la tienda |
| `escudos` | INTEGER | Protectores de racha, máximo 3 |
| `pistas` | INTEGER | Pistas disponibles |
| `vidas` | INTEGER | Vidas disponibles |
| `liga` | VARCHAR(20) | Liga actual: bronce a diamante |
| `ayuda_es` | BOOLEAN | Interruptor de explicaciones en español |

### vocabulario_usuario

Las palabras que el estudiante falló, con repetición espaciada. Se alimenta
sola desde la práctica, el diagnóstico, el modo escena, el roleplay, los
dictados y las palabras que toca al leer.

`nivel_dominio` va de 0 a 5 y `proximo_repaso` se calcula con la escala de
intervalos 1, 2, 4, 7, 14 y 30 días.

### ejercicios

Historial de todo lo que respondió. Sirve para tres cosas: calcular el nivel
adaptativo, detectar cinco aciertos seguidos (el bonus de lección perfecta), y
guardar los ejercicios de audio con sus respuestas correctas.

El campo `tipo` distingue: `opcion_multiple`, `escrita`, `dictado`,
`audio_comprension`.

### conversaciones

Cada intercambio hablado con la IA, tanto del chat de voz como del roleplay.
`correcciones` guarda en JSONB la corrección que dio la IA, si la hubo.

### diagnosticos_nivel

Un registro por cada diagnóstico completado, con las cuatro habilidades
puntuadas de 0 a 100 (vocabulario, gramática, comprensión, fluidez). Comparando
los dos últimos se calcula si el estudiante va mejorando o bajando.

### liga_semanal

Una fila por usuario y por semana. Es la pieza que permite calcular la
clasificación y los ascensos sin perder el historial: al llegar un lunes nuevo
no se borra nada, se crea una fila nueva y se mira la de la semana pasada para
decidir si sube o baja.

| Columna | Para qué |
|---|---|
| `semana` | Fecha del lunes de esa semana |
| `liga` | En qué liga compitió esa semana |
| `grupo` | Grupos de 30 personas |
| `xp` | XP ganado en esa semana |

Restricción `UNIQUE (usuario_id, semana)` para que dos peticiones simultáneas
no creen filas duplicadas.

### compras_tienda

Registro de cada compra, con el precio del momento. Permite auditar la economía
después.

### lecturas y lecturas_completadas

`lecturas` guarda cada cuento generado por la IA, único por nivel y tema
(`UNIQUE (nivel, slug)`). Es una caché: el primero que abre una lectura la
genera, el resto la lee de aquí.

`lecturas_completadas` guarda qué terminó cada usuario y con cuántos aciertos.

### roleplays

Cuántos turnos lleva cada usuario en cada situación. Datos de uso, no de
funcionamiento.

## Relaciones

Todas las tablas cuelgan de `usuarios` con `ON DELETE CASCADE`: si se borra una
cuenta, se va todo su rastro.

```
usuarios ──┬── vocabulario_usuario
           ├── ejercicios
           ├── conversaciones
           ├── diagnosticos_nivel
           ├── liga_semanal
           ├── compras_tienda
           ├── roleplays
           └── lecturas_completadas ── lecturas
```

`lecturas` es la única tabla que no pertenece a nadie: es contenido compartido
entre todos los estudiantes del mismo nivel.

## Índices

Solo los que hacen falta:

- `idx_liga_semanal_tabla` sobre `(semana, liga, grupo, xp DESC)` — es la
  consulta de la clasificación
- `idx_compras_usuario` sobre `(usuario_id, fecha DESC)`
- `idx_lecturas_nivel` sobre `(nivel)`
- `idx_roleplays_usuario` sobre `(usuario_id, fecha DESC)`
