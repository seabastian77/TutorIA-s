// Revisa el guion de Scene Mode que devuelve la IA: título, situación, líneas en inglés y su traducción

const { limpiar, limpiarAmbiente, emparejarLineas } = require("./lineasBilingues");

const LINEAS_MINIMAS = 3;
const LINEAS_MAXIMAS = 6;
const LARGO_LINEA = 220;

/** Deja la escena lista para el estudiante; sin traducciones completas, la escena sigue sin ellas. */
function normalizarEscena(crudo) {
  const datos = crudo && typeof crudo === "object" ? crudo : {};
  const { lineas, traducciones } = emparejarLineas(datos.lineas, datos.traducciones, {
    minimas: LINEAS_MINIMAS,
    maximas: LINEAS_MAXIMAS,
    largo: LARGO_LINEA,
  });
  return {
    titulo: limpiar(datos.titulo, 90) || "Your scene",
    situacion: limpiar(datos.situacion, 260),
    lineas,
    traducciones,
    ambiente: limpiarAmbiente(datos.ambiente),
  };
}

module.exports = { normalizarEscena, LINEAS_MINIMAS, LINEAS_MAXIMAS };
