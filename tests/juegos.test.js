const {
  barajar,
  cupoDelVocabulario,
  limpiarPalabra,
  estadoAhorcado,
  letraParaRevelar,
  crearSopa,
  leerSegmento,
  coincideColocada,
  casillasDe,
} = require("../src/backend/src/utils/juegosLogica");

describe("limpiarPalabra", () => {
  test("pasa a mayúsculas y quita lo que no sea letra", () => {
    expect(limpiarPalabra("don't-stop")).toBe("DONTSTOP");
  });

  test("un texto vacío no rompe nada", () => {
    expect(limpiarPalabra("")).toBe("");
    expect(limpiarPalabra(null)).toBe("");
  });
});

describe("barajar", () => {
  test("no pierde ni inventa elementos", () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8];
    const mezclada = barajar(original);
    expect(mezclada).toHaveLength(original.length);
    expect([...mezclada].sort((a, b) => a - b)).toEqual(original);
  });

  test("no toca la lista que recibe", () => {
    const original = ["a", "b", "c"];
    barajar(original);
    expect(original).toEqual(["a", "b", "c"]);
  });
});

describe("cupoDelVocabulario", () => {
  test("nunca pasa de la mitad de las palabras pedidas", () => {
    for (let i = 0; i < 200; i++) {
      expect(cupoDelVocabulario(6)).toBeLessThanOrEqual(3);
      expect(cupoDelVocabulario(6)).toBeGreaterThanOrEqual(0);
    }
  });

  test("con una sola palabra sale 0 o 1", () => {
    const salidas = new Set();
    for (let i = 0; i < 200; i++) salidas.add(cupoDelVocabulario(1));
    expect([...salidas].sort()).toEqual([0, 1]);
  });

  test("varía entre partidas en vez de dar siempre el tope", () => {
    // Si diera siempre el máximo, un vocabulario pequeño saldría entero cada vez
    const salidas = new Set();
    for (let i = 0; i < 200; i++) salidas.add(cupoDelVocabulario(6));
    expect(salidas.size).toBeGreaterThan(1);
    expect(salidas.has(0)).toBe(true);
  });
});

describe("estadoAhorcado", () => {
  test("sin letras probadas no se ve nada de la palabra", () => {
    const r = estadoAhorcado("house", []);
    expect(r.mascara).toEqual([null, null, null, null, null]);
    expect(r.errores).toBe(0);
    expect(r.estado).toBe("jugando");
  });

  test("una letra acertada aparece en todas sus posiciones", () => {
    const r = estadoAhorcado("street", ["T"]);
    expect(r.mascara).toEqual([null, "T", null, null, null, "T"]);
    expect(r.errores).toBe(0);
  });

  test("las letras que no están suman errores", () => {
    const r = estadoAhorcado("house", ["z", "x"]);
    expect(r.errores).toBe(2);
    expect(r.restantes).toBe(4);
    expect(r.estado).toBe("jugando");
  });

  test("completar la palabra la da por ganada", () => {
    const r = estadoAhorcado("house", ["H", "O", "U", "S", "E"]);
    expect(r.estado).toBe("ganada");
    expect(r.mascara.join("")).toBe("HOUSE");
  });

  test("seis errores la dan por perdida", () => {
    const r = estadoAhorcado("house", ["B", "C", "D", "F", "G", "J"]);
    expect(r.restantes).toBe(0);
    expect(r.estado).toBe("perdida");
  });

  test("acertar en el último intento gana, no pierde", () => {
    const letras = ["B", "C", "D", "F", "G", "H", "O", "U", "S", "E"];
    const r = estadoAhorcado("house", letras);
    expect(r.errores).toBe(5);
    expect(r.estado).toBe("ganada");
  });

  test("no distingue mayúsculas de minúsculas", () => {
    const r = estadoAhorcado("house", ["h", "o"]);
    expect(r.mascara).toEqual(["H", "O", null, null, null]);
  });
});

describe("letraParaRevelar", () => {
  test("devuelve una letra de la palabra que aún no se ha probado", () => {
    const letra = letraParaRevelar("house", ["H"]);
    expect("OUSE").toContain(letra);
  });

  test("devuelve null cuando ya están todas", () => {
    expect(letraParaRevelar("house", ["H", "O", "U", "S", "E"])).toBeNull();
  });
});

describe("crearSopa", () => {
  const PALABRAS = ["house", "water", "friend", "green", "table", "night"];

  test("el tablero queda cuadrado y sin huecos", () => {
    const { letras } = crearSopa(PALABRAS, 10);
    expect(letras).toHaveLength(10);
    letras.forEach((fila) => {
      expect(fila).toHaveLength(10);
      fila.forEach((letra) => expect(letra).toMatch(/^[A-Z]$/));
    });
  });

  test("cada palabra colocada se puede leer en sus coordenadas", () => {
    const { letras, colocadas } = crearSopa(PALABRAS, 10);
    expect(colocadas.length).toBeGreaterThan(0);

    colocadas.forEach((c) => {
      const casillas = casillasDe(c);
      const leida = casillas
        .map(({ fila, columna }) => letras[fila][columna])
        .join("");
      expect(leida).toBe(c.palabra);
    });
  });

  test("descarta las palabras que no caben en el tablero", () => {
    const { colocadas } = crearSopa(["ok", "toolongforthisgrid", "house"], 6);
    expect(colocadas.map((c) => c.palabra)).toEqual(["HOUSE"]);
  });

  test("no repite la misma palabra dos veces", () => {
    const { colocadas } = crearSopa(["house", "HOUSE", "house"], 10);
    expect(colocadas).toHaveLength(1);
  });
});

describe("leerSegmento", () => {
  const LETRAS = [
    ["A", "B", "C"],
    ["D", "E", "F"],
    ["G", "H", "I"],
  ];

  test("lee una fila de izquierda a derecha", () => {
    expect(leerSegmento(LETRAS, 0, 0, 0, 2)).toBe("ABC");
  });

  test("lee una columna hacia arriba", () => {
    expect(leerSegmento(LETRAS, 2, 0, 0, 0)).toBe("GDA");
  });

  test("lee una diagonal", () => {
    expect(leerSegmento(LETRAS, 0, 0, 2, 2)).toBe("AEI");
  });

  test("una selección torcida no vale", () => {
    expect(leerSegmento(LETRAS, 0, 0, 2, 1)).toBeNull();
  });

  test("salirse del tablero tampoco vale", () => {
    expect(leerSegmento(LETRAS, 0, 0, 0, 5)).toBeNull();
  });
});

describe("coincideColocada", () => {
  const COLOCADA = { palabra: "HOUSE", fila: 2, columna: 1, df: 0, dc: 1 };

  test("acierta seleccionando desde el principio", () => {
    expect(coincideColocada(COLOCADA, 2, 1, 2, 5)).toBe(true);
  });

  test("acierta seleccionando al revés", () => {
    expect(coincideColocada(COLOCADA, 2, 5, 2, 1)).toBe(true);
  });

  test("una selección que empieza a media palabra no cuenta", () => {
    expect(coincideColocada(COLOCADA, 2, 2, 2, 5)).toBe(false);
  });

  test("otra fila no cuenta", () => {
    expect(coincideColocada(COLOCADA, 3, 1, 3, 5)).toBe(false);
  });
});

describe("casillasDe", () => {
  test("devuelve una casilla por letra siguiendo la dirección", () => {
    const casillas = casillasDe({
      palabra: "ABC",
      fila: 0,
      columna: 0,
      df: 1,
      dc: 1,
    });
    expect(casillas).toEqual([
      { fila: 0, columna: 0 },
      { fila: 1, columna: 1 },
      { fila: 2, columna: 2 },
    ]);
  });
});
