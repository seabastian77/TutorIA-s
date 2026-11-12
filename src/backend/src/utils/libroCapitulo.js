// Arma el capítulo de un clásico contado por la IA: cuántas líneas pedir por nivel y cómo revisarlas

const { emparejarLineas } = require("./lineasBilingues");

const LINEAS_CAPITULO = { minimas: 5, maximas: 24, largo: 260 };

// Más líneas y más largas a medida que sube el nivel
const LARGO_POR_NIVEL = {
  A1: "8 to 10 very short",
  A2: "10 to 12 short",
  B1: "12 to 14",
  B2: "13 to 16",
  C1: "14 to 18",
  C2: "14 to 18",
};

function largoPorNivel(nivel) {
  return LARGO_POR_NIVEL[nivel] || LARGO_POR_NIVEL.B1;
}

/** Revisa lo que devolvió la IA; si faltan líneas, el capítulo no se guarda. */
function normalizarCapitulo(crudo) {
  const datos = crudo && typeof crudo === "object" ? crudo : {};
  return emparejarLineas(datos.lineas, datos.traducciones, LINEAS_CAPITULO);
}

module.exports = { normalizarCapitulo, largoPorNivel, LINEAS_CAPITULO };
