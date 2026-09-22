// Pide el audio a las voces de Google Cloud, con caché para no pagar dos veces

const { reportarError } = require("../utils/errores");
const { cuerpoDeSintesis, claveDeCache, limpiarTexto } = require("../utils/vozGoogle");

const API = "https://texttospeech.googleapis.com/v1/text:synthesize";
const ESPERA_MS = 15000;
const CACHE_MAXIMO = 300; // frases distintas guardadas en memoria

const cache = new Map();
let nombresDeVozSirven = true;

/** Dice si la app tiene con qué usar las voces de Google. */
function vozGoogleConfigurada() {
  return !!process.env.GOOGLE_TTS_API_KEY;
}

/** Guarda en el caché sin dejarlo crecer sin fin. */
function guardarEnCache(clave, audio) {
  if (cache.size >= CACHE_MAXIMO) cache.delete(cache.keys().next().value);
  cache.set(clave, audio);
}

/** Dice si el error viene del nombre de la voz y no de otra cosa. */
function vozNoExiste(estado, detalle) {
  const texto = String(detalle || "").toLowerCase();
  return estado === 400 && (texto.includes("voice") || texto.includes("name"));
}

async function pedirAudio(cuerpo) {
  const corte = AbortSignal.timeout ? AbortSignal.timeout(ESPERA_MS) : undefined;
  const resp = await fetch(`${API}?key=${encodeURIComponent(process.env.GOOGLE_TTS_API_KEY)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
    signal: corte,
  });

  const detalle = resp.ok ? null : (await resp.text().catch(() => "")).slice(0, 300);
  return { ok: resp.ok, estado: resp.status, detalle, datos: resp.ok ? await resp.json() : null };
}

/**
 * Devuelve el audio en base64, o null si no se pudo. Nunca revienta hacia
 * arriba: si Google falla, el navegador lee con su propia voz y la app sigue.
 */
async function sintetizar(texto, idioma, velocidad) {
  if (!vozGoogleConfigurada() || !limpiarTexto(texto)) return null;

  const clave = claveDeCache(texto, idioma, velocidad);
  if (cache.has(clave)) return cache.get(clave);

  try {
    let r = await pedirAudio(cuerpoDeSintesis(texto, idioma, velocidad, nombresDeVozSirven));

    // Si el nombre de la voz ya no existe, se pide solo por idioma y género
    if (!r.ok && nombresDeVozSirven && vozNoExiste(r.estado, r.detalle)) {
      nombresDeVozSirven = false;
      r = await pedirAudio(cuerpoDeSintesis(texto, idioma, velocidad, false));
    }

    if (!r.ok) throw new Error(`Google TTS respondió ${r.estado}: ${r.detalle}`);

    const audio = r.datos && r.datos.audioContent;
    if (!audio) throw new Error("Google TTS no devolvió audio");

    guardarEnCache(clave, audio);
    return audio;
  } catch (error) {
    reportarError("No se pudo sintetizar la voz con Google", error);
    return null;
  }
}

module.exports = { sintetizar, vozGoogleConfigurada, cache };
