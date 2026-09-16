const {
  REGLAS,
  MONEDAS_DE_SOBRA,
  normalizarEstado,
  elegirConsejo,
} = require("../src/backend/src/utils/mentorReglas");

const BASE = {
  nivel: "B1",
  racha: 0,
  actividadesHoy: 0,
  metaDiaria: 5,
  monedas: 0,
  palabrasPorRepasar: 0,
  palabrasDebiles: 0,
  ayudaEspanol: false,
};

const consejo = (cambios) => elegirConsejo({ ...BASE, ...cambios });

describe("normalizarEstado", () => {
  test("un estado vacío no rompe nada y trae valores usables", () => {
    const e = normalizarEstado({});
    expect(e.racha).toBe(0);
    expect(e.metaDiaria).toBe(5);
    expect(e.nivel).toBeNull();
  });

  test("sobrevive a null y a textos en vez de números", () => {
    expect(normalizarEstado(null).actividadesHoy).toBe(0);
    expect(normalizarEstado({ racha: "7" }).racha).toBe(7);
    expect(normalizarEstado({ monedas: "abc" }).monedas).toBe(0);
  });

  test("la ayuda en español viene encendida salvo que se apague expresamente", () => {
    expect(normalizarEstado({}).ayudaEspanol).toBe(true);
    expect(normalizarEstado({ ayudaEspanol: false }).ayudaEspanol).toBe(false);
  });
});

describe("prioridad de las reglas", () => {
  test("sin nivel manda al diagnóstico por encima de todo lo demás", () => {
    const r = consejo({ nivel: null, racha: 9, palabrasDebiles: 30, monedas: 500 });
    expect(r.clave).toBe("sin-nivel");
    expect(r.boton).toBe("btn-iniciar-nivel");
  });

  test("una racha sin practicar hoy pesa más que el vocabulario pendiente", () => {
    const r = consejo({ racha: 4, actividadesHoy: 0, palabrasPorRepasar: 40 });
    expect(r.clave).toBe("racha-en-riesgo");
    expect(r.animo).toBe("preocupado");
  });

  test("sin racha que perder, lo pendiente sí sale", () => {
    const r = consejo({ racha: 0, actividadesHoy: 0, palabrasPorRepasar: 40 });
    expect(r.clave).toBe("palabras-por-repasar");
  });

  test("la meta a medias gana sobre las palabras y las monedas", () => {
    const r = consejo({ actividadesHoy: 2, palabrasDebiles: 20, monedas: 300 });
    expect(r.clave).toBe("meta-incompleta");
  });

  test("las palabras difíciles van antes que el repaso normal", () => {
    const r = consejo({ palabrasDebiles: 5, palabrasPorRepasar: 50 });
    expect(r.clave).toBe("palabras-debiles");
    expect(r.boton).toBe("btn-juegos");
  });

  test("con la meta cumplida felicita en vez de exigir", () => {
    const r = consejo({ actividadesHoy: 5 });
    expect(r.clave).toBe("meta-cumplida");
    expect(r.animo).toBe("celebrando");
  });

  test("pasarse de la meta sigue contando como cumplida", () => {
    expect(consejo({ actividadesHoy: 12 }).clave).toBe("meta-cumplida");
  });

  test("cuando no hay nada urgente saluda y propone practicar", () => {
    const r = consejo({});
    expect(r.clave).toBe("bienvenida");
    expect(r.boton).toBe("btn-practicar");
  });
});

describe("umbrales", () => {
  test("las monedas solo se mencionan al llegar al tope", () => {
    expect(consejo({ monedas: MONEDAS_DE_SOBRA - 1 }).clave).toBe("bienvenida");
    expect(consejo({ monedas: MONEDAS_DE_SOBRA }).clave).toBe("monedas-de-sobra");
  });

  test("cuatro tarjetas no molestan, cinco sí avisan", () => {
    expect(consejo({ palabrasPorRepasar: 4 }).clave).toBe("bienvenida");
    expect(consejo({ palabrasPorRepasar: 5 }).clave).toBe("palabras-por-repasar");
  });

  test("dos palabras difíciles no alarman, tres sí", () => {
    expect(consejo({ palabrasDebiles: 2 }).clave).toBe("bienvenida");
    expect(consejo({ palabrasDebiles: 3 }).clave).toBe("palabras-debiles");
  });

  test("una racha de cero no está en riesgo", () => {
    expect(consejo({ racha: 0, actividadesHoy: 0 }).clave).toBe("bienvenida");
  });
});

describe("idioma del consejo", () => {
  test("con la ayuda en español encendida responde en español", () => {
    const r = consejo({ ayudaEspanol: true, racha: 3, actividadesHoy: 0 });
    expect(r.titulo).toContain("racha");
    expect(r.accion).toBe("Practicar ahora");
  });

  test("apagada responde en inglés", () => {
    const r = consejo({ ayudaEspanol: false, racha: 3, actividadesHoy: 0 });
    expect(r.titulo).toContain("streak");
    expect(r.accion).toBe("Practice now");
  });

  test("el número de la racha aparece en los dos idiomas", () => {
    expect(consejo({ ayudaEspanol: true, racha: 7, actividadesHoy: 0 }).titulo).toContain("7");
    expect(consejo({ ayudaEspanol: false, racha: 7, actividadesHoy: 0 }).titulo).toContain("7");
  });

  test("distingue el singular del plural cuando falta uno solo", () => {
    expect(consejo({ ayudaEspanol: true, actividadesHoy: 4 }).titulo).toBe("Te falta uno");
    expect(consejo({ ayudaEspanol: false, actividadesHoy: 4 }).titulo).toBe("One more to go");
    expect(consejo({ ayudaEspanol: true, actividadesHoy: 2 }).titulo).toBe("Te faltan 3");
  });
});

describe("forma del consejo", () => {
  test("cada regla devuelve todo lo que la burbuja necesita pintar", () => {
    const casos = [
      { nivel: null },
      { racha: 2, actividadesHoy: 0 },
      { actividadesHoy: 3 },
      { palabrasDebiles: 9 },
      { palabrasPorRepasar: 9 },
      { monedas: 99 },
      { actividadesHoy: 5 },
      {},
    ];
    const vistas = new Set();

    casos.forEach((caso) => {
      ["es", "en"].forEach((idioma) => {
        const r = consejo({ ...caso, ayudaEspanol: idioma === "es" });
        vistas.add(r.clave);
        expect(typeof r.titulo).toBe("string");
        expect(r.titulo.length).toBeGreaterThan(0);
        expect(r.texto.length).toBeGreaterThan(10);
        expect(r.accion.length).toBeGreaterThan(0);
        expect(r.boton).toMatch(/^btn-/);
        expect(["feliz", "animando", "preocupado", "celebrando"]).toContain(r.animo);
      });
    });

    // Los ocho casos deben cubrir las siete reglas más la bienvenida
    expect(vistas.size).toBe(REGLAS.length + 1);
  });

  test("el botón que propone siempre existe en el menú", () => {
    const DEL_MENU = [
      "btn-iniciar-nivel", "btn-hablar-ia", "btn-practicar", "btn-roleplay",
      "btn-escena", "btn-vocabulario", "btn-biblioteca", "btn-audio",
      "btn-liga", "btn-logros", "btn-tienda", "btn-juegos",
    ];
    [{ nivel: null }, { racha: 2, actividadesHoy: 0 }, { actividadesHoy: 3 },
     { palabrasDebiles: 9 }, { palabrasPorRepasar: 9 }, { monedas: 99 },
     { actividadesHoy: 5 }, {}].forEach((caso) => {
      expect(DEL_MENU).toContain(consejo(caso).boton);
    });
  });
});
