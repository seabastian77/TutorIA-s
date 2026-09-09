// Comparación de dictados, sin dependencias de base de datos ni IA

/** Quita puntuación y tildes para comparar lo que escribió el usuario. */
function normalizar(texto) {
  return (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Compara el dictado palabra por palabra contra la frase original. */
function compararDictado(fraseOriginal, escrito) {
  const esperadas = normalizar(fraseOriginal).split(" ").filter(Boolean);
  const dichas = normalizar(escrito).split(" ").filter(Boolean);

  const disponibles = [...dichas];
  const detalle = esperadas.map((palabra) => {
    const pos = disponibles.indexOf(palabra);
    if (pos !== -1) {
      disponibles.splice(pos, 1);
      return { palabra, acerto: true };
    }
    return { palabra, acerto: false };
  });

  const aciertos = detalle.filter((d) => d.acerto).length;
  const porcentaje = esperadas.length
    ? Math.round((aciertos / esperadas.length) * 100)
    : 0;

  return { detalle, aciertos, total: esperadas.length, porcentaje };
}

module.exports = { normalizar, compararDictado };
