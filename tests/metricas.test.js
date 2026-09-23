// Comprueba los cálculos del tablero del estudio sin tocar la base de datos
const {
  esAdmin,
  correosAdmin,
  porcentaje,
  lunesDe,
  semanasRecientes,
  completarSemanas,
  resumirCambioNivel,
  distribuirNiveles,
  ordenarModulos,
} = require("../src/backend/src/utils/metricas");

describe("acceso al tablero", () => {
  const env = { ADMIN_CORREOS: " Sebas@Gmail.com, ebert@correo.co ,," };

  test("lee la lista sin espacios, sin vacíos y en minúsculas", () => {
    expect(correosAdmin(env)).toEqual(["sebas@gmail.com", "ebert@correo.co"]);
  });

  test("reconoce un correo del equipo sin importar mayúsculas", () => {
    expect(esAdmin("SEBAS@gmail.com", env)).toBe(true);
  });

  test("niega a cualquier otro, y a todos si la variable no existe", () => {
    expect(esAdmin("otro@gmail.com", env)).toBe(false);
    expect(esAdmin("sebas@gmail.com", {})).toBe(false);
    expect(esAdmin(undefined, env)).toBe(false);
  });
});

describe("porcentajes", () => {
  test("redondea a un decimal", () => {
    expect(porcentaje(1, 3)).toBe(33.3);
  });

  test("sin base no inventa un cero", () => {
    expect(porcentaje(0, 0)).toBeNull();
  });
});

describe("semanas", () => {
  test("cualquier día cae en el lunes de su semana", () => {
    expect(lunesDe("2026-09-23T15:00:00Z")).toBe("2026-09-21");
    expect(lunesDe("2026-09-27T23:00:00Z")).toBe("2026-09-21");
    expect(lunesDe("2026-09-21T00:00:00Z")).toBe("2026-09-21");
  });

  test("da las últimas semanas de la más vieja a la actual", () => {
    const s = semanasRecientes(new Date("2026-09-23T10:00:00Z"), 3);
    expect(s).toEqual(["2026-09-07", "2026-09-14", "2026-09-21"]);
  });

  test("rellena con ceros las semanas sin actividad", () => {
    const semanas = ["2026-09-07", "2026-09-14", "2026-09-21"];
    const filas = [{ semana: new Date("2026-09-14T00:00:00Z"), actividades: "5" }];
    expect(completarSemanas(filas, semanas, ["actividades"])).toEqual([
      { semana: "2026-09-07", actividades: 0 },
      { semana: "2026-09-14", actividades: 5 },
      { semana: "2026-09-21", actividades: 0 },
    ]);
  });
});

describe("cambio de nivel", () => {
  const diag = (usuario_id, nivel_mcer, fecha, v) => ({
    usuario_id, nivel_mcer, fecha, vocabulario: v, gramatica: v, comprension: v, fluidez: v,
  });

  test("compara el primer y el último diagnóstico aunque lleguen desordenados", () => {
    const r = resumirCambioNivel([
      diag(1, "B1", "2026-09-20", 70),
      diag(1, "A2", "2026-09-01", 40),
      diag(2, "A2", "2026-09-01", 50),
      diag(2, "A2", "2026-09-15", 60),
      diag(3, "B1", "2026-09-01", 80),
      diag(3, "A2", "2026-09-10", 60),
    ]);
    expect(r).toMatchObject({ estudiantes: 3, subieron: 1, igual: 1, bajaron: 1 });
    expect(r.habilidades[0]).toEqual({ habilidad: "vocabulario", estudiantes: 3, inicial: 57, actual: 63 });
  });

  test("quien tiene un solo diagnóstico no cuenta todavía", () => {
    const r = resumirCambioNivel([diag(1, "A1", "2026-09-01", 30)]);
    expect(r.estudiantes).toBe(0);
    expect(r.habilidades.every((h) => h.inicial === null)).toBe(true);
  });
});

describe("niveles y módulos", () => {
  test("los niveles salen siempre en el orden del MCER, con ceros", () => {
    const r = distribuirNiveles([{ nivel: "B1", estudiantes: 2 }, { nivel: "A1", estudiantes: "3" }]);
    expect(r.map((n) => n.nivel)).toEqual(["A1", "A2", "B1", "B2", "C1", "C2"]);
    expect(r.find((n) => n.nivel === "A1").estudiantes).toBe(3);
    expect(r.find((n) => n.nivel === "C2").estudiantes).toBe(0);
  });

  test("los módulos van del más usado al menos usado y con su nombre", () => {
    const r = ordenarModulos([
      { modulo: "juegos", actividades: 2, estudiantes: 1 },
      { modulo: "practica", actividades: 9, estudiantes: 4 },
      { modulo: "raro", actividades: 1, estudiantes: 1 },
    ]);
    expect(r.map((m) => m.nombre)).toEqual(["Daily Practice", "Word Games", "Other"]);
  });
});
