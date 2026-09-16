// Decide qué aconsejar según el estado real del estudiante, sin IA ni base de datos

const MONEDAS_DE_SOBRA = 20;
const PALABRAS_PARA_REPASAR = 5;
const PALABRAS_DEBILES = 3;

/**
 * Las reglas se revisan en orden y gana la primera que aplica: lo urgente antes
 * que lo útil, y lo útil antes que la felicitación.
 */
const REGLAS = [
  {
    clave: "sin-nivel",
    animo: "animando",
    aplica: (e) => !e.nivel,
    en: () => ({
      titulo: "Let's find your level",
      texto: "Take the Level Check first — everything else adapts to the result.",
      accion: "Start the diagnostic",
      boton: "btn-iniciar-nivel",
    }),
    es: () => ({
      titulo: "Empecemos por tu nivel",
      texto: "Haz el Level Check primero: todo lo demás se ajusta a ese resultado.",
      accion: "Empezar el diagnóstico",
      boton: "btn-iniciar-nivel",
    }),
  },
  {
    clave: "racha-en-riesgo",
    animo: "preocupado",
    aplica: (e) => e.racha >= 1 && e.actividadesHoy === 0,
    en: (e) => ({
      titulo: `Your ${e.racha}-day streak is at risk`,
      texto: "You haven't practiced today. One exercise is enough to keep it alive.",
      accion: "Practice now",
      boton: "btn-practicar",
    }),
    es: (e) => ({
      titulo: `Tu racha de ${e.racha} días está en riesgo`,
      texto: "Hoy no has practicado. Con un solo ejercicio la mantienes viva.",
      accion: "Practicar ahora",
      boton: "btn-practicar",
    }),
  },
  {
    clave: "meta-incompleta",
    animo: "animando",
    aplica: (e) => e.actividadesHoy > 0 && e.actividadesHoy < e.metaDiaria,
    en: (e) => {
      const faltan = e.metaDiaria - e.actividadesHoy;
      return {
        titulo: faltan === 1 ? "One more to go" : `${faltan} more to go`,
        texto: `You're at ${e.actividadesHoy} of ${e.metaDiaria} today. You're closer than you think.`,
        accion: "Keep going",
        boton: "btn-practicar",
      };
    },
    es: (e) => {
      const faltan = e.metaDiaria - e.actividadesHoy;
      return {
        titulo: faltan === 1 ? "Te falta uno" : `Te faltan ${faltan}`,
        texto: `Vas ${e.actividadesHoy} de ${e.metaDiaria} hoy. Estás más cerca de lo que crees.`,
        accion: "Seguir",
        boton: "btn-practicar",
      };
    },
  },
  {
    clave: "palabras-debiles",
    animo: "animando",
    aplica: (e) => e.palabrasDebiles >= PALABRAS_DEBILES,
    en: (e) => ({
      titulo: `${e.palabrasDebiles} words keep escaping you`,
      texto: "The word games are built from exactly those. Beat them there and they stick.",
      accion: "Play Word Games",
      boton: "btn-juegos",
    }),
    es: (e) => ({
      titulo: `${e.palabrasDebiles} palabras se te siguen escapando`,
      texto: "Los juegos se arman justo con esas. Gánales ahí y se te quedan.",
      accion: "Jugar Word Games",
      boton: "btn-juegos",
    }),
  },
  {
    clave: "palabras-por-repasar",
    animo: "animando",
    aplica: (e) => e.palabrasPorRepasar >= PALABRAS_PARA_REPASAR,
    en: (e) => ({
      titulo: `${e.palabrasPorRepasar} cards are due`,
      texto: "Spaced repetition works when you show up on time. Ten minutes is enough.",
      accion: "Review vocabulary",
      boton: "btn-vocabulario",
    }),
    es: (e) => ({
      titulo: `${e.palabrasPorRepasar} tarjetas están listas`,
      texto: "La repetición espaciada sirve si llegas a tiempo. Con diez minutos basta.",
      accion: "Repasar vocabulario",
      boton: "btn-vocabulario",
    }),
  },
  {
    clave: "monedas-de-sobra",
    animo: "feliz",
    aplica: (e) => e.monedas >= MONEDAS_DE_SOBRA,
    en: (e) => ({
      titulo: `You have ${e.monedas} coins saved up`,
      texto: "A shield protects your streak the day you can't practice. Worth spending them.",
      accion: "Go to the Shop",
      boton: "btn-tienda",
    }),
    es: (e) => ({
      titulo: `Tienes ${e.monedas} monedas guardadas`,
      texto: "Un escudo te protege la racha el día que no puedas practicar. Vale la pena gastarlas.",
      accion: "Ir a la tienda",
      boton: "btn-tienda",
    }),
  },
  {
    clave: "meta-cumplida",
    animo: "celebrando",
    aplica: (e) => e.actividadesHoy >= e.metaDiaria,
    en: (e) => ({
      titulo: "Daily goal done",
      texto:
        e.racha > 1
          ? `That's ${e.racha} days in a row. Anything else today is a bonus.`
          : "Anything else today is a bonus. Try a real situation for fun.",
      accion: "Try Real Situations",
      boton: "btn-roleplay",
    }),
    es: (e) => ({
      titulo: "Meta diaria cumplida",
      texto:
        e.racha > 1
          ? `Llevas ${e.racha} días seguidos. Lo de hoy ya es ganancia.`
          : "Lo que hagas ahora ya es ganancia. Prueba una situación real por gusto.",
      accion: "Probar Real Situations",
      boton: "btn-roleplay",
    }),
  },
];

const BIENVENIDA = {
  clave: "bienvenida",
  animo: "feliz",
  en: () => ({
    titulo: "Ready when you are",
    texto: "Daily Practice is the shortest way in — it picks what you need next.",
    accion: "Start practicing",
    boton: "btn-practicar",
  }),
  es: () => ({
    titulo: "Cuando quieras empezamos",
    texto: "Daily Practice es el camino más corto: escoge solo lo que te hace falta.",
    accion: "Empezar a practicar",
    boton: "btn-practicar",
  }),
};

/** Rellena lo que falte para que una regla nunca reciba undefined. */
function normalizarEstado(estado) {
  const e = estado || {};
  return {
    nivel: e.nivel || null,
    racha: Number(e.racha) || 0,
    actividadesHoy: Number(e.actividadesHoy) || 0,
    metaDiaria: Number(e.metaDiaria) || 5,
    monedas: Number(e.monedas) || 0,
    palabrasPorRepasar: Number(e.palabrasPorRepasar) || 0,
    palabrasDebiles: Number(e.palabrasDebiles) || 0,
    ayudaEspanol: e.ayudaEspanol !== false,
  };
}

/** Devuelve el consejo que toca ahora, ya redactado en el idioma que el usuario eligió. */
function elegirConsejo(estado) {
  const e = normalizarEstado(estado);
  const regla = REGLAS.find((r) => r.aplica(e)) || BIENVENIDA;
  const idioma = e.ayudaEspanol ? "es" : "en";
  return { clave: regla.clave, animo: regla.animo, ...regla[idioma](e) };
}

module.exports = {
  REGLAS,
  BIENVENIDA,
  MONEDAS_DE_SOBRA,
  PALABRAS_PARA_REPASAR,
  PALABRAS_DEBILES,
  normalizarEstado,
  elegirConsejo,
};
