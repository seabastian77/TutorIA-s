const {
  NIVELES,
  posicionDeNivel,
  serieDeNiveles,
  aciertoPorSemana,
  compararHabilidades,
  resumenTotales,
  hayHistorial,
} = require("../src/backend/src/utils/progresoSerie");

/** Devuelve el lunes de hace N semanas, en el mismo formato que usa la serie. */
function lunesHace(semanas) {
  const hoy = new Date();
  const d = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) - semanas * 7);
  return d.toISOString().slice(0, 10);
}

describe("posicionDeNivel", () => {
  test("cada nivel del marco cae en su lugar", () => {
    expect(posicionDeNivel("A1")).toBe(0);
    expect(posicionDeNivel("C2")).toBe(5);
    expect(NIVELES).toHaveLength(6);
  });

  test("acepta minúsculas", () => {
    expect(posicionDeNivel("b2")).toBe(3);
  });

  test("lo que no es un nivel devuelve null", () => {
    [null, undefined, "", "Z9", "B", 7].forEach((malo) => {
      expect(posicionDeNivel(malo)).toBeNull();
    });
  });
});

describe("serieDeNiveles", () => {
  test("ordena por fecha aunque lleguen revueltos", () => {
    const s = serieDeNiveles([
      { fecha: "2026-03-01", nivel_mcer: "B1" },
      { fecha: "2026-01-01", nivel_mcer: "A2" },
      { fecha: "2026-02-01", nivel_mcer: "B1" },
    ]);
    expect(s.map((p) => p.nivel)).toEqual(["A2", "B1", "B1"]);
  });

  test("descarta los diagnósticos sin nivel válido", () => {
    const s = serieDeNiveles([
      { fecha: "2026-01-01", nivel_mcer: "A2" },
      { fecha: "2026-02-01", nivel_mcer: null },
      { fecha: "2026-03-01", nivel_mcer: "XX" },
    ]);
    expect(s).toHaveLength(1);
  });

  test("sin diagnósticos devuelve una lista vacía, no revienta", () => {
    expect(serieDeNiveles([])).toEqual([]);
    expect(serieDeNiveles(null)).toEqual([]);
  });
});

describe("aciertoPorSemana", () => {
  test("siempre devuelve tantas semanas como se le piden", () => {
    expect(aciertoPorSemana([], 8)).toHaveLength(8);
    expect(aciertoPorSemana([], 4)).toHaveLength(4);
  });

  test("la última posición es la semana en curso", () => {
    const s = aciertoPorSemana([], 8);
    expect(s[s.length - 1].semana).toBe(lunesHace(0));
  });

  test("calcula el porcentaje de la semana con datos", () => {
    const s = aciertoPorSemana([{ semana: lunesHace(0), total: 10, correctos: 7 }], 4);
    expect(s[3].porcentaje).toBe(70);
    expect(s[3].total).toBe(10);
  });

  test("una semana sin actividad queda en null, no en cero", () => {
    const s = aciertoPorSemana([{ semana: lunesHace(0), total: 4, correctos: 4 }], 4);
    expect(s[0].porcentaje).toBeNull();
    expect(s[0].total).toBe(0);
    expect(s[3].porcentaje).toBe(100);
  });

  test("ignora semanas registradas sin ejercicios", () => {
    const s = aciertoPorSemana([{ semana: lunesHace(1), total: 0, correctos: 0 }], 4);
    expect(s.every((p) => p.porcentaje === null)).toBe(true);
  });

  test("acepta un objeto Date, que es lo que devuelve el driver de Postgres", () => {
    const s = aciertoPorSemana(
      [{ semana: new Date(lunesHace(1) + "T00:00:00.000Z"), total: 10, correctos: 9 }],
      4,
    );
    expect(s[2].porcentaje).toBe(90);
  });

  test("acepta la fecha con hora, como la devuelve Postgres", () => {
    const s = aciertoPorSemana(
      [{ semana: lunesHace(2) + "T00:00:00.000Z", total: 8, correctos: 2 }],
      4,
    );
    expect(s[1].porcentaje).toBe(25);
  });

  test("redondea a entero en vez de dejar decimales largos", () => {
    const s = aciertoPorSemana([{ semana: lunesHace(0), total: 3, correctos: 1 }], 2);
    expect(s[1].porcentaje).toBe(33);
  });

  test("las semanas salen en orden cronológico", () => {
    const s = aciertoPorSemana([], 6);
    const fechas = s.map((p) => p.semana);
    expect([...fechas].sort()).toEqual(fechas);
  });
});

describe("compararHabilidades", () => {
  const PRIMERO = { fecha: "2026-01-01", vocabulario: 40, gramatica: 35, comprension: 50, fluidez: 30 };
  const ULTIMO = { fecha: "2026-05-01", vocabulario: 72, gramatica: 60, comprension: 65, fluidez: 55 };

  test("compara el primero contra el último, no contra el vecino", () => {
    const enMedio = { fecha: "2026-03-01", vocabulario: 90, gramatica: 90, comprension: 90, fluidez: 90 };
    const h = compararHabilidades([PRIMERO, enMedio, ULTIMO]);
    expect(h[0]).toMatchObject({ clave: "vocabulario", antes: 40, despues: 72, delta: 32 });
  });

  test("devuelve las cuatro habilidades", () => {
    expect(compararHabilidades([PRIMERO, ULTIMO]).map((h) => h.clave)).toEqual([
      "vocabulario", "gramatica", "comprension", "fluidez",
    ]);
  });

  test("una bajada se refleja con delta negativo", () => {
    const peor = { ...ULTIMO, gramatica: 20 };
    const h = compararHabilidades([PRIMERO, peor]);
    expect(h.find((x) => x.clave === "gramatica").delta).toBe(-15);
  });

  test("con un solo diagnóstico compara consigo mismo y da cero", () => {
    const h = compararHabilidades([PRIMERO]);
    expect(h).toHaveLength(4);
    expect(h.every((x) => x.delta === 0)).toBe(true);
  });

  test("sin diagnósticos devuelve vacío", () => {
    expect(compararHabilidades([])).toEqual([]);
    expect(compararHabilidades(null)).toEqual([]);
  });

  test("descarta las habilidades que quedaron sin puntuar", () => {
    const incompleto = { fecha: "2026-01-01", vocabulario: 40, gramatica: null };
    const h = compararHabilidades([incompleto, { ...incompleto, fecha: "2026-02-01" }]);
    expect(h.map((x) => x.clave)).toEqual(["vocabulario"]);
  });

  test("los nombres siguen el idioma elegido", () => {
    expect(compararHabilidades([PRIMERO, ULTIMO], true)[1].nombre).toBe("Gramática");
    expect(compararHabilidades([PRIMERO, ULTIMO], false)[1].nombre).toBe("Grammar");
  });
});

describe("resumenTotales", () => {
  const ENTRADA = {
    ejercicios: { total: 120, correctos: 90 },
    conversaciones: 14,
    palabras: 37,
    usuario: { racha_maxima: 9 },
    diagnosticos: [
      { fecha: "2026-01-01", nivel_mcer: "A2" },
      { fecha: "2026-05-01", nivel_mcer: "B2" },
    ],
  };

  test("saca el acierto global y de dónde a dónde llegó", () => {
    const r = resumenTotales(ENTRADA);
    expect(r).toMatchObject({
      ejercicios: 120, acierto: 75, conversaciones: 14, palabras: 37,
      rachaMaxima: 9, nivelInicial: "A2", nivelActual: "B2", diagnosticos: 2,
    });
  });

  test("sin ejercicios el acierto es null, no un cero engañoso", () => {
    const r = resumenTotales({ ...ENTRADA, ejercicios: { total: 0, correctos: 0 } });
    expect(r.acierto).toBeNull();
  });

  test("aguanta que no llegue nada", () => {
    const r = resumenTotales({});
    expect(r).toMatchObject({ ejercicios: 0, acierto: null, nivelActual: null, diagnosticos: 0 });
  });

  test("Postgres devuelve los conteos como texto y aun así suma bien", () => {
    const r = resumenTotales({ ...ENTRADA, ejercicios: { total: "120", correctos: "90" }, palabras: "37" });
    expect(r.acierto).toBe(75);
    expect(r.palabras).toBe(37);
  });
});

describe("hayHistorial", () => {
  test("un usuario recién registrado no tiene nada que mostrar", () => {
    expect(hayHistorial(resumenTotales({}))).toBe(false);
  });

  test("basta una sola señal de actividad", () => {
    expect(hayHistorial(resumenTotales({ palabras: 1 }))).toBe(true);
    expect(hayHistorial(resumenTotales({ conversaciones: 1 }))).toBe(true);
    expect(hayHistorial(resumenTotales({ ejercicios: { total: 1, correctos: 0 } }))).toBe(true);
    expect(hayHistorial(resumenTotales({ diagnosticos: [{ fecha: "2026-01-01", nivel_mcer: "A1" }] }))).toBe(true);
  });
});
