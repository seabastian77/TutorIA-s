// src/services/iaService.js
const Anthropic = require("@anthropic-ai/sdk");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODELO = "claude-haiku-4-5-20251001";

const HERRAMIENTA_PREGUNTA = {
  name: "generar_pregunta",
  description:
    "Genera una pregunta de opción múltiple para evaluar el nivel de inglés de un estudiante",
  input_schema: {
    type: "object",
    properties: {
      pregunta: { type: "string", description: "La pregunta en inglés" },
      opciones: {
        type: "array",
        items: { type: "string" },
        description: "Exactamente 4 opciones de respuesta",
      },
      respuestaCorrecta: {
        type: "integer",
        description: "Índice (0 a 3) de la opción correcta",
      },
      tema: {
        type: "string",
        description: "Tema gramatical o de vocabulario evaluado",
      },
    },
    required: ["pregunta", "opciones", "respuestaCorrecta", "tema"],
  },
};

async function generarPreguntaNivel(nivelObjetivo, temasVistos = []) {
  const prompt = `Eres un generador de preguntas para evaluar el nivel de inglés de un estudiante hispanohablante, según el Marco Común Europeo de Referencia (MCER).

Genera UNA sola pregunta de opción múltiple en inglés, apropiada para nivel ${nivelObjetivo}.
No repitas estos temas ya usados: ${temasVistos.length ? temasVistos.join(", ") : "ninguno todavía"}.

Usa la herramienta "generar_pregunta" para responder.`;

  const respuesta = await anthropic.messages.create({
    model: MODELO,
    max_tokens: 500,
    tools: [HERRAMIENTA_PREGUNTA],
    tool_choice: { type: "tool", name: "generar_pregunta" },
    messages: [{ role: "user", content: prompt }],
  });

  const bloqueHerramienta = respuesta.content.find(
    (b) => b.type === "tool_use",
  );
  return bloqueHerramienta.input;
}

module.exports = { generarPreguntaNivel };
