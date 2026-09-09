// ============================================================
// Reglas y fechas de la liga semanal. Sin base de datos, para que
// se puedan probar sin levantar nada.
// ============================================================

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

module.exports = {
  LIGAS,
  NOMBRES_LIGA,
  TAMANO_GRUPO,
  SUBEN,
  BAJAN,
  lunesDeLaSemana,
  semanaAnterior,
  subirLiga,
  bajarLiga,
};
