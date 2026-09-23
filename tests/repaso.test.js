// Comprueba el repaso espaciado con FSRS: tiempos, fallos y la conversión de las palabras viejas
const { State } = require("../src/backend/node_modules/ts-fsrs");
const {
  crearProgramador,
  nivelDesdeIntervalo,
  tarjetaDesdeFila,
  calificar,
  filaDesdeTarjeta,
} = require("../src/backend/src/utils/repaso");

const motor = crearProgramador({ aleatorio: false });
const inicio = new Date("2026-09-01T10:00:00Z");
const DIA = 24 * 60 * 60 * 1000;

/** Repasa una palabra varias veces, cada vez justo cuando le toca. */
function repasar(respuestas, fila = { proximo_repaso: inicio }) {
  let ahora = inicio;
  let tarjeta = tarjetaDesdeFila(fila, ahora);
  const pasos = [];
  respuestas.forEach((sabia) => {
    tarjeta = calificar(tarjeta, sabia, ahora, motor);
    pasos.push(filaDesdeTarjeta(tarjeta));
    ahora = tarjeta.due;
  });
  return pasos;
}

describe("nivel de dominio", () => {
  test("sale de los días hasta el próximo repaso, de 0 a 5", () => {
    expect(nivelDesdeIntervalo(0)).toBe(0);
    expect(nivelDesdeIntervalo(2)).toBe(1);
    expect(nivelDesdeIntervalo(7)).toBe(3);
    expect(nivelDesdeIntervalo(400)).toBe(5);
  });
});

describe("repaso con FSRS", () => {
  test("una palabra nueva que sabe vuelve en minutos y luego en días", () => {
    const [primero, segundo] = repasar([true, true]);
    expect(primero.proximo_repaso - inicio).toBeLessThan(DIA);
    expect(segundo.fsrs_dias_programados).toBeGreaterThanOrEqual(1);
    expect(segundo.fsrs_estado).toBe(State.Review);
  });

  test("cada acierto seguido aleja más el próximo repaso", () => {
    const pasos = repasar([true, true, true, true]);
    const dias = pasos.map((p) => p.fsrs_dias_programados);
    expect(dias[3]).toBeGreaterThan(dias[2]);
    expect(dias[2]).toBeGreaterThan(dias[1]);
    expect(pasos[3].nivel_dominio).toBeGreaterThanOrEqual(3);
  });

  test("un fallo la trae de vuelta pronto y cuenta como olvido", () => {
    const pasos = repasar([true, true, true, false]);
    const fallo = pasos[3];
    expect(fallo.fsrs_estado).toBe(State.Relearning);
    expect(fallo.fsrs_fallos).toBe(1);
    expect(fallo.nivel_dominio).toBe(0);
    expect(fallo.fsrs_dificultad).toBeGreaterThan(pasos[2].fsrs_dificultad);
  });

  test("no programa mucho más allá de un año (FSRS suma un día para no repetir el intervalo)", () => {
    const pasos = repasar(Array(20).fill(true));
    expect(pasos[19].fsrs_dias_programados).toBeLessThanOrEqual(366);
  });
});

describe("palabras del sistema anterior", () => {
  test("una palabra nueva empieza desde cero", () => {
    const t = tarjetaDesdeFila({ nivel_dominio: 0, proximo_repaso: inicio }, inicio);
    expect(t.state).toBe(State.New);
  });

  test("una que ya iba avanzada conserva lo aprendido", () => {
    const fila = { nivel_dominio: 3, proximo_repaso: inicio };
    const t = tarjetaDesdeFila(fila, inicio);
    expect(t.state).toBe(State.Review);
    expect(t.stability).toBe(7);
    const [siguiente] = repasar([true], fila);
    expect(siguiente.fsrs_dias_programados).toBeGreaterThan(7);
  });

  test("lee de vuelta lo que guardó sin perder nada", () => {
    const [guardada] = repasar([true, true]);
    const leida = tarjetaDesdeFila({ ...guardada }, guardada.proximo_repaso);
    const copia = filaDesdeTarjeta(leida);
    expect(copia.fsrs_estabilidad).toBeCloseTo(guardada.fsrs_estabilidad);
    expect(copia.fsrs_repasos).toBe(guardada.fsrs_repasos);
    expect(copia.fsrs_estado).toBe(guardada.fsrs_estado);
  });
});
