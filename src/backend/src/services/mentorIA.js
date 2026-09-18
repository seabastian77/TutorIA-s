// Redacta el consejo del día con la IA, a partir del estado real del estudiante

const Groq = require("groq-sdk");
const { instruccionVariedad } = require("../utils/variedad");
const { parametroNoSoportado } = require("./charlaIA");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODELO = "openai/gpt-oss-120b";

// Este modelo razona antes de contestar y ese razonamiento gasta del mismo
// presupuesto: con un tope corto el consejo sale vacío. El cupo es holgado y se
// le pide razonar poco, que para dos frases es de sobra.
const MAX_TOKENS = 500;
const ESFUERZO = "low";

/** Arma el retrato del estudiante que la IA necesita para no hablar en genérico. */
function retratoDelEstudiante(estado) {
  const partes = [
    `CEFR level: ${estado.nivel || "not measured yet"}`,
    `current streak: ${estado.racha} days`,
    `activities today: ${estado.actividadesHoy} of ${estado.metaDiaria}`,
    `vocabulary cards due: ${estado.palabrasPorRepasar}`,
    `words they keep failing: ${estado.palabrasDebiles}`,
  ];
  return partes.join(", ");
}

/** Pide a la IA un consejo breve y personal; cualquier fallo lo resuelve quien la llama. */
async function generarConsejoDelDia(estado, enEspanol) {
  const idioma = enEspanol
    ? "Write in Spanish, using the informal 'tú'."
    : "Write in simple English.";

  const prompt = `You are a warm, concrete English-learning coach speaking to one student.

This is the student right now: ${retratoDelEstudiante(estado)}.

Give ONE piece of advice they can act on today. ${idioma}
${instruccionVariedad()}

Rules:
- Maximum 2 sentences, under 30 words total.
- Be specific to their numbers above. Never say "keep practicing" or "you can do it".
- No greetings, no emoji, no quotation marks.
- Return ONLY the advice text, nothing else.`;

  const pedir = (extras) =>
    groq.chat.completions.create({
      model: MODELO,
      messages: [{ role: "user", content: prompt }],
      max_tokens: MAX_TOKENS,
      temperature: 1,
      ...extras,
    });

  let respuesta;
  try {
    respuesta = await pedir({ reasoning_effort: ESFUERZO });
  } catch (error) {
    if (!parametroNoSoportado(error)) throw error;
    respuesta = await pedir({});
  }

  const eleccion = (respuesta.choices && respuesta.choices[0]) || {};
  const texto = ((eleccion.message && eleccion.message.content) || "")
    .trim()
    .replace(/^["']|["']$/g, "");

  // El motivo del corte distingue "se quedó sin tokens" de "no dijo nada"
  if (!texto) {
    throw new Error(
      `La IA devolvió un consejo vacío (finish_reason: ${eleccion.finish_reason || "desconocido"})`,
    );
  }
  return texto;
}

module.exports = { generarConsejoDelDia, retratoDelEstudiante, MAX_TOKENS };
