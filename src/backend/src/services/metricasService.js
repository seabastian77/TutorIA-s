// Consultas de las métricas del estudio; devuelve solo cifras agregadas

const pool = require("../config/db");
const {
  correosAdmin,
  porcentaje,
  semanasRecientes,
  completarSemanas,
  resumirCambioNivel,
  distribuirNiveles,
  ordenarModulos,
} = require("../utils/metricas");

/** Ids de las cuentas del equipo, que no cuentan como estudiantes. */
async function idsDelEquipo() {
  const correos = correosAdmin();
  if (!correos.length) return [];
  const { rows } = await pool.query(
    "SELECT id FROM usuarios WHERE LOWER(correo) = ANY($1::text[])",
    [correos],
  );
  return rows.map((r) => r.id);
}

/** Reúne todas las cifras del tablero en una sola respuesta. */
async function obtenerMetricas(hoy = new Date()) {
  const equipo = await idsDelEquipo();
  const semanas = semanasRecientes(hoy);
  const desde = semanas[0];

  const [usuarios, actividad, dias, modulos, porSemana, precision, diagnosticos, niveles] =
    await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE fecha_registro >= NOW() - INTERVAL '7 days')::int AS nuevos7,
                COALESCE(ROUND(AVG(racha_maxima) FILTER (WHERE racha_maxima > 0), 1), 0)::float AS racha_promedio,
                COALESCE(MAX(racha_maxima), 0)::int AS racha_mayor
           FROM usuarios WHERE id <> ALL($1::int[])`,
        [equipo],
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE fecha >= NOW() - INTERVAL '30 days')::int AS ultimos30,
                COUNT(DISTINCT usuario_id) FILTER (WHERE fecha >= NOW() - INTERVAL '7 days')::int AS activos7,
                COUNT(DISTINCT usuario_id) FILTER (WHERE fecha >= NOW() - INTERVAL '30 days')::int AS activos30,
                MIN(fecha) FILTER (WHERE NOT recuperada) AS registro_desde
           FROM actividades WHERE usuario_id <> ALL($1::int[])`,
        [equipo],
      ),
      pool.query(
        `SELECT COUNT(*)::int AS con_actividad,
                COUNT(*) FILTER (WHERE dias >= 2)::int AS volvieron,
                COALESCE(ROUND(AVG(dias), 1), 0)::float AS dias_promedio
           FROM (SELECT usuario_id, COUNT(DISTINCT fecha::date) AS dias
                   FROM actividades WHERE usuario_id <> ALL($1::int[])
                  GROUP BY usuario_id) t`,
        [equipo],
      ),
      pool.query(
        `SELECT modulo, COUNT(*)::int AS actividades, COUNT(DISTINCT usuario_id)::int AS estudiantes
           FROM actividades WHERE usuario_id <> ALL($1::int[])
          GROUP BY modulo`,
        [equipo],
      ),
      pool.query(
        `SELECT date_trunc('week', fecha) AS semana, COUNT(*)::int AS actividades,
                COUNT(DISTINCT usuario_id)::int AS estudiantes
           FROM actividades
          WHERE usuario_id <> ALL($1::int[]) AND fecha >= $2::date
          GROUP BY 1`,
        [equipo, desde],
      ),
      pool.query(
        `SELECT date_trunc('week', fecha) AS semana, COUNT(*)::int AS intentos,
                COUNT(*) FILTER (WHERE correcto)::int AS aciertos
           FROM ejercicios
          WHERE correcto IS NOT NULL AND usuario_id <> ALL($1::int[]) AND fecha >= $2::date
          GROUP BY 1`,
        [equipo, desde],
      ),
      pool.query(
        `SELECT usuario_id, nivel_mcer, vocabulario, gramatica, comprension, fluidez, fecha
           FROM diagnosticos_nivel WHERE usuario_id <> ALL($1::int[])`,
        [equipo],
      ),
      pool.query(
        `SELECT nivel_mcer AS nivel, COUNT(*)::int AS estudiantes
           FROM (SELECT DISTINCT ON (usuario_id) usuario_id, nivel_mcer
                   FROM diagnosticos_nivel WHERE usuario_id <> ALL($1::int[])
                  ORDER BY usuario_id, fecha DESC) ultimos
          GROUP BY nivel_mcer`,
        [equipo],
      ),
    ]);

  const u = usuarios.rows[0];
  const a = actividad.rows[0];
  const d = dias.rows[0];
  const distribucion = distribuirNiveles(niveles.rows);
  const conDiagnostico = distribucion.reduce((s, n) => s + n.estudiantes, 0);

  return {
    generado: new Date().toISOString(),
    cuentasExcluidas: equipo.length,
    registroDesde: a.registro_desde,
    estudiantes: {
      total: u.total,
      nuevos7: u.nuevos7,
      activos7: a.activos7,
      activos30: a.activos30,
      conDiagnostico,
    },
    uso: {
      actividades: a.total,
      actividades30: a.ultimos30,
      modulos: ordenarModulos(modulos.rows),
      semanas: completarSemanas(porSemana.rows, semanas, ["actividades", "estudiantes"]),
    },
    constancia: {
      conActividad: d.con_actividad,
      volvieron: d.volvieron,
      volvieronPct: porcentaje(d.volvieron, d.con_actividad),
      diasPromedio: d.dias_promedio,
      rachaPromedio: u.racha_promedio,
      rachaMayor: u.racha_mayor,
    },
    aprendizaje: {
      cambioNivel: resumirCambioNivel(diagnosticos.rows),
      niveles: distribucion,
      aciertos: completarSemanas(precision.rows, semanas, ["intentos", "aciertos"]).map((s) => ({
        ...s,
        porcentaje: porcentaje(s.aciertos, s.intentos),
      })),
    },
  };
}

module.exports = { obtenerMetricas };
