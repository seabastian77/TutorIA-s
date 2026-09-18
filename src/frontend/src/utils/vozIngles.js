// Escoge qué voz del navegador lee en voz alta: de mujer y la más clara que haya

const VOCES_MUJER = [
  // inglés
  "zira", "aria", "jenny", "michelle", "ana", "eva", "sonia", "libby", "maisie",
  "hazel", "catherine", "linda", "susan", "samantha", "ava", "allison", "nicky",
  "karen", "moira", "tessa", "fiona", "serena", "kate", "martha", "joanna",
  "salli", "kimberly", "amy", "emma", "clara", "nova",
  // español
  "sabina", "helena", "laura", "paulina", "monica", "mónica", "esperanza",
  "elvira", "dalia", "ximena", "lupe", "salome", "salomé", "camila", "sofia",
  "sofía", "elena", "isabela", "marisol", "yolanda", "paloma", "abril",
  "female", "mujer",
];

const VOCES_HOMBRE = [
  // inglés
  "david", "mark", "george", "guy", "daniel", "alex", "fred", "tom", "thomas",
  "ryan", "james", "aaron", "arthur", "oliver", "gordon", "rishi", "brandon",
  "christopher", "eric", "roger", "steffan",
  // español
  "pablo", "jorge", "raul", "raúl", "diego", "alvaro", "álvaro", "carlos",
  "miguel", "juan", "dario", "darío", "gonzalo", "lorenzo", "liberto", "male", "hombre",
];

// Los motores nuevos (neural, natural, en la nube) se entienden mucho mejor
// que las voces viejas del sistema
const MOTORES_CLAROS = ["natural", "neural", "online", "premium", "enhanced", "google", "siri"];

// Variantes preferidas de cada idioma: la primera pesa más
const PREFERIDAS = { en: ["en-us", "en-gb"], es: ["es-us", "es-mx", "es-es"] };

/** Dice si el nombre de la voz aparece en una lista de pistas. */
function nombreContiene(voz, pistas) {
  const nombre = String((voz && voz.name) || "").toLowerCase();
  return pistas.some((p) => nombre.includes(p));
}

/** Puntúa una voz para un idioma: premia que sea de mujer y que suene clara. */
function puntajeDeVoz(voz, idioma) {
  const lengua = String((voz && voz.lang) || "").toLowerCase().replace("_", "-");
  const raiz = String(idioma || "en").toLowerCase();
  if (!lengua.startsWith(raiz)) return null;

  let puntaje = 0;
  if (voz.gender === "female") puntaje += 120;
  if (nombreContiene(voz, VOCES_MUJER)) puntaje += 100;
  if (nombreContiene(voz, VOCES_HOMBRE)) puntaje -= 100;
  if (nombreContiene(voz, MOTORES_CLAROS)) puntaje += 40;
  if (voz.localService === false) puntaje += 15;

  const orden = (PREFERIDAS[raiz] || []).findIndex((v) => lengua.startsWith(v));
  puntaje += orden === -1 ? 3 : 10 - orden * 2;

  if (voz.default) puntaje += 1;
  return puntaje;
}

/** Devuelve la mejor voz del idioma pedido, o null si no hay ninguna. */
function elegirVoz(voces, idioma = "en") {
  let mejor = null;
  let mejorPuntaje = -Infinity;

  (Array.isArray(voces) ? voces : []).forEach((voz) => {
    const puntaje = puntajeDeVoz(voz, idioma);
    if (puntaje !== null && puntaje > mejorPuntaje) {
      mejor = voz;
      mejorPuntaje = puntaje;
    }
  });

  return mejor;
}

/** Atajo para lo que ya existía: la mejor voz inglesa. */
function elegirVozIngles(voces) {
  return elegirVoz(voces, "en");
}

let vocesEnCache = [];

/** Guarda la lista de voces apenas el navegador termina de cargarlas. */
function recordarVoces() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const lista = window.speechSynthesis.getVoices();
  if (lista && lista.length) vocesEnCache = lista;
}

/**
 * Deja lista una utterance con la voz escogida. El navegador a veces devuelve
 * la lista vacía la primera vez, así que aquí se cae al cache y se vuelve a pedir.
 */
function prepararVoz(utterance, voces, idioma = "en") {
  let lista = voces && voces.length ? voces : vocesEnCache;
  if (!lista.length && typeof window !== "undefined" && window.speechSynthesis) {
    recordarVoces();
    lista = vocesEnCache;
  }

  const voz = elegirVoz(lista, idioma);
  if (voz) {
    utterance.voice = voz;
    utterance.lang = voz.lang;
  }
  return voz;
}

const VozIngles = { elegirVoz, elegirVozIngles, prepararVoz, puntajeDeVoz, recordarVoces };

if (typeof window !== "undefined") {
  window.VozIngles = VozIngles;
  if (window.speechSynthesis) {
    recordarVoces();
    window.speechSynthesis.addEventListener("voiceschanged", recordarVoces);
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = VozIngles;
}
