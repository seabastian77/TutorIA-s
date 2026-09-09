// Comparación de dictados y pronunciación, sin dependencias de base de datos ni IA

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

/** Parte un texto en palabras ya normalizadas. */
function enPalabras(texto) {
  return normalizar(texto).split(" ").filter(Boolean);
}

/** Compara el dictado palabra por palabra contra la frase original. */
function compararDictado(fraseOriginal, escrito) {
  const esperadas = enPalabras(fraseOriginal);
  const dichas = enPalabras(escrito);

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

/** Marca qué posiciones de dos listas de palabras forman su subsecuencia común más larga. */
function alinear(esperadas, dichas) {
  const filas = esperadas.length;
  const cols = dichas.length;

  const tabla = Array.from({ length: filas + 1 }, () => new Array(cols + 1).fill(0));

  for (let i = filas - 1; i >= 0; i--) {
    for (let j = cols - 1; j >= 0; j--) {
      tabla[i][j] =
        esperadas[i] === dichas[j]
          ? tabla[i + 1][j + 1] + 1
          : Math.max(tabla[i + 1][j], tabla[i][j + 1]);
    }
  }

  const enComun = new Array(filas).fill(false);
  const usadas = new Array(cols).fill(false);
  let i = 0;
  let j = 0;

  while (i < filas && j < cols) {
    if (esperadas[i] === dichas[j]) {
      enComun[i] = true;
      usadas[j] = true;
      i++;
      j++;
    } else if (tabla[i + 1][j] >= tabla[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }

  return { enComun, usadas };
}

/**
 * Compara lo que el usuario pronunció contra la línea que debía leer.
 * A diferencia del dictado, aquí el orden importa: una palabra dicha fuera
 * de lugar no cuenta como acierto.
 */
function compararPronunciacion(lineaObjetivo, transcripcion) {
  const esperadas = enPalabras(lineaObjetivo);
  const dichas = enPalabras(transcripcion);

  if (esperadas.length === 0) {
    return { detalle: [], sobrantes: [], aciertos: 0, total: 0, porcentaje: 0 };
  }

  const { enComun, usadas } = alinear(esperadas, dichas);

  const detalle = esperadas.map((palabra, indice) => ({
    palabra,
    acerto: enComun[indice],
  }));

  const sobrantes = dichas.filter((_, indice) => !usadas[indice]);
  const aciertos = detalle.filter((d) => d.acerto).length;

  return {
    detalle,
    sobrantes,
    aciertos,
    total: esperadas.length,
    porcentaje: Math.round((aciertos / esperadas.length) * 100),
  };
}

module.exports = {
  normalizar,
  enPalabras,
  compararDictado,
  compararPronunciacion,
};
