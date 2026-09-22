// Hace de Google Text-to-Speech para las pruebas locales.
// Solo se carga a mano al arrancar el servidor de pruebas, nunca en producción.

const MODO = process.env.STUB_TTS || "ok";
const fetchReal = global.fetch;

// Un mp3 mínimo de verdad, para que el navegador no rechace el audio
const MP3_CORTO =
  "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQxAAAAAAAAAAAAAAAAAAAAAAA" +
  "SW5mbwAAAA8AAAACAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA";

global.fetch = async function (url, opciones) {
  const texto = typeof url === "string" ? url : (url && url.url) || "";

  if (texto.startsWith("https://texttospeech.googleapis.com")) {
    global.__ttsLlamadas = (global.__ttsLlamadas || 0) + 1;
    const cuerpo = JSON.parse(opciones.body);
    global.__ttsUltimo = cuerpo;

    if (MODO === "falla") {
      return { ok: false, status: 500, text: async () => "algo se rompió" };
    }
    // Como cuando el nombre de la voz deja de existir en el catálogo
    if (MODO === "voz-vieja" && cuerpo.voice.name) {
      return { ok: false, status: 400, text: async () => "Invalid voice name" };
    }
    return { ok: true, status: 200, json: async () => ({ audioContent: MP3_CORTO }) };
  }

  return fetchReal.apply(this, arguments);
};
