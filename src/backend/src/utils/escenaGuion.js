// Revisa el guion de Scene Mode que devuelve la IA: título, situación, líneas en inglés y su traducción

const LINEAS_MINIMAS = 3;
const LINEAS_MAXIMAS = 6;
const LARGO_LINEA = 220;

/** Texto limpio y recortado; lo que no sea texto queda vacío. */
function limpiar(valor, largo) {
  return typeof valor === "string" ? valor.replace(/\s+/g, " ").trim().slice(0, largo) : "";
}

/** La búsqueda del video de ambiente: pocas palabras en inglés, sin signos. */
function limpiarAmbiente(valor) {
  const palabras = limpiar(valor, 80).toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  return palabras.slice(0, 5).join(" ");
}

/**
 * Deja la escena lista para el estudiante. Las traducciones solo pasan si vienen todas,
 * una por línea y distintas del inglés; si no, la escena sigue sin ellas.
 */
function normalizarEscena(crudo) {
  const datos = crudo && typeof crudo === "object" ? crudo : {};
  const lineas = Array.isArray(datos.lineas) ? datos.lineas : [];
  const traducciones = Array.isArray(datos.traducciones) ? datos.traducciones : [];

  const pares = lineas
    .map((linea, i) => ({ en: limpiar(linea, LARGO_LINEA), es: limpiar(traducciones[i], LARGO_LINEA) }))
    .filter((par) => par.en)
    .slice(0, LINEAS_MAXIMAS);
  if (pares.length < LINEAS_MINIMAS) throw new Error("La escena llegó sin líneas suficientes");

  const traducida =
    traducciones.length === lineas.length &&
    pares.every((par) => par.es && par.es.toLowerCase() !== par.en.toLowerCase());

  return {
    titulo: limpiar(datos.titulo, 90) || "Your scene",
    situacion: limpiar(datos.situacion, 260),
    lineas: pares.map((par) => par.en),
    traducciones: traducida ? pares.map((par) => par.es) : null,
    ambiente: limpiarAmbiente(datos.ambiente),
  };
}

module.exports = { normalizarEscena, LINEAS_MINIMAS, LINEAS_MAXIMAS };
