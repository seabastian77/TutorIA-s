// Voz en inglés que corre dentro del servidor (Piper con sherpa-onnx): gratis y igual para todos los estudiantes

const fs = require("fs");
const { rutasVoz, vozDescargada } = require("../utils/descargaVoz");
const { limpiarTexto, velocidadValida } = require("../utils/vozGoogle");
const { reportarError } = require("../utils/errores");

const KBPS_MP3 = 48; // voz hablada en mono: se oye clara y pesa poco
const CACHE_MAXIMO_BYTES = 40 * 1024 * 1024;
const MAX_EN_ESPERA = 8; // con más frases en fila, el navegador lee con su voz en vez de esperar

let sherpa;
try {
  sherpa = require("sherpa-onnx-node");
} catch (error) {
  sherpa = null;
}

let lame = null;
let motor = null;
let cola = Promise.resolve();
let enEspera = 0;
const cache = new Map();
const pendientes = new Map(); // la misma frase pedida a la vez por varios se genera una sola vez
let bytesEnCache = 0;

/** Dice si el servidor puede leer en inglés con su propia voz. */
function vozPiperLista() {
  return Boolean(sherpa) && vozDescargada();
}

/** Carga el modelo una sola vez, sin frenar el servidor mientras tanto. */
async function obtenerMotor() {
  if (!motor) {
    const r = rutasVoz();
    motor = sherpa.OfflineTts.createAsync({
      model: { vits: { model: r.modelo, tokens: r.tokens, dataDir: r.datos }, numThreads: 2, provider: "cpu" },
      maxNumSentences: 2,
    }).catch((error) => {
      motor = null;
      throw error;
    });
  }
  return motor;
}

/** Deja el modelo cargado desde el arranque para que la primera frase no se demore. */
function precargarVoz() {
  if (vozPiperLista()) obtenerMotor().catch((error) => reportarError("No se pudo cargar la voz del servidor", error));
}

/** Convierte las muestras del motor a MP3 para que el audio pese siete veces menos que un WAV. */
async function aMp3(muestras, frecuencia) {
  // La librería se publica como script suelto para CommonJS; se evalúa una vez y se guarda
  if (!lame) {
    const codigo = fs.readFileSync(require.resolve("@breezystack/lamejs"), "utf8");
    lame = new Function(`${codigo}; return lamejs;`)();
  }
  const { Mp3Encoder } = lame;
  const pcm = new Int16Array(muestras.length);
  for (let i = 0; i < muestras.length; i += 1) {
    pcm[i] = Math.max(-1, Math.min(1, muestras[i])) * 32767;
  }

  const codificador = new Mp3Encoder(1, frecuencia, KBPS_MP3);
  const partes = [];
  for (let i = 0, n = 0; i < pcm.length; i += 1152, n += 1) {
    const trozo = codificador.encodeBuffer(pcm.subarray(i, i + 1152));
    if (trozo.length) partes.push(Buffer.from(trozo));
    // Cada tanto se suelta el hilo para que las demás peticiones del servidor no se congelen
    if (n % 40 === 39) await new Promise((listo) => setImmediate(listo));
  }
  const final = codificador.flush();
  if (final.length) partes.push(Buffer.from(final));
  return Buffer.concat(partes);
}

/** Guarda en el caché sin pasar del tope de memoria. */
function guardarEnCache(clave, audio) {
  if (cache.has(clave)) {
    bytesEnCache -= cache.get(clave).length;
    cache.delete(clave);
  }
  while (cache.size && bytesEnCache + audio.length > CACHE_MAXIMO_BYTES) {
    const [vieja, valor] = cache.entries().next().value;
    cache.delete(vieja);
    bytesEnCache -= valor.length;
  }
  cache.set(clave, audio);
  bytesEnCache += audio.length;
}

/** Devuelve el audio en MP3 y base64, o null si no se pudo. Las frases se leen de una en una. */
async function sintetizarPiper(texto, velocidad) {
  const limpio = limpiarTexto(texto);
  if (!vozPiperLista() || !limpio) return null;

  const ritmo = velocidadValida(velocidad);
  const clave = `${ritmo}|${limpio}`;
  if (cache.has(clave)) return cache.get(clave);
  if (pendientes.has(clave)) return pendientes.get(clave);
  if (enEspera >= MAX_EN_ESPERA) return null;

  enEspera += 1;
  const trabajo = cola.then(async () => {
    const tts = await obtenerMotor();
    const generado = await tts.generateAsync({ text: limpio, sid: 0, speed: ritmo });
    const mp3 = (await aMp3(generado.samples, generado.sampleRate)).toString("base64");
    guardarEnCache(clave, mp3);
    return mp3;
  });
  cola = trabajo.catch(() => {});

  const resultado = trabajo
    .catch((error) => {
      reportarError("No se pudo leer con la voz del servidor", error);
      return null;
    })
    .finally(() => {
      enEspera -= 1;
      pendientes.delete(clave);
    });
  pendientes.set(clave, resultado);
  return resultado;
}

module.exports = { vozPiperLista, precargarVoz, sintetizarPiper, aMp3, cache };
