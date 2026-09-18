const Module = require("module");
const original = Module.prototype.require;

const MODO = process.env.STUB_MODO || "ok";

// Un modelo que varía de verdad: escoge de un pozo grande y respeta lo que se le pide evitar
const POZO = "planet bridge silver forest candle market anchor breeze copper daisy ember"
  .concat(" falcon glacier harbour ivory jungle kettle lantern meadow nectar orchard")
  .concat(" pebble quiver ribbon saddle timber velvet walnut willow yonder zephyr")
  .split(/\s+/)
  .filter(Boolean)
  .map((p) => ({ palabra: p, traduccion: "trad-" + p }));

function palabrasVariadas(prompt) {
  const bloqueado = (prompt.match(/Do NOT use any of these words: ([^.]*)/) || [])[1] || "";
  const fuera = bloqueado.split(",").map((p) => p.trim().toLowerCase()).filter(Boolean);
  const libres = POZO.filter((p) => !fuera.includes(p.palabra));
  return libres.sort(() => Math.random() - 0.5).slice(0, 8);
}

const EVALUACION_DESCRIBIR = {
  precision: 72,
  resumen: "Vas bien: entendiste la escena, pero te faltó el detalle del fondo.",
  acertado: ["You saw the man cooking", "You used the present continuous"],
  falto: ["The child sitting at the table", "The open window"],
  correcciones: [
    { escribio: "he is cook", mejor: "he is cooking", porque: "Falta el -ing del presente continuo" },
  ],
  frasesUtiles: ["He's chopping vegetables", "There's steam coming off the pan", "The kitchen looks busy"],
};

const EVALUACION_REACCIONAR = {
  adecuada: true,
  precision: 84,
  resumen: "Tu reacción encaja con la situación; solo cuida el artículo.",
  correcciones: [
    { escribio: "I want coffee", mejor: "I'd like a coffee", porque: "Suena más natural y educado al pedir" },
  ],
  mejorRespuesta: "Hi, could I get a flat white to go, please?",
};

// Fotos y videos falsos con la misma forma que devuelve Pexels
function respuestaPexels(url) {
  if (url.includes("/videos/search")) {
    return {
      videos: Array.from({ length: 10 }, (_, i) => ({
        id: 9000 + i,
        image: `https://images.example.com/video${i}.jpg`,
        user: { name: `Camarógrafo ${i}`, url: `https://www.pexels.com/@cam${i}` },
        video_files: [
          { file_type: "video/mp4", width: 640, height: 360, link: `https://videos.example.com/v${i}-640.mp4` },
          { file_type: "video/mp4", width: 1920, height: 1080, link: `https://videos.example.com/v${i}-1920.mp4` },
        ],
      })),
    };
  }

  return {
    photos: Array.from({ length: 12 }, (_, i) => ({
      id: 100 + i,
      photographer: `Fotógrafo ${i}`,
      photographer_url: `https://www.pexels.com/@foto${i}`,
      src: {
        original: `https://images.example.com/foto${i}-original.jpg`,
        large: `http://localhost:8080/placeholder.png`,
        medium: `https://images.example.com/foto${i}-medium.jpg`,
      },
    })),
  };
}

const fetchReal = global.fetch;

global.fetch = async function (url, opciones) {
  const texto = typeof url === "string" ? url : url.url;

  if (texto && texto.startsWith("https://api.pexels.com")) {
    if (MODO === "pexels-caido") {
      return { ok: false, status: 503, json: async () => ({}) };
    }
    return { ok: true, status: 200, json: async () => respuestaPexels(texto) };
  }

  return fetchReal.apply(this, arguments);
};

Module.prototype.require = function (nombre) {
  if (nombre === "groq-sdk") {
    return class GroqFalso {
      constructor() {
        this.chat = {
          completions: {
            create: async ({ messages }) => {
              if (MODO === "falla") throw new Error("IA caída (prueba)");

              const contenido = messages[0].content;

              // Las peticiones de visión mandan un arreglo con texto e imagen
              if (Array.isArray(contenido)) {
                const prompt = contenido.find((p) => p.type === "text").text;
                const evaluacion = prompt.includes("what they would say")
                  ? EVALUACION_REACCIONAR
                  : EVALUACION_DESCRIBIR;
                if (MODO === "limite") {
                  const e = new Error('429 Request too large for model');
                  e.status = 429;
                  throw e;
                }
                const doble = "```json\n" + JSON.stringify(evaluacion) + "\n```\n{\"precision\": 99}\nEspero que sirva.";
                return { choices: [{ message: { content: doble } }] };
              }

              // La charla con Tuti: el sistema va primero y el historial detrás
              if (contenido.includes("You are Tuti")) {
                if (MODO === "limite") { const e = new Error("429 rate limit"); e.status = 429; throw e; }
                // Como el modelo real cuando se le acaban los tokens razonando
                if (MODO === "vacio") {
                  return { choices: [{ message: { content: "" }, finish_reason: "length" }] };
                }
                const pide = [...messages].reverse().find((m) => m.role === "user");
                if (pide && /frases|phrases/i.test(pide.content || "")) {
                  return { choices: [{ message: { content:
                    "Para pedir en un café te sirven estas:\n" +
                    "Could I get a coffee, please? - ¿Me das un café, por favor?\n" +
                    "To go, please. - Para llevar, por favor.\n" +
                    "How much is it? - ¿Cuánto es?\n" +
                    "Keep the change. - Quédate con el cambio." } }] };
                }
                const ultimo = [...messages].reverse().find((m) => m.role === "user");
                return {
                  choices: [
                    {
                      message: {
                        content:
                          `Te entiendo con lo de "${(ultimo && ultimo.content) || ""}". ` +
                          "Vas bien, y con tus 6 tarjetas vencidas Vocabulary te va a rendir hoy.",
                      },
                    },
                  ],
                };
              }

              if (contenido.includes("English-learning coach")) {
                if (MODO === "limite") { const e = new Error("429 rate limit"); e.status = 429; throw e; }
                return { choices: [{ message: { content: '"Tus 6 tarjetas vencidas son de verbos: repásalas antes de la práctica de hoy."' } }] };
              }

              if (contenido.includes("word game")) {
                return { choices: [{ message: { content: JSON.stringify({ palabras: palabrasVariadas(contenido) }) } }] };
              }

              if (contenido.includes("scene") || contenido.includes("script")) {
                return {
                  choices: [
                    {
                      message: {
                        content: JSON.stringify({
                          titulo: "The Coffee Order",
                          situacion: "Two friends meet at a cafe before work",
                          lineas: ["Hi, what can I get you?", "A flat white, please."],
                        }),
                      },
                    },
                  ],
                };
              }

              return { choices: [{ message: { content: "{}" } }] };
            },
          },
        };
      }
    };
  }
  return original.apply(this, arguments);
};
