const pool = require("../config/db");

// De menor a mayor. Subir o bajar es moverse un escalón en esta lista.
const LIGAS = ["bronce", "plata", "oro", "zafiro", "rubi", "diamante"];

const NOMBRES_LIGA = {
  bronce: "Bronze",
  plata: "Silver",
  oro: "Gold",
  zafiro: "Sapphire",
  rubi: "Ruby",
  diamante: "Diamond",
};

const TAMANO_GRUPO = 30; // personas por tabla de clasificación
const SUBEN = 7; // los 7 primeros ascienden
const BAJAN = 5; // los 5 últimos descienden

/**
 * Devuelve el lunes de la semana de una fecha, como 'YYYY-MM-DD'.
 * Todas las semanas de la liga arrancan el lunes.
 */
function lunesDeLaSemana(fecha = new Date()) {
  const d = new Date(
    Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()),
  );
  const diaSemana = d.getUTCDay(); // 0 = domingo
  const desplazamiento = diaSemana === 0 ? -6 : 1 - diaSemana;
  d.setUTCDate(d.getUTCDate() + desplazamiento);
  return d.toISOString().slice(0, 10);
}

function semanaAnterior(semana) {
  const d = new Date(`${semana}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString().slice(0, 10);
}

function subirLiga(liga) {
  const i = LIGAS.indexOf(liga);
  if (i === -1) return LIGAS[0];
  return LIGAS[Math.min(i + 1, LIGAS.length - 1)];
}

function bajarLiga(liga) {
  const i = LIGAS.indexOf(liga);
  if (i === -1) return LIGAS[0];
  return LIGAS[Math.max(i - 1, 0)];
}

/**
 * Busca un grupo de esa liga y semana que todavía tenga cupo.
 * Si todos están llenos, abre uno nuevo.
 */
async function elegirGrupoConCupo(semana, liga) {
  const { rows } = await pool.query(
    `SELECT grupo, COUNT(*)::int AS total
       FROM liga_semanal
      WHERE semana = $1 AND liga = $2
      GROUP BY grupo
      ORDER BY total ASC, grupo ASC
      LIMIT 1`,
    [semana, liga],
  );

  if (rows.length > 0 && rows[0].total < TAMANO_GRUPO) {
    return rows[0].grupo;
  }

  const { rows: maxRows } = await pool.query(
    `SELECT COALESCE(MAX(grupo), 0)::int AS maximo
       FROM liga_semanal
      WHERE semana = $1 AND liga = $2`,
    [semana, liga],
  );

  return (maxRows[0]?.maximo || 0) + 1;
}

/**
 * Calcula en qué puesto quedó el usuario la semana pasada y decide
 * si sube, baja o se queda. Devuelve la liga que le toca ahora.
 */
async function ligaTrasCierreDeSemana(usuarioId, semanaActual, ligaGuardada) {
  const anterior = semanaAnterior(semanaActual);

  const { rows } = await pool.query(
    `SELECT liga, grupo, xp FROM liga_semanal
      WHERE usuario_id = $1 AND semana = $2`,
    [usuarioId, anterior],
  );

  // No jugó la semana pasada: se queda donde estaba
  if (rows.length === 0) {
    return { liga: ligaGuardada, movimiento: "sin-datos", posicion: null };
  }

  const fila = rows[0];

  const { rows: mejores } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM liga_semanal
      WHERE semana = $1 AND liga = $2 AND grupo = $3 AND xp > $4`,
    [anterior, fila.liga, fila.grupo, fila.xp],
  );

  const { rows: totales } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM liga_semanal
      WHERE semana = $1 AND liga = $2 AND grupo = $3`,
    [anterior, fila.liga, fila.grupo],
  );

  const posicion = mejores[0].total + 1;
  const participantes = totales[0].total;

  // Con 0 XP no se asciende aunque el grupo esté vacío
  if (posicion <= SUBEN && fila.xp > 0) {
    return { liga: subirLiga(fila.liga), movimiento: "sube", posicion };
  }

  if (participantes >= SUBEN + BAJAN && posicion > participantes - BAJAN) {
    return { liga: bajarLiga(fila.liga), movimiento: "baja", posicion };
  }

  return { liga: fila.liga, movimiento: "se-queda", posicion };
}

/**
 * Garantiza que el usuario tenga fila en la liga de ESTA semana.
 * Si es la primera vez de la semana, aplica el ascenso o descenso
 * que le corresponde según cómo le fue la semana pasada.
 */
async function asegurarFilaSemana(usuarioId) {
  const semana = lunesDeLaSemana();

  const { rows: existente } = await pool.query(
    `SELECT liga, grupo, xp FROM liga_semanal
      WHERE usuario_id = $1 AND semana = $2`,
    [usuarioId, semana],
  );

  if (existente.length > 0) {
    return { semana, ...existente[0], movimiento: null };
  }

  const { rows: u } = await pool.query(
    "SELECT liga FROM usuarios WHERE id = $1",
    [usuarioId],
  );
  const ligaGuardada = u[0]?.liga || LIGAS[0];

  const resultado = await ligaTrasCierreDeSemana(
    usuarioId,
    semana,
    ligaGuardada,
  );
  const grupo = await elegirGrupoConCupo(semana, resultado.liga);

  // ON CONFLICT protege de dos peticiones simultáneas del mismo usuario
  const { rows: creada } = await pool.query(
    `INSERT INTO liga_semanal (usuario_id, semana, liga, grupo, xp)
     VALUES ($1, $2, $3, $4, 0)
     ON CONFLICT (usuario_id, semana) DO UPDATE SET xp = liga_semanal.xp
     RETURNING liga, grupo, xp`,
    [usuarioId, semana, resultado.liga, grupo],
  );

  await pool.query("UPDATE usuarios SET liga = $1 WHERE id = $2", [
    resultado.liga,
    usuarioId,
  ]);

  return {
    semana,
    ...creada[0],
    movimiento: resultado.movimiento,
    posicionAnterior: resultado.posicion,
  };
}

/** Suma XP a la fila de la semana en curso. */
async function sumarXpSemanal(usuarioId, xp) {
  if (!xp || xp <= 0) return;
  const fila = await asegurarFilaSemana(usuarioId);
  await pool.query(
    `UPDATE liga_semanal SET xp = xp + $1
      WHERE usuario_id = $2 AND semana = $3`,
    [xp, usuarioId, fila.semana],
  );
}

module.exports = {
  LIGAS,
  NOMBRES_LIGA,
  TAMANO_GRUPO,
  SUBEN,
  BAJAN,
  lunesDeLaSemana,
  semanaAnterior,
  asegurarFilaSemana,
  sumarXpSemanal,
};
