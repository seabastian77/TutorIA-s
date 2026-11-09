// Limpia y valida la palabra que el estudiante toca, y guarda en memoria lo ya traducido
const { nivelDePalabra } = require("./cefr");

const PALABRA_INGLESA = /^[A-Za-z]+(?:['’-][A-Za-z]+)*$/;
const LARGO_PALABRA = 40;
const LARGO_FRASE = 300;

/** Quita espacios y signos de los bordes; devuelve "" si no llega texto. */
function limpiarPalabra(valor) {
  if (typeof valor !== "string") return "";
  return valor
    .trim()
    .replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "")
    .slice(0, LARGO_PALABRA);
}

/** Dice si lo tocado es una palabra en inglés: letras, con apóstrofo o guion por dentro. */
function esPalabraInglesa(palabra) {
  return typeof palabra === "string" && palabra.length >= 1 && PALABRA_INGLESA.test(palabra);
}

/** Deja la frase de contexto en una sola línea y con un largo razonable. */
function limpiarFrase(valor) {
  if (typeof valor !== "string") return "";
  return valor.replace(/\s+/g, " ").trim().slice(0, LARGO_FRASE);
}

/** Asegura que la respuesta de la IA traiga textos cortos y el nivel CEFR real de la palabra. */
function normalizarTraduccion(resultado, palabra) {
  const texto = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const base = texto(resultado && resultado.palabra, LARGO_PALABRA) || palabra;
  return {
    palabra: base,
    traduccion: texto(resultado && resultado.traduccion, 150),
    tipo: texto(resultado && resultado.tipo, 24).toLowerCase(),
    ejemplo: texto(resultado && resultado.ejemplo, 200),
    nivel: nivelDePalabra(base) || nivelDePalabra(palabra) || null,
  };
}

/** Caché pequeña con vencimiento: repetir un toque no vuelve a gastar la IA. */
function crearCacheTraducciones({ limite = 500, vidaMs = 12 * 60 * 60 * 1000 } = {}) {
  const entradas = new Map();

  return {
    async obtener(clave, producir) {
      const guardada = entradas.get(clave);
      if (guardada && Date.now() - guardada.hora < vidaMs) {
        entradas.delete(clave);
        entradas.set(clave, guardada);
        return guardada.promesa;
      }

      // La promesa se guarda de una vez para que dos toques seguidos compartan la misma consulta
      const promesa = Promise.resolve().then(producir);
      entradas.set(clave, { hora: Date.now(), promesa });
      if (entradas.size > limite) entradas.delete(entradas.keys().next().value);

      try {
        return await promesa;
      } catch (error) {
        entradas.delete(clave);
        throw error;
      }
    },
    get tamano() {
      return entradas.size;
    },
  };
}

/** Arma la llave de la caché: el sentido depende de la frase y del idioma de la ayuda. */
function claveTraduccion({ palabra, contexto, ayudaEs }) {
  return `${ayudaEs ? "es" : "en"}|${palabra.toLowerCase()}|${contexto.toLowerCase()}`;
}

module.exports = {
  limpiarPalabra,
  esPalabraInglesa,
  limpiarFrase,
  normalizarTraduccion,
  crearCacheTraducciones,
  claveTraduccion,
};
