// Evaluación de ejercicios con imagen usando el modelo de visión de Groq

const Groq = require("groq-sdk");
const { instruccionAyuda } = require("./iaContenido");
const { extraerJSON } = require("../utils/medioFormato");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODELO_VISION = "qwen/qwen3.6-27b";

async function mirarYResponder(urlImagen, prompt) {
  const completion = await groq.chat.completions.create({
    model: MODELO_VISION,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: urlImagen } },
        ],
      },
    ],
  });

  return extraerJSON(completion.choices[0].message.content);
}

/** Compara lo que el estudiante describió contra lo que de verdad se ve en la foto. */
async function evaluarDescripcion({ urlImagen, descripcion, nivel, ayudaEs = true }) {
  const prompt = `Look carefully at this photo. A Spanish-speaking English learner at CEFR level ${nivel} was asked to describe what is happening in it.

They wrote: "${descripcion}"

Judge only what can actually be seen in the photo. Be encouraging but honest.

"precision" is 0-100: how well their description matches what is really in the image.
"acertado" lists what they got right. "falto" lists important things in the photo they did not mention.
"correcciones" lists their grammar or vocabulary mistakes, each with the fixed version.
"frasesUtiles" gives three natural English phrases at ${nivel} level they could have used for this photo.
${instruccionAyuda(ayudaEs)} That applies to "resumen" and to the "porque" of each correction.

Reply ONLY with valid JSON:
{
  "precision": 0,
  "resumen": "one or two sentences of feedback",
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
"correcciones" lists their grammar or vocabulary mistakes, each with the fixed version.
"mejorRespuesta" is one natural thing a native speaker would say in that exact moment, at ${nivel} level.
${instruccionAyuda(ayudaEs)} That applies to "resumen" and to the "porque" of each correction.

Reply ONLY with valid JSON:
{
  "adecuada": true,
  "precision": 0,
  "resumen": "one or two sentences of feedback",
  "correcciones": [{"escribio": "...", "mejor": "...", "porque": "..."}],
  "mejorRespuesta": "..."
}`;

  return mirarYResponder(urlImagen, prompt);
}

module.exports = {
  MODELO_VISION,
  extraerJSON,
  evaluarDescripcion,
  evaluarReaccion,
};
