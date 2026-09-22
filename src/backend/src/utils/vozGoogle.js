// Arma lo que se le pide a las voces de Google, sin red de por medio

const LARGO_MAXIMO = 600; // lo que se lee en la app nunca pasa de un párrafo
const VELOCIDAD_MINIMA = 0.5;
const VELOCIDAD_MAXIMA = 1.5;

// Voces de mujer que suenan claras. Si alguna deja de existir, el servicio
// vuelve a pedir sin nombre y Google escoge una del mismo idioma y género.
const VOCES = {
  en: { idioma: "en-US", nombre: "en-US-Neural2-F" },
  es: { idioma: "es-US", nombre: "es-US-Neural2-A" },
};

/** Deja el texto en una línea y dentro del tope, que es lo que se cobra. */
function limpiarTexto(texto) {
  return String(texto == null ? "" : texto)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, LARGO_MAXIMO);
}

/** El idioma pedido, cayendo a inglés que es lo que más se lee en la app. */
function idiomaValido(idioma) {
  const raiz = String(idioma || "en").toLowerCase().slice(0, 2);
  return VOCES[raiz] ? raiz : "en";
}

function vozPreferida(idioma) {
  return VOCES[idiomaValido(idioma)];
}

/** Encierra la velocidad en lo que acepta Google, venga como venga. */
function velocidadValida(velocidad) {
  const n = Number(velocidad);
  if (!isFinite(n) || n <= 0) return 1;
  return Math.min(VELOCIDAD_MAXIMA, Math.max(VELOCIDAD_MINIMA, n));
}

/**
 * El cuerpo de la petición. Con 'conNombre' en falso se pide solo por idioma y
 * género, que es el reintento cuando el nombre de la voz ya no existe.
 */
function cuerpoDeSintesis(texto, idioma, velocidad, conNombre = true) {
  const voz = vozPreferida(idioma);
  return {
    input: { text: limpiarTexto(texto) },
    voice: {
      languageCode: voz.idioma,
      ssmlGender: "FEMALE",
      ...(conNombre ? { name: voz.nombre } : {}),
    },
    audioConfig: { audioEncoding: "MP3", speakingRate: velocidadValida(velocidad) },
  };
}

/** La llave del caché: lo mismo dicho igual no se vuelve a pagar. */
function claveDeCache(texto, idioma, velocidad) {
  return `${idiomaValido(idioma)}|${velocidadValida(velocidad)}|${limpiarTexto(texto)}`;
}

module.exports = {
  LARGO_MAXIMO,
  VOCES,
  limpiarTexto,
  idiomaValido,
  vozPreferida,
  velocidadValida,
  cuerpoDeSintesis,
  claveDeCache,
};
