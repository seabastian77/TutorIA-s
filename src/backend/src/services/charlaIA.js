// Lleva la conversación con Tuti: arma la llamada a la IA y devuelve su respuesta

const Groq = require("groq-sdk");
const { instruccionesDeTuti, comoMensajes } = require("../utils/charlaMentor");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODELO = "openai/gpt-oss-120b";

// Este modelo razona antes de contestar y ese razonamiento gasta del mismo
// presupuesto. Con un tope corto se le acaban los tokens pensando y el texto
// sale vacío, así que el cupo es holgado y se le pide razonar poco.
const MAX_TOKENS = 800;
const ESFUERZO = "low";

/** Hace la llamada, con los parámetros extra que se le quieran pasar. */
function pedirRespuesta(mensajes, extras) {
  return groq.chat.completions.create({
    model: MODELO,
    messages: mensajes,
    max_tokens: MAX_TOKENS,
    temperature: 0.9,
    ...extras,
  });
}

/** Dice si el error viene de un parámetro que este modelo no acepta. */
function parametroNoSoportado(error) {
  const texto = String((error && error.message) || "").toLowerCase();
  return (
    error &&
    error.status === 400 &&
    (texto.includes("reasoning_effort") ||
      texto.includes("penalty") ||
      texto.includes("unsupported") ||
      texto.includes("not supported"))
  );
}

/**
 * Manda la charla a la IA y devuelve lo que contesta Tuti.
 * El mensaje de sistema va siempre primero: el historial que llega del navegador
 * solo puede traer papeles de usuario o de asistente, nunca de sistema.
 */
async function responderCharla(estado, historial, enEspanol, voz) {
  const mensajes = [
    { role: "system", content: instruccionesDeTuti(estado, enEspanol, voz) },
    ...comoMensajes(historial),
  ];

  let respuesta;
  try {
    respuesta = await pedirRespuesta(mensajes, {
      reasoning_effort: ESFUERZO,
      // Castiga repetir las mismas aperturas turno tras turno
      presence_penalty: 0.4,
      frequency_penalty: 0.3,
    });
  } catch (error) {
    // Si el catálogo cambia y deja de aceptar alguno, se reintenta sin adornos
    if (!parametroNoSoportado(error)) throw error;
    respuesta = await pedirRespuesta(mensajes, {});
  }

  const eleccion = (respuesta.choices && respuesta.choices[0]) || {};
  const texto = ((eleccion.message && eleccion.message.content) || "").trim();

  // El motivo del corte es lo que distingue "se quedó sin tokens" de "no dijo nada"
  if (!texto) {
    throw new Error(
      `La IA devolvió una respuesta vacía (finish_reason: ${eleccion.finish_reason || "desconocido"})`,
    );
  }
  return texto;
}

module.exports = { responderCharla, parametroNoSoportado, MAX_TOKENS, MODELO };
