// Lleva la conversación con Tuti: arma la llamada a la IA y devuelve su respuesta

const Groq = require("groq-sdk");
const { instruccionesDeTuti, comoMensajes } = require("../utils/charlaMentor");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODELO = "openai/gpt-oss-120b";

// El plan gratis de Groq limita los tokens de salida por minuto. Tuti responde
// en dos o tres frases, así que este tope sobra y no choca con ese límite.
const MAX_TOKENS = 220;

/**
 * Manda la charla a la IA y devuelve lo que contesta Tuti.
 * El mensaje de sistema va siempre primero: el historial que llega del navegador
 * solo puede traer papeles de usuario o de asistente, nunca de sistema.
 */
async function responderCharla(estado, historial, enEspanol) {
  const mensajes = [
    { role: "system", content: instruccionesDeTuti(estado, enEspanol) },
    ...comoMensajes(historial),
  ];

  const respuesta = await groq.chat.completions.create({
    model: MODELO,
    messages: mensajes,
    max_tokens: MAX_TOKENS,
    temperature: 0.9,
  });

  return (respuesta.choices[0].message.content || "").trim();
}

module.exports = { responderCharla, MAX_TOKENS, MODELO };
