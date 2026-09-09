const {
  LIGAS,
  NOMBRES_LIGA,
  TAMANO_GRUPO,
  SUBEN,
  BAJAN,
  lunesDeLaSemana,
  semanaAnterior,
} = require("../src/backend/src/utils/ligasConfig");

describe("lunesDeLaSemana", () => {
  test("un lunes se devuelve a sí mismo", () => {
    // 2026-09-07 fue lunes
    expect(lunesDeLaSemana(new Date(2026, 8, 7))).toBe("2026-09-07");
  });

  test("un martes retrocede al lunes anterior", () => {
    expect(lunesDeLaSemana(new Date(2026, 8, 8))).toBe("2026-09-07");
  });

  test("un domingo pertenece a la semana que arrancó el lunes previo", () => {
    // 2026-09-13 fue domingo: su semana empezó el 7
    expect(lunesDeLaSemana(new Date(2026, 8, 13))).toBe("2026-09-07");
  });

  test("el lunes siguiente ya es otra semana", () => {
    expect(lunesDeLaSemana(new Date(2026, 8, 14))).toBe("2026-09-14");
  });

  test("funciona cruzando el cambio de mes", () => {
    // 2026-10-01 fue jueves; su lunes es el 28 de septiembre
    expect(lunesDeLaSemana(new Date(2026, 9, 1))).toBe("2026-09-28");
  });
});

describe("semanaAnterior", () => {
  test("resta exactamente siete días", () => {
    expect(semanaAnterior("2026-09-14")).toBe("2026-09-07");
  });

  test("funciona cruzando el cambio de año", () => {
    expect(semanaAnterior("2027-01-04")).toBe("2026-12-28");
  });
});

describe("configuración de las ligas", () => {
  test("van de menor a mayor y no se repiten", () => {
    expect(LIGAS[0]).toBe("bronce");
    expect(LIGAS[LIGAS.length - 1]).toBe("diamante");
    expect(new Set(LIGAS).size).toBe(LIGAS.length);
  });

  test("cada liga tiene su nombre para mostrar", () => {
    LIGAS.forEach((liga) => {
      expect(typeof NOMBRES_LIGA[liga]).toBe("string");
      expect(NOMBRES_LIGA[liga].length).toBeGreaterThan(0);
    });
  });

  test("los que suben y los que bajan caben en el grupo", () => {
    // Si no, alguien subiría y bajaría a la vez
    expect(SUBEN + BAJAN).toBeLessThan(TAMANO_GRUPO);
  });
});
