// Evaluación de ejercicios con imagen usando el modelo de visión de Groq

const Groq = require("groq-sdk");
const { instruccionAyuda } = require("./iaContenido");
const { extraerJSON } = require("../utils/medioFormato");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Groq retira versiones viejas sin avisar: se prueban en orden y se recuerda la
// que respondió, para que un cambio de catálogo no deje el módulo caído
const MODELOS_VISION = ["qwen/qwen3.8-27b", "qwen/qwen3.6-27b"];
let indiceModelo = 0;

// El plan gratis de Groq limita los tokens de salida por minuto: sin este tope
// rechaza la petición antes de mirar la foto
const MAX_TOKENS = 450;

/** Reconoce el 404 que Groq devuelve cuando el modelo ya no está en su catálogo. */
function modeloNoExiste(error) {
  const texto = String(error && error.message);
  return error && error.status === 404 && texto.includes("model_not_found");
}

async function mirarYResponder(urlImagen, prompt) {
  const mensajes = [
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: urlImagen } },
      ],
    },
  ];

  let ultimoError;

  for (let intento = 0; intento < MODELOS_VISION.length; intento++) {
    const modelo = MODELOS_VISION[(indiceModelo + intento) % MODELOS_VISION.length];
    try {
      const completion = await groq.chat.completions.create({
        model: modelo,
        messages: mensajes,
        max_tokens: MAX_TOKENS,
        temperature: 0.3,
      });
      indiceModelo = MODELOS_VISION.indexOf(modelo);
      return extraerJSON(completion.choices[0].message.content);
    } catch (error) {
      if (!modeloNoExiste(error)) throw error;
      ultimoError = error;
    }
  }

  throw ultimoError;
}

/** Compara lo que el estudiante describió contra lo que de verdad se ve en la foto. */
async function evaluarDescripcion({ urlImagen, descripcion, nivel, ayudaEs = true }) {
  const prompt = `Look carefully at this photo. A Spanish-speaking English learner at CEFR level ${nivel} was asked to describe what is happening in it.

They wrote: "${descripcion}"

Judge only what can actually be seen in the photo. Be encouraging but honest.

"precision" is 0-100: how well their description matches what is really in the image.
"acertado" lists at most 3 things they got right, a few words each.
"falto" lists at most 3 important things in the photo they did not mention, a few words each.
"correcciones" lists at most 3 of their grammar or vocabulary mistakes, each with the fixed version.
"frasesUtiles" gives three short natural English phrases at ${nivel} level they could have used.
${instruccionAyuda(ayudaEs)} That applies to "resumen" and to the "porque" of each correction.

Do not explain your reasoning. Reply with ONE JSON object and nothing else:
{
  "precision": 0,
  "resumen": "one short sentence of feedback",
  "acertado": ["..."],
  "falto": ["..."],
  "correcciones": [{"escribio": "...", "mejor": "...", "porque": "..."}],
  "frasesUtiles": ["...", "...", "..."]
}`;

  return mirarYResponder(urlImagen, prompt);
}

/** Revisa si el estudiante reaccionó bien a la situación que muestra la foto. */
async function evaluarReaccion({ urlImagen, reaccion, situacion, nivel, ayudaEs = true }) {
  const prompt = `This photo shows a real-life situation: ${situacion}

A Spanish-speaking English learner at CEFR level ${nivel} was asked what they would say in that moment.

They wrote: "${reaccion}"

Judge two things separately: whether their reaction makes sense for what is happening in the photo, and whether their English is correct.

"adecuada" is true when the reaction fits the situation, even if the English has mistakes.
"precision" is 0-100 considering both things together.
"correcciones" lists at most 3 of their grammar or vocabulary mistakes, each with the fixed version.
"mejorRespuesta" is one natural thing a native speaker would say in that exact moment, at ${nivel} level.
${instruccionAyuda(ayudaEs)} That applies to "resumen" and to the "porque" of each correction.

Do not explain your reasoning. Reply with ONE JSON object and nothing else:
{
  "adecuada": true,
  "precision": 0,
  "resumen": "one short sentence of feedback",
  "correcciones": [{"escribio": "...", "mejor": "...", "porque": "..."}],
  "mejorRespuesta": "..."
}`;

  return mirarYResponder(urlImagen, prompt);
}

module.exports = {
  MODELOS_VISION,
  modeloNoExiste,
  extraerJSON,
  evaluarDescripcion,
  evaluarReaccion,
};
