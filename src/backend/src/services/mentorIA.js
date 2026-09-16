// Redacta el consejo del día con la IA, a partir del estado real del estudiante

const Groq = require("groq-sdk");
const { instruccionVariedad } = require("../utils/variedad");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODELO = "openai/gpt-oss-120b";

// El plan gratis de Groq limita los tokens de salida por minuto; el consejo es
// corto a propósito para no chocar con ese tope
const MAX_TOKENS = 160;

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

  const respuesta = await groq.chat.completions.create({
    model: MODELO,
    messages: [{ role: "user", content: prompt }],
    max_tokens: MAX_TOKENS,
    temperature: 1,
  });

  return (respuesta.choices[0].message.content || "").trim().replace(/^["']|["']$/g, "");
}

module.exports = { generarConsejoDelDia, retratoDelEstudiante, MAX_TOKENS };
