// Repaso espaciado con FSRS (ts-fsrs, licencia MIT): decide cuándo vuelve a salir cada palabra

const { fsrs, generatorParameters, createEmptyCard, Rating, State } = require("ts-fsrs");

// Los intervalos del sistema anterior: sirven para traducir FSRS al "nivel de dominio" de 0 a 5
const INTERVALOS_DIAS = [1, 2, 4, 7, 14, 30];
const DIA_MS = 24 * 60 * 60 * 1000;

/** Arma el programador; en las pruebas va sin aleatoriedad para que los resultados sean fijos. */
function crearProgramador({ aleatorio = true } = {}) {
  return fsrs(
    generatorParameters({
      request_retention: 0.9, // se busca que recuerde 9 de cada 10 palabras al repasarlas
      maximum_interval: 365,
      enable_fuzz: aleatorio,
    }),
  );
}

const programador = crearProgramador();

/** Traduce los días hasta el próximo repaso al nivel de dominio de 0 a 5 que usan logros y mentor. */
function nivelDesdeIntervalo(dias) {
  const alcanzados = INTERVALOS_DIAS.filter((umbral) => dias >= umbral).length;
  return Math.max(0, Math.min(alcanzados - 1, INTERVALOS_DIAS.length - 1));
}

/** Convierte una fila de la base en la tarjeta que entiende FSRS. */
function tarjetaDesdeFila(fila, ahora = new Date()) {
  const vence = fila.proximo_repaso ? new Date(fila.proximo_repaso) : ahora;

  if (fila.fsrs_estado != null) {
    const ultimo = fila.ultimo_repaso ? new Date(fila.ultimo_repaso) : undefined;
    return {
      due: vence,
      stability: Number(fila.fsrs_estabilidad) || 0,
      difficulty: Number(fila.fsrs_dificultad) || 0,
      elapsed_days: ultimo ? Math.max(0, Math.floor((ahora - ultimo) / DIA_MS)) : 0,
      scheduled_days: Number(fila.fsrs_dias_programados) || 0,
      learning_steps: Number(fila.fsrs_pasos) || 0,
      reps: Number(fila.fsrs_repasos) || 0,
      lapses: Number(fila.fsrs_fallos) || 0,
      state: Number(fila.fsrs_estado),
      last_review: ultimo,
    };
  }

  // Palabras del sistema anterior: se conserva lo que ya había avanzado el estudiante
  const nivel = Number(fila.nivel_dominio) || 0;
  if (nivel > 0) {
    const dias = INTERVALOS_DIAS[Math.min(nivel, INTERVALOS_DIAS.length - 1)];
    return {
      ...createEmptyCard(vence),
      due: vence,
      stability: dias,
      difficulty: 5,
      scheduled_days: dias,
      reps: nivel,
      state: State.Review,
      last_review: new Date(vence.getTime() - dias * DIA_MS),
    };
  }

  return { ...createEmptyCard(vence), due: vence };
}

/** Califica la tarjeta: "no la sabía" es Again y "la sabía" es Good, como en Anki. */
function calificar(tarjeta, sabia, ahora = new Date(), motor = programador) {
  return motor.next(tarjeta, ahora, sabia ? Rating.Good : Rating.Again).card;
}

/** Deja la tarjeta lista para guardar, con el nivel de dominio ya calculado. */
function filaDesdeTarjeta(tarjeta) {
  return {
    proximo_repaso: tarjeta.due,
    ultimo_repaso: tarjeta.last_review || null,
    fsrs_estabilidad: tarjeta.stability,
    fsrs_dificultad: tarjeta.difficulty,
    fsrs_estado: tarjeta.state,
    fsrs_pasos: tarjeta.learning_steps || 0,
    fsrs_repasos: tarjeta.reps,
    fsrs_fallos: tarjeta.lapses,
    fsrs_dias_programados: tarjeta.scheduled_days,
    nivel_dominio: nivelDesdeIntervalo(tarjeta.scheduled_days),
  };
}

module.exports = {
  INTERVALOS_DIAS,
  crearProgramador,
  nivelDesdeIntervalo,
  tarjetaDesdeFila,
  calificar,
  filaDesdeTarjeta,
};
