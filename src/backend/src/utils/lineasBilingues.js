// Junta las líneas en inglés que escribe la IA con su traducción, limpias y alineadas una a una

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
 * Empareja cada línea con su traducción. Las traducciones solo pasan si vienen todas,
 * una por línea y distintas del inglés; si no, el texto sigue sin ellas.
 */
function emparejarLineas(lineasCrudas, traduccionesCrudas, { minimas, maximas, largo }) {
  const lineas = Array.isArray(lineasCrudas) ? lineasCrudas : [];
  const traducciones = Array.isArray(traduccionesCrudas) ? traduccionesCrudas : [];
  const pares = lineas
    .map((linea, i) => ({ en: limpiar(linea, largo), es: limpiar(traducciones[i], largo) }))
    .filter((par) => par.en)
    .slice(0, maximas);
  if (pares.length < minimas) throw new Error("El texto llegó sin líneas suficientes");

  const traducida =
    traducciones.length === lineas.length &&
    pares.every((par) => par.es && par.es.toLowerCase() !== par.en.toLowerCase());

  return {
    lineas: pares.map((par) => par.en),
    traducciones: traducida ? pares.map((par) => par.es) : null,
  };
}

module.exports = { limpiar, limpiarAmbiente, emparejarLineas };
