const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Si este modelo llegara a dar error "not found", probar con
// 'gemini-3.5-flash-lite' o 'gemini-2.5-flash' en su lugar.
const MODELO = "gemini-3.6-flash";

const ESQUEMA_PREGUNTA = {
  type: "object",
  properties: {
    pregunta: { type: "string" },
    opciones: {
      type: "array",
      items: { type: "string" },
    },
    respuestaCorrecta: { type: "integer" },
    tema: { type: "string" },
  },
  required: ["pregunta", "opciones", "respuestaCorrecta", "tema"],
};

async function generarPreguntaNivel(nivelObjetivo, temasVistos = []) {
  const prompt = `Eres un generador de preguntas para evaluar el nivel de inglés de un estudiante hispanohablante, según el Marco Común Europeo de Referencia (MCER).

Genera UNA sola pregunta de opción múltiple en inglés, apropiada para nivel ${nivelObjetivo}.
Debe tener exactamente 4 opciones, y "respuestaCorrecta" es el índice (0 a 3) de la opción correcta.
No repitas estos temas ya usados: ${temasVistos.length ? temasVistos.join(", ") : "ninguno todavía"}.`;

  const respuesta = await ai.models.generateContent({
    model: MODELO,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: ESQUEMA_PREGUNTA,
    },
  });

  return JSON.parse(respuesta.text);
}

module.exports = { generarPreguntaNivel };
