// Fechas del día en la hora de Colombia, que es donde estudian los usuarios

const ZONA = process.env.TUTORIAS_ZONA_HORARIA || "America/Bogota";
const formato = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" });

/** El día de hoy (o de la fecha dada) como 'YYYY-MM-DD' en la hora de Colombia. */
function diaLocal(fecha = new Date()) {
  return formato.format(fecha);
}

/** Pasa una columna DATE de Postgres a 'YYYY-MM-DD' sin que la zona del servidor la corra un día. */
function fechaDeBase(valor) {
  if (!valor) return null;
  if (typeof valor === "string") return valor.slice(0, 10);
  const d = new Date(valor);
  const dos = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

/** Días entre dos fechas 'YYYY-MM-DD'. */
function diasEntre(desdeISO, hastaISO) {
  const a = new Date(`${desdeISO}T00:00:00Z`);
  const b = new Date(`${hastaISO}T00:00:00Z`);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

module.exports = { ZONA, diaLocal, fechaDeBase, diasEntre };
