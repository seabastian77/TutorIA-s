// src/services/iaService.js
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODELO = "openai/gpt-oss-120b";

async function generarPreguntaNivel(nivelObjetivo, temasVistos = []) {
  const prompt = `Eres un generador de preguntas para evaluar el nivel de inglés de un estudiante hispanohablante, según el Marco Común Europeo de Referencia (MCER).

Genera UNA sola pregunta de opción múltiple en inglés, apropiada para nivel ${nivelObjetivo}.
Debe tener exactamente 4 opciones, y "respuestaCorrecta" es el índice (0 a 3) de la opción correcta.
No repitas estos temas ya usados: ${temasVistos.length ? temasVistos.join(", ") : "ninguno todavía"}.

Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, con este formato exacto:
{"pregunta": "...", "opciones": ["...", "...", "...", "..."], "respuestaCorrecta": 0, "tema": "..."}`;

  const respuesta = await groq.chat.completions.create({
    model: MODELO,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const texto = respuesta.choices[0].message.content;
  return JSON.parse(texto);
}

module.exports = { generarPreguntaNivel };
