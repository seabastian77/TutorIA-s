// Semillas para que la IA no devuelva siempre lo mismo, sin base de datos ni red

// Campos temáticos de los que puede salir el contenido, en los dos idiomas de los prompts
const CAMPOS = [
  { en: "food and cooking", es: "la comida y la cocina" },
  { en: "weather and seasons", es: "el clima y las estaciones" },
  { en: "travel and transport", es: "los viajes y el transporte" },
  { en: "feelings and moods", es: "los sentimientos y los estados de ánimo" },
  { en: "technology and devices", es: "la tecnología y los aparatos" },
  { en: "clothes and accessories", es: "la ropa y los accesorios" },
  { en: "animals and nature", es: "los animales y la naturaleza" },
  { en: "the house and furniture", es: "la casa y los muebles" },
  { en: "work and money", es: "el trabajo y el dinero" },
  { en: "health and the body", es: "la salud y el cuerpo" },
  { en: "the city and its places", es: "la ciudad y sus lugares" },
  { en: "sports and exercise", es: "el deporte y el ejercicio" },
  { en: "music and art", es: "la música y el arte" },
  { en: "school and studying", es: "el colegio y el estudio" },
  { en: "family and friends", es: "la familia y los amigos" },
  { en: "time and routines", es: "el tiempo y las rutinas" },
  { en: "shopping and prices", es: "las compras y los precios" },
  { en: "hobbies and free time", es: "los pasatiempos y el tiempo libre" },
  { en: "the countryside and farming", es: "el campo y la agricultura" },
  { en: "holidays and celebrations", es: "las fiestas y las celebraciones" },
  { en: "tools and materials", es: "las herramientas y los materiales" },
  { en: "colours and shapes", es: "los colores y las formas" },
  { en: "the sea and the coast", es: "el mar y la costa" },
  { en: "books and stories", es: "los libros y las historias" },
];

/** Devuelve un elemento cualquiera de la lista. */
function elegirAlAzar(lista) {
  if (!Array.isArray(lista) || lista.length === 0) return null;
  return lista[Math.floor(Math.random() * lista.length)];
}

/** Elige un campo temático al azar para inyectarlo en el prompt. */
function campoAlAzar() {
  return elegirAlAzar(CAMPOS);
}

/** Deja la lista de palabras a evitar limpia y acotada. */
function limpiarEvitar(evitar) {
  return (evitar || [])
    .map((p) => String(p || "").trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 25);
}

/**
 * Arma el trozo de prompt en inglés que empuja a la IA a cambiar de contenido.
 * Sin esto el modelo responde casi siempre lo mismo ante la misma pregunta.
 */
function instruccionVariedad(evitar = []) {
  const partes = [`Draw the vocabulary from this field: ${campoAlAzar().en}.`];
  const limpias = limpiarEvitar(evitar);

  if (limpias.length > 0) {
    partes.push(`Do NOT use any of these words: ${limpias.join(", ")}.`);
  }

  partes.push("Pick fresh, less obvious choices instead of the most common ones.");
  return partes.join(" ");
}

/** La misma semilla, para los prompts que están escritos en español. */
function instruccionVariedadEs(evitar = []) {
  const partes = [`Sitúa el ejercicio en este campo temático: ${campoAlAzar().es}.`];
  const limpias = limpiarEvitar(evitar);

  if (limpias.length > 0) {
    partes.push(`NO uses estas palabras: ${limpias.join(", ")}.`);
  }

  partes.push("Escoge opciones frescas, no las más obvias.");
  return partes.join(" ");
}

module.exports = {
  CAMPOS,
  elegirAlAzar,
  campoAlAzar,
  instruccionVariedad,
  instruccionVariedadEs,
};
