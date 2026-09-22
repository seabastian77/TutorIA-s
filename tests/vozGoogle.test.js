const {
  LARGO_MAXIMO,
  limpiarTexto,
  idiomaValido,
  vozPreferida,
  velocidadValida,
  cuerpoDeSintesis,
  claveDeCache,
} = require("../src/backend/src/utils/vozGoogle");

describe("limpiarTexto", () => {
  test("deja una sola línea", () => {
    expect(limpiarTexto("  hola\n\n  mundo ")).toBe("hola mundo");
  });

  test("corta lo que se pase del tope, que es lo que se cobra", () => {
    expect(limpiarTexto("a".repeat(2000))).toHaveLength(LARGO_MAXIMO);
  });

  test("aguanta null sin reventar", () => {
    expect(limpiarTexto(null)).toBe("");
    expect(limpiarTexto(undefined)).toBe("");
  });
});

describe("idiomaValido", () => {
  test("acepta los dos que usa la app", () => {
    expect(idiomaValido("en")).toBe("en");
    expect(idiomaValido("es")).toBe("es");
  });

  test("entiende la variante larga", () => {
    expect(idiomaValido("es-CO")).toBe("es");
    expect(idiomaValido("en-GB")).toBe("en");
  });

  test("lo que no conoce cae a inglés, que es lo que más se lee", () => {
    ["fr", "", null, 7, "klingon"].forEach((malo) => {
      expect(idiomaValido(malo)).toBe("en");
    });
  });
});

describe("velocidadValida", () => {
  test("deja pasar la normal y la lenta del dictado", () => {
    expect(velocidadValida(1)).toBe(1);
    expect(velocidadValida(0.6)).toBe(0.6);
  });

  test("encierra lo que se salga de lo que acepta Google", () => {
    expect(velocidadValida(0.1)).toBe(0.5);
    expect(velocidadValida(9)).toBe(1.5);
  });

  test("lo que no es número vale 1", () => {
    [null, undefined, "rápido", NaN, 0, -2].forEach((malo) => {
      expect(velocidadValida(malo)).toBe(1);
    });
  });
});

describe("cuerpoDeSintesis", () => {
  test("pide voz de mujer del idioma correcto", () => {
    const c = cuerpoDeSintesis("hello", "en", 1);
    expect(c.voice.languageCode).toBe("en-US");
    expect(c.voice.ssmlGender).toBe("FEMALE");
    expect(c.voice.name).toContain("en-US");
  });

  test("en español pide una voz española, no una gringa leyendo español", () => {
    expect(cuerpoDeSintesis("hola", "es", 1).voice.languageCode).toMatch(/^es/);
  });

  test("sin nombre de voz queda el pedido de reintento, solo idioma y género", () => {
    const c = cuerpoDeSintesis("hello", "en", 1, false);
    expect(c.voice.name).toBeUndefined();
    expect(c.voice.ssmlGender).toBe("FEMALE");
    expect(c.voice.languageCode).toBe("en-US");
  });

  test("el texto va limpio y recortado", () => {
    expect(cuerpoDeSintesis("  a\n\nb  ", "en", 1).input.text).toBe("a b");
  });

  test("la velocidad viaja encerrada", () => {
    expect(cuerpoDeSintesis("x", "en", 99).audioConfig.speakingRate).toBe(1.5);
  });

  test("pide mp3, que es lo que el navegador reproduce derecho", () => {
    expect(cuerpoDeSintesis("x", "en", 1).audioConfig.audioEncoding).toBe("MP3");
  });
});

describe("claveDeCache", () => {
  test("lo mismo dicho igual da la misma llave: no se paga dos veces", () => {
    expect(claveDeCache("hello", "en", 1)).toBe(claveDeCache("  hello  ", "en", 1));
  });

  test("distinta velocidad es distinto audio", () => {
    expect(claveDeCache("hello", "en", 1)).not.toBe(claveDeCache("hello", "en", 0.6));
  });

  test("distinto idioma es distinto audio", () => {
    expect(claveDeCache("hello", "en", 1)).not.toBe(claveDeCache("hello", "es", 1));
  });
});

describe("vozPreferida", () => {
  test("trae idioma y nombre para los dos", () => {
    ["en", "es"].forEach((i) => {
      expect(vozPreferida(i).idioma).toBeTruthy();
      expect(vozPreferida(i).nombre).toBeTruthy();
    });
  });
});
