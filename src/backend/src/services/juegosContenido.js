// Palabras para los minijuegos: primero la IA, y si falla una lista de respaldo

const Groq = require("groq-sdk");
const { barajar } = require("../utils/juegosLogica");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODELO = "openai/gpt-oss-120b";

// Solo letras sueltas: los espacios y guiones no caben en la sopa ni en el ahorcado
const FORMATO_VALIDO = /^[A-Za-z]{3,10}$/;

const RESPALDO = {
  A: [
    { palabra: "house", traduccion: "casa" },
    { palabra: "water", traduccion: "agua" },
    { palabra: "friend", traduccion: "amigo" },
    { palabra: "school", traduccion: "escuela" },
    { palabra: "bread", traduccion: "pan" },
    { palabra: "night", traduccion: "noche" },
    { palabra: "green", traduccion: "verde" },
    { palabra: "table", traduccion: "mesa" },
    { palabra: "street", traduccion: "calle" },
    { palabra: "family", traduccion: "familia" },
    { palabra: "window", traduccion: "ventana" },
    { palabra: "coffee", traduccion: "café" },
    { palabra: "summer", traduccion: "verano" },
    { palabra: "money", traduccion: "dinero" },
    { palabra: "market", traduccion: "mercado" },
    { palabra: "doctor", traduccion: "médico" },
    { palabra: "orange", traduccion: "naranja" },
    { palabra: "kitchen", traduccion: "cocina" },
    { palabra: "morning", traduccion: "mañana" },
    { palabra: "brother", traduccion: "hermano" },
  ],
  B: [
    { palabra: "advice", traduccion: "consejo" },
    { palabra: "borrow", traduccion: "pedir prestado" },
    { palabra: "crowded", traduccion: "abarrotado" },
    { palabra: "deadline", traduccion: "fecha límite" },
    { palabra: "improve", traduccion: "mejorar" },
    { palabra: "journey", traduccion: "viaje" },
    { palabra: "manage", traduccion: "gestionar" },
    { palabra: "neighbour", traduccion: "vecino" },
    { palabra: "opinion", traduccion: "opinión" },
    { palabra: "perhaps", traduccion: "quizás" },
    { palabra: "quality", traduccion: "calidad" },
    { palabra: "reliable", traduccion: "fiable" },
    { palabra: "schedule", traduccion: "horario" },
    { palabra: "though", traduccion: "aunque" },
    { palabra: "unusual", traduccion: "poco común" },
    { palabra: "warning", traduccion: "advertencia" },
    { palabra: "achieve", traduccion: "lograr" },
    { palabra: "budget", traduccion: "presupuesto" },
    { palabra: "confident", traduccion: "seguro de sí mismo" },
    { palabra: "effort", traduccion: "esfuerzo" },
  ],
  C: [
    { palabra: "ambiguous", traduccion: "ambiguo" },
    { palabra: "biased", traduccion: "sesgado" },
    { palabra: "cautious", traduccion: "cauteloso" },
    { palabra: "drawback", traduccion: "inconveniente" },
    { palabra: "endeavour", traduccion: "empeño" },
    { palabra: "feasible", traduccion: "viable" },
    { palabra: "grasp", traduccion: "captar" },
    { palabra: "hinder", traduccion: "obstaculizar" },
    { palabra: "insight", traduccion: "perspicacia" },
    { palabra: "leverage", traduccion: "aprovechar" },
    { palabra: "mitigate", traduccion: "mitigar" },
    { palabra: "nuance", traduccion: "matiz" },
    { palabra: "overcome", traduccion: "superar" },
    { palabra: "prompt", traduccion: "impulsar" },
    { palabra: "reluctant", traduccion: "reacio" },
    { palabra: "scrutiny", traduccion: "escrutinio" },
    { palabra: "thorough", traduccion: "minucioso" },
    { palabra: "unveil", traduccion: "desvelar" },
    { palabra: "viable", traduccion: "viable" },
    { palabra: "widespread", traduccion: "generalizado" },
  ],
};

/** Traduce el nivel MCER a la banda de dificultad de las listas de respaldo. */
function banda(nivel) {
  const letra = (nivel || "A1").charAt(0).toUpperCase();
  return RESPALDO[letra] ? letra : "A";
}

/** Devuelve palabras de la lista fija, barajadas, para cuando la IA no responde. */
function palabrasDeRespaldo(nivel) {
  return barajar(RESPALDO[banda(nivel)]);
}

/** Pide a la IA palabras del nivel del estudiante con su traducción al español. */
async function generarPalabras({ nivel, cantidad }) {
  const cuantas = Math.min(Math.max(cantidad || 6, 1), 12);

  const prompt = `Give ${cuantas} English words for a word game, aimed at a Spanish-speaking learner at CEFR level ${nivel}.

Rules for every word:
- a single word, only letters a-z, between 3 and 10 letters long
- no proper nouns, no abbreviations, no hyphens, no spaces
- useful everyday vocabulary at ${nivel} level, not easier and not harder
- all ${cuantas} words must be different from each other

For each word give a short translation into Spanish.

Reply ONLY with valid JSON:
{"palabras": [{"palabra": "example", "traduccion": "ejemplo"}]}`;

  const completion = await groq.chat.completions.create({
    model: MODELO,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const datos = JSON.parse(completion.choices[0].message.content);
  const lista = Array.isArray(datos.palabras) ? datos.palabras : [];

  // La IA a veces devuelve frases o palabras larguísimas: aquí se descartan
  return lista.filter(
    (p) => p && FORMATO_VALIDO.test(p.palabra || "") && (p.traduccion || "").trim(),
  );
}

module.exports = { FORMATO_VALIDO, palabrasDeRespaldo, generarPalabras };
