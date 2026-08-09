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

  return JSON.parse(respuesta.choices[0].message.content);
}

async function generarPreguntaEscrita(nivelObjetivo, temasVistos = []) {
  const prompt = `Genera un ejercicio de completar frase en inglés para nivel ${nivelObjetivo} (MCER), pensado para un estudiante hispanohablante.
No repitas estos temas: ${temasVistos.length ? temasVistos.join(", ") : "ninguno todavía"}.

Responde SOLO con JSON: {"frase": "oración con ___ donde va la palabra o frase que el estudiante debe completar", "tema": "tema evaluado"}`;

  const respuesta = await groq.chat.completions.create({
    model: MODELO,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return JSON.parse(respuesta.choices[0].message.content);
}

async function evaluarRespuestaEscrita(frase, respuestaUsuario) {
  const prompt = `Eres un profesor de inglés evaluando la respuesta de un estudiante hispanohablante.

Ejercicio: "${frase}"
Respuesta del estudiante: "${respuestaUsuario}"

Evalúa si la respuesta es gramaticalmente correcta y tiene sentido (acepta variaciones válidas, no exijas una única respuesta exacta).

Responde SOLO con JSON: {"correcto": true o false, "explicacion": "explicación breve en español de por qué está bien o mal, y cuál sería una respuesta correcta si falló"}`;

  const respuesta = await groq.chat.completions.create({
    model: MODELO,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return JSON.parse(respuesta.choices[0].message.content);
}

// ============================================================
// Diagnóstico Inmersivo — historia adaptativa
// ============================================================

async function generarEscenaDiagnostico({
  nivel,
  turno,
  historialNarrativo,
  habilidad,
}) {
  const contexto = historialNarrativo.slice(-2).join(" ");
  const tipoPregunta = habilidad === "fluidez" ? "abierta" : "opcion_multiple";

  const prompt = `Eres un diseñador de historias interactivas para aprender inglés.
Vas a continuar una historia corta e inmersiva en la que el estudiante practica inglés nivel ${nivel} del MCER.

Contexto de la historia hasta ahora (puede estar vacío si es el inicio): "${contexto}"

Esta es la escena número ${turno + 1}. Debe enfocarse en la habilidad: ${habilidad}.
Tipo de pregunta requerido: ${tipoPregunta}.

Responde ÚNICAMENTE con un JSON válido, sin texto adicional, con esta forma exacta:

${
  tipoPregunta === "opcion_multiple"
    ? `{
  "narrativa": "2-3 líneas en inglés continuando la historia, apropiadas para nivel ${nivel}",
  "tipo": "opcion_multiple",
  "pregunta": "Pregunta en inglés relacionada con la narrativa, enfocada en ${habilidad}",
  "opciones": ["opción A", "opción B", "opción C", "opción D"],
  "respuestaCorrecta": 0,
  "tema": "palabra clave del tema de esta escena"
}`
    : `{
  "narrativa": "2-3 líneas en inglés continuando la historia, apropiadas para nivel ${nivel}",
  "tipo": "abierta",
  "pregunta": "Pregunta o instrucción en inglés que el estudiante debe responder escribiendo una frase en inglés, enfocada en ${habilidad}",
  "opciones": null,
  "respuestaCorrecta": null,
  "tema": "palabra clave del tema de esta escena"
}`
}`;

  const completion = await groq.chat.completions.create({
    model: MODELO,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return JSON.parse(completion.choices[0].message.content);
}

async function evaluarRespuestaAbierta({ pregunta, respuestaUsuario, nivel }) {
  const prompt = `Eres un tutor de inglés amigable evaluando a un estudiante de nivel ${nivel} del MCER.

Pregunta que se le hizo (en inglés): "${pregunta}"
Respuesta del estudiante (en inglés): "${respuestaUsuario}"

Evalúa la respuesta considerando gramática, vocabulario y qué tan bien responde a la pregunta,
siendo razonable con el nivel ${nivel} (no exijas nivel C2 a un A2).

Responde ÚNICAMENTE con un JSON válido, sin texto adicional, con esta forma exacta:
{
  "puntuacion": 75,
  "feedback": "Frase corta y amigable EN ESPAÑOL explicando qué estuvo bien o qué se puede mejorar, como lo haría un tutor humano",
  "correccionSugerida": "La frase del estudiante corregida en inglés (si tenía errores), o null si estaba perfecta"
}

La puntuación va de 0 a 100 según qué tan bien resuelto está para su nivel.`;

  const completion = await groq.chat.completions.create({
    model: MODELO,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return JSON.parse(completion.choices[0].message.content);
}

async function generarResumenFinal({ nivel, promedios }) {
  const prompt = `Eres un tutor de inglés escribiendo el resumen final de un diagnóstico de nivel para un estudiante hispanohablante.

Nivel MCER estimado: ${nivel}
Desempeño por habilidad (0 a 100): vocabulario ${promedios.vocabulario}, gramática ${promedios.gramatica}, comprensión ${promedios.comprension}, fluidez escrita ${promedios.fluidez}.

Escribe EN ESPAÑOL un párrafo corto (máximo 4 frases), cercano y motivador, tipo tutor humano,
que le explique al estudiante qué tan bien se defiende hoy en inglés en la vida real
(no repitas los números, tradúcelos en ejemplos concretos: "puedes sobrevivir un viaje",
"te cuesta debatir temas complejos", etc.), destacando su fortaleza principal y en qué debería enfocarse ahora.

Responde ÚNICAMENTE con el texto del párrafo, sin comillas ni JSON.`;

  const completion = await groq.chat.completions.create({
    model: MODELO,
    messages: [{ role: "user", content: prompt }],
  });

  return completion.choices[0].message.content.trim();
}

module.exports = {
  generarPreguntaNivel,
  generarPreguntaEscrita,
  evaluarRespuestaEscrita,
  generarEscenaDiagnostico,
  evaluarRespuestaAbierta,
  generarResumenFinal,
};
