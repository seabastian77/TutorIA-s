// Frases reales de Tatoeba (CC BY 2.0 FR) para el dictado y para los ejemplos del vocabulario

const { frases: CRUDAS } = require("../data/frases-tatoeba.json");
const { palabrasDe, baseDe, NIVELES } = require("./cefr");

const FRASES = CRUDAS.map(([en, es, nivel, dictado, idEn, autorEn, idEs, autorEs]) => ({
  en, es, nivel, dictado: Boolean(dictado), idEn, autorEn, idEs, autorEs,
}));

// Frases de dictado agrupadas por nivel
const DICTADO = Object.fromEntries(NIVELES.map((n) => [n, FRASES.filter((f) => f.dictado && f.nivel === n)]));

// Índice palabra base -> frases que la usan, para buscar ejemplos rápido
const INDICE = new Map();
FRASES.forEach((f, i) => {
  for (const p of new Set(palabrasDe(f.en))) {
    const base = baseDe(p) || p;
    if (!INDICE.has(base)) INDICE.set(base, []);
    const lista = INDICE.get(base);
    if (lista.at(-1) !== i) lista.push(i);
  }
});

/** El crédito que pide la licencia: autor y enlace de la frase en inglés y de su traducción. */
function credito(f) {
  return {
    texto: `Tatoeba #${f.idEn} (${f.autorEn}) & #${f.idEs} (${f.autorEs}) · CC BY 2.0 FR`,
    enlace: `https://tatoeba.org/en/sentences/show/${f.idEn}`,
  };
}

/**
 * Una frase de dictado del nivel pedido que la persona no haya visto hace poco.
 * Devuelve null para C1 y C2: la lista CEFR-J llega hasta B2 y ahí sigue la IA.
 */
function fraseDeDictado(nivel, yaVistas = new Set(), azar = Math.random) {
  const grupo = DICTADO[nivel];
  if (!grupo || !grupo.length) return null;
  const nuevas = grupo.filter((f) => !yaVistas.has(f.en));
  const opciones = nuevas.length ? nuevas : grupo;
  return opciones[Math.floor(azar() * opciones.length)];
}

/** Un ejemplo real para una palabra del vocabulario: el más corto y más fácil que la contenga. */
function ejemploPara(palabra) {
  if (!palabra) return null;
  const partes = palabrasDe(palabra);
  if (!partes.length) return null;

  // Para expresiones ("alarm clock") se exige que aparezcan todas sus palabras, y juntas
  const buscada = String(palabra).trim().toLowerCase();
  const principal = partes.reduce((a, b) => (b.length > a.length ? b : a));
  const indices = INDICE.get(baseDe(principal) || principal) || [];

  // Si hay una frase con la palabra tal cual la escribió ("went", no "go"), va primero
  const exacta = new RegExp(`\\b${buscada.replace(/[^a-z' ]/g, "")}\\b`);

  let mejor = null;
  for (const i of indices) {
    const f = FRASES[i];
    const texto = f.en.toLowerCase();
    if (partes.length > 1 && !texto.includes(buscada)) continue;
    const puntaje = (exacta.test(texto) ? 0 : 100) + NIVELES.indexOf(f.nivel) * 20 + f.en.split(/\s+/).length;
    if (!mejor || puntaje < mejor.puntaje) mejor = { f, puntaje };
  }
  return mejor ? mejor.f : null;
}

module.exports = { FRASES, DICTADO, credito, fraseDeDictado, ejemploPara };
