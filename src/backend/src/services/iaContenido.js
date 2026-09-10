// Servicios de IA para roleplay, biblioteca y laboratorio de audio

const Groq = require("groq-sdk");
const { instruccionVariedad } = require("../utils/variedad");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODELO = "openai/gpt-oss-120b";

/** Frase que se inyecta en los prompts según el interruptor de español. */
function instruccionAyuda(ayudaEs) {
  return ayudaEs
    ? "El estudiante tiene activada la ayuda en español: las explicaciones, correcciones y pistas van EN ESPAÑOL."
    : "El estudiante tiene desactivada la ayuda en español: las explicaciones y correcciones van EN INGLÉS sencillo, apropiado a su nivel.";
}

async function pedirJSON(prompt) {
  const completion = await groq.chat.completions.create({
    model: MODELO,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });
  return JSON.parse(completion.choices[0].message.content);
}

// Roleplay

// Catálogo de situaciones disponibles
const ESCENARIOS = {
  cafe: {
    id: "cafe",
    nombre: "Ordering coffee",
    descripcion: "You walk into a busy café and order something to drink.",
    icono: "fa-mug-hot",
    color: "naranja",
    personaje: "a friendly barista at a busy coffee shop",
    apertura: "the barista greeting the customer and asking what they want",
  },
  aeropuerto: {
    id: "aeropuerto",
    nombre: "Airport immigration",
    descripcion: "An immigration officer asks about your trip.",
    icono: "fa-passport",
    color: "azul",
    personaje: "a polite but formal immigration officer at an airport",
    apertura:
      "the officer asking for the traveller's passport and the purpose of the trip",
  },
  entrevista: {
    id: "entrevista",
    nombre: "Job interview",
    descripcion: "You interview for a job you really want.",
    icono: "fa-briefcase",
    color: "lila",
    personaje: "a calm recruiter interviewing a candidate for an office job",
    apertura:
      "the recruiter welcoming the candidate and asking them to introduce themselves",
  },
  hotel: {
    id: "hotel",
    nombre: "Hotel check-in",
    descripcion: "You arrive at a hotel and check into your room.",
    icono: "fa-bell-concierge",
    color: "verde",
    personaje: "a receptionist at a mid-sized hotel",
    apertura: "the receptionist greeting the guest and asking for their booking",
  },
  medico: {
    id: "medico",
    nombre: "Doctor's appointment",
    descripcion: "You explain to a doctor how you have been feeling.",
    icono: "fa-stethoscope",
    color: "cian",
    personaje: "a patient, unhurried doctor in a clinic",
    apertura: "the doctor greeting the patient and asking what brings them in",
  },
};

function listarEscenarios() {
  // Nunca se exponen los prompts internos hacia el cliente
  return Object.values(ESCENARIOS).map(
    ({ personaje, apertura, ...publico }) => publico,
  );
}

function obtenerEscenario(id) {
  return ESCENARIOS[id] || null;
}

async function generarAperturaRoleplay({ escenario, nivel }) {
  const prompt = `You are ${escenario.personaje}. This is a role-play for a Spanish-speaking English learner at CEFR level ${nivel}.

Write the FIRST line of the conversation: ${escenario.apertura}.
Keep it to one or two short sentences, natural spoken English, at ${nivel} level.

Also suggest three short things the learner could say back, as a hint.

Reply ONLY with valid JSON:
{"mensaje": "the character's first line in English", "sugerencias": ["...", "...", "..."]}`;

  return pedirJSON(prompt);
}

async function generarRespuestaRoleplay({
  escenario,
  historial,
  mensajeUsuario,
  nivel,
  ayudaEs = true,
}) {
  const historialTexto = (historial || [])
    .slice(-8)
    .map((h) => `${h.rol === "usuario" ? "Learner" : "Character"}: ${h.texto}`)
    .join("\n");

  const prompt = `You are ${escenario.personaje}, staying in character for a role-play with a Spanish-speaking English learner at CEFR level ${nivel}.
Situation: ${escenario.descripcion}

Conversation so far:
${historialTexto || "(the conversation is just starting)"}

The learner just said: "${mensajeUsuario}"

Reply in character, in natural spoken English at ${nivel} level, one to three short sentences.
Keep the scene moving forward — ask something or react, do not just agree.
If the learner says something that would end the scene naturally (they leave, the transaction finishes), set "terminado" to true.

If the learner made a clear grammar or vocabulary mistake, write a short correction. ${instruccionAyuda(ayudaEs)}
If there was no clear mistake, leave "correccion" as null.

Also suggest three short things the learner could say next.

Reply ONLY with valid JSON:
{
  "mensaje": "the character's reply in English",
  "correccion": "short correction, or null",
  "sugerencias": ["...", "...", "..."],
  "terminado": false
}`;

  return pedirJSON(prompt);
}

// Biblioteca

// Temas fijos que permiten cachear cada lectura por nivel y slug
const TEMAS_LECTURA = [
  {
    slug: "un-dia-cualquiera",
    titulo: "An Ordinary Day",
    resumen: "A small story about someone's daily routine.",
    icono: "fa-sun",
  },
  {
    slug: "el-viaje",
    titulo: "The Trip",
    resumen: "Someone travels somewhere new and something unexpected happens.",
    icono: "fa-plane",
  },
  {
    slug: "la-carta",
    titulo: "The Letter",
    resumen: "A letter arrives and changes the day.",
    icono: "fa-envelope",
  },
  {
    slug: "el-vecino",
    titulo: "The Neighbour",
    resumen: "Two neighbours meet for the first time.",
    icono: "fa-house",
  },
  {
    slug: "el-primer-trabajo",
    titulo: "The First Job",
    resumen: "Someone's first day at work.",
    icono: "fa-briefcase",
  },
  {
    slug: "la-decision",
    titulo: "The Decision",
    resumen: "A character has to choose between two paths.",
    icono: "fa-code-branch",
  },
];

function listarTemasLectura() {
  return TEMAS_LECTURA;
}

function obtenerTemaLectura(slug) {
  return TEMAS_LECTURA.find((t) => t.slug === slug) || null;
}

async function generarLectura({ nivel, tema }) {
  const largo =
    nivel === "A1" || nivel === "A2"
      ? "120 to 160 words, very simple sentences"
      : nivel === "B1" || nivel === "B2"
        ? "200 to 260 words"
        : "280 to 340 words, richer vocabulary";

  const prompt = `Write an ORIGINAL short story in English for a Spanish-speaking learner at CEFR level ${nivel}.
Theme: ${tema.titulo} — ${tema.resumen}
Everything must be invented by you: do not use existing books, films, characters or real people.

Length: ${largo}. Use clear paragraphs separated by a blank line.
The vocabulary and grammar must match ${nivel} exactly — not easier, not harder.

Then write 3 multiple-choice comprehension questions about the story, each with 4 options.
"respuestaCorrecta" is the index (0-3) of the right option.

Reply ONLY with valid JSON:
{
  "titulo": "a short title in English",
  "texto": "the full story, paragraphs separated by \\n\\n",
  "preguntas": [
    {"pregunta": "...", "opciones": ["...","...","...","..."], "respuestaCorrecta": 0}
  ]
}`;

  return pedirJSON(prompt);
}

async function traducirPalabra({ palabra, contexto, ayudaEs = true }) {
  const prompt = `A Spanish-speaking English learner tapped the word "${palabra}" while reading.

Sentence where it appears: "${contexto}"

Give the meaning of the word AS IT IS USED in that sentence.
${
  ayudaEs
    ? 'The "traduccion" field must be in Spanish.'
    : 'The "traduccion" field must be a short definition in simple English.'
}

Reply ONLY with valid JSON:
{
  "palabra": "the word in its base form",
  "traduccion": "the meaning",
  "tipo": "noun / verb / adjective / adverb / other",
  "ejemplo": "a short new example sentence in English using the word"
}`;

  return pedirJSON(prompt);
}

// Laboratorio de audio

async function generarDictado({ nivel }) {
  const largo =
    nivel === "A1" || nivel === "A2"
      ? "6 to 10 words"
      : nivel === "B1" || nivel === "B2"
        ? "10 to 16 words"
        : "16 to 24 words";

  const prompt = `Write ONE English sentence for a dictation exercise, for a Spanish-speaking learner at CEFR level ${nivel}.
Length: ${largo}. Natural, everyday English. No proper nouns, no numbers written as digits, no abbreviations.
It will be read aloud by a speech synthesiser, so avoid anything ambiguous to hear.

${instruccionVariedad()}

Also give a short hint about what the sentence is about, without revealing the words.

Reply ONLY with valid JSON:
{"frase": "the sentence", "pista": "a short hint in English", "tema": "what it practises"}`;

  return pedirJSON(prompt);
}

async function generarComprensionAudio({ nivel }) {
  const largo =
    nivel === "A1" || nivel === "A2"
      ? "40 to 60 words"
      : nivel === "B1" || nivel === "B2"
        ? "70 to 110 words"
        : "120 to 160 words";

  const prompt = `Write a short ORIGINAL spoken passage in English for a listening exercise, for a Spanish-speaking learner at CEFR level ${nivel}.
It should sound like someone talking: an announcement, a voice message, or a person telling a small story.
Length: ${largo}. It will be read aloud by a speech synthesiser.

Then write 3 multiple-choice questions about what was said, each with 4 options.
"respuestaCorrecta" is the index (0-3) of the right option.

Reply ONLY with valid JSON:
{
  "titulo": "a short label for the audio, e.g. 'Voice message from a friend'",
  "texto": "the passage to read aloud",
  "preguntas": [
    {"pregunta": "...", "opciones": ["...","...","...","..."], "respuestaCorrecta": 0}
  ]
}`;

  return pedirJSON(prompt);
}

module.exports = {
  instruccionAyuda,
  listarEscenarios,
  obtenerEscenario,
  generarAperturaRoleplay,
  generarRespuestaRoleplay,
  listarTemasLectura,
  obtenerTemaLectura,
  generarLectura,
  traducirPalabra,
  generarDictado,
  generarComprensionAudio,
};
