const pool = require("../config/db");
const { sumarXpSemanal } = require("./ligas");

const META_DIARIA = 5; // actividades para completar el día
const XP_LECCION_PERFECTA = 5; // bonus por acertar sin fallar
const MONEDAS_POR_ACTIVIDAD = 1;
const MONEDAS_POR_META_DIARIA = 15; // premio al completar la meta
const MONEDAS_POR_RACHA_7 = 25; // premio cada 7 días de racha

/** Fecha de hoy como 'YYYY-MM-DD', sin la hora. */
function hoyISO() {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    .toISOString()
    .slice(0, 10);
}

function diasEntre(desdeISO, hastaISO) {
  const a = new Date(`${desdeISO}T00:00:00Z`);
  const b = new Date(`${hastaISO}T00:00:00Z`);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

/**
 * Registra una actividad del usuario: suma XP y monedas, mueve la racha
 * (gastando escudos si hizo falta) y alimenta la liga de la semana.
 *
 * @param {number} usuarioId
 * @param {number} puntosGanados  XP base de la actividad
 * @param {object} opciones
 * @param {boolean} opciones.perfecto  true si no cometió ningún error
 */
async function registrarActividad(usuarioId, puntosGanados, opciones = {}) {
  const { perfecto = false } = opciones;

  const { rows } = await pool.query(
    `SELECT puntos, racha_dias, racha_maxima, ultima_actividad,
            actividades_hoy, monedas, escudos
       FROM usuarios WHERE id = $1`,
    [usuarioId],
  );

  const usuario = rows[0];
  if (!usuario) {
    throw new Error(`Usuario ${usuarioId} no encontrado`);
  }

  const hoy = hoyISO();

  let racha = usuario.racha_dias || 0;
  let actividadesHoy = usuario.actividades_hoy || 0;
  let escudos = usuario.escudos || 0;
  let escudosUsados = 0;
  let rachaRota = false;

  if (usuario.ultima_actividad) {
    const ultima = new Date(usuario.ultima_actividad)
      .toISOString()
      .slice(0, 10);
    const diferencia = diasEntre(ultima, hoy);

    if (diferencia === 0) {
      // Mismo día: solo suma a la meta diaria
      actividadesHoy += 1;
    } else if (diferencia === 1) {
      racha += 1;
      actividadesHoy = 1;
    } else {
      // Se saltó días. Los escudos pueden salvar la racha.
      const diasPerdidos = diferencia - 1;
      if (escudos >= diasPerdidos) {
        escudos -= diasPerdidos;
        escudosUsados = diasPerdidos;
        racha += 1;
      } else {
        racha = 1;
        rachaRota = true;
      }
      actividadesHoy = 1;
    }
  } else {
    racha = 1;
    actividadesHoy = 1;
  }

  const xpGanado = (puntosGanados || 0) + (perfecto ? XP_LECCION_PERFECTA : 0);
  const puntos = (usuario.puntos || 0) + xpGanado;
  const rachaMaxima = Math.max(usuario.racha_maxima || 0, racha);

  // Monedas: una por actividad, premio al cerrar la meta del día,
  // y otro premio cada vez que la racha cruza un múltiplo de 7.
  let monedasGanadas = MONEDAS_POR_ACTIVIDAD;
  const metaCompletada = actividadesHoy === META_DIARIA;
  if (metaCompletada) monedasGanadas += MONEDAS_POR_META_DIARIA;

  const premioRacha =
    racha > (usuario.racha_dias || 0) && racha % 7 === 0
      ? MONEDAS_POR_RACHA_7
      : 0;
  monedasGanadas += premioRacha;

  const monedas = (usuario.monedas || 0) + monedasGanadas;

  await pool.query(
    `UPDATE usuarios
        SET puntos = $1, racha_dias = $2, racha_maxima = $3,
            ultima_actividad = $4, actividades_hoy = $5,
            monedas = $6, escudos = $7
      WHERE id = $8`,
    [puntos, racha, rachaMaxima, hoy, actividadesHoy, monedas, escudos, usuarioId],
  );

  // La liga nunca debe tumbar la respuesta del ejercicio
  try {
    await sumarXpSemanal(usuarioId, xpGanado);
  } catch (error) {
    console.error("No se pudo sumar XP a la liga semanal:", error);
  }

  return {
    puntos, // nombre histórico: XP total
    racha,
    rachaMaxima,
    actividadesHoy,
    metaDiaria: META_DIARIA,
    metaCompletada,
    xpGanado,
    bonusPerfecto: perfecto ? XP_LECCION_PERFECTA : 0,
    monedas,
    monedasGanadas,
    escudos,
    escudosUsados,
    rachaRota,
  };
}

module.exports = {
  registrarActividad,
  META_DIARIA,
  XP_LECCION_PERFECTA,
};
