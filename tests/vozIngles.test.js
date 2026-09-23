const { elegirVoz, elegirVozIngles, prepararVoz } = require("../src/frontend/src/utils/vozIngles");

const voz = (name, lang, extra = {}) => ({ name, lang, localService: true, ...extra });

// Lo que suele traer un Windows con Edge o Chrome instalados
const WINDOWS = [
  voz("Microsoft David - English (United States)", "en-US", { default: true }),
  voz("Microsoft Zira - English (United States)", "en-US"),
  voz("Microsoft Sabina - Spanish (Mexico)", "es-MX"),
];

describe("elegirVozIngles", () => {
  test("entre David y Zira escoge a Zira", () => {
    expect(elegirVozIngles(WINDOWS).name).toContain("Zira");
  });

  test("nunca devuelve una voz que no sea inglesa", () => {
    const soloEspanol = [voz("Microsoft Sabina", "es-MX"), voz("Google español", "es-ES")];
    expect(elegirVozIngles(soloEspanol)).toBeNull();
  });

  test("prefiere una voz natural de mujer sobre la vieja del sistema", () => {
    const lista = [
      voz("Microsoft Zira - English (United States)", "en-US"),
      voz("Microsoft Aria Online (Natural) - English (United States)", "en-US", {
        localService: false,
      }),
    ];
    expect(elegirVozIngles(lista).name).toContain("Aria");
  });

  test("una voz natural de hombre no le gana a una de mujer", () => {
    const lista = [
      voz("Microsoft Guy Online (Natural) - English (United States)", "en-US", {
        localService: false,
      }),
      voz("Microsoft Zira - English (United States)", "en-US"),
    ];
    expect(elegirVozIngles(lista).name).toContain("Zira");
  });

  test("respeta el campo gender cuando el navegador lo trae", () => {
    const lista = [
      voz("Voice 1", "en-US", { gender: "male" }),
      voz("Voice 2", "en-US", { gender: "female" }),
    ];
    expect(elegirVozIngles(lista).name).toBe("Voice 2");
  });

  test("si solo hay voces de hombre devuelve una, no se queda muda", () => {
    const lista = [voz("Microsoft David", "en-US"), voz("Microsoft Mark", "en-US")];
    expect(elegirVozIngles(lista)).not.toBeNull();
  });

  test("entre variantes del inglés prefiere la de Estados Unidos", () => {
    const lista = [
      voz("Karen", "en-AU"),
      voz("Moira", "en-IE"),
      voz("Samantha", "en-US"),
    ];
    expect(elegirVozIngles(lista).name).toBe("Samantha");
  });

  test("en Chrome de Windows prefiere la voz de Google, que se entiende mejor que Zira", () => {
    const lista = [
      ...WINDOWS,
      voz("Google US English", "en-US", { localService: false }),
      voz("Google UK English Male", "en-GB", { localService: false }),
    ];
    expect(elegirVozIngles(lista).name).toBe("Google US English");
  });

  test("\"Female\" no se confunde con \"Male\"", () => {
    const lista = [
      voz("Google UK English Male", "en-GB", { localService: false }),
      voz("Google UK English Female", "en-GB", { localService: false }),
    ];
    expect(elegirVozIngles(lista).name).toBe("Google UK English Female");
  });

  test("con la lista vacía o con basura no revienta", () => {
    [[], null, undefined, "voces", 7].forEach((malo) => {
      expect(elegirVozIngles(malo)).toBeNull();
    });
  });

  test("aguanta voces sin nombre o sin idioma", () => {
    const lista = [{}, { name: "Zira", lang: "en-US" }, { lang: null }];
    expect(elegirVozIngles(lista).name).toBe("Zira");
  });
});

describe("elegirVoz en español", () => {
  test("Tuti hablando español no usa una voz inglesa", () => {
    const v = elegirVoz(WINDOWS, "es");
    expect(v.lang).toMatch(/^es/);
  });

  test("entre Pablo y Sabina escoge a Sabina", () => {
    const lista = [voz("Microsoft Pablo", "es-ES"), voz("Microsoft Sabina", "es-MX")];
    expect(elegirVoz(lista, "es").name).toContain("Sabina");
  });

  test("sin voces del idioma pedido devuelve null en vez de una cualquiera", () => {
    expect(elegirVoz([voz("Zira", "en-US")], "es")).toBeNull();
  });

  test("aguanta el guion bajo que usan algunos navegadores", () => {
    expect(elegirVoz([voz("Helena", "es_ES")], "es").name).toBe("Helena");
  });
});

describe("prepararVoz", () => {
  test("le pone la voz y su idioma a la utterance", () => {
    const u = { lang: "en-US" };
    prepararVoz(u, WINDOWS);
    expect(u.voice.name).toContain("Zira");
    expect(u.lang).toBe("en-US");
  });

  test("sin voces inglesas deja la utterance como estaba", () => {
    const u = { lang: "en-US" };
    prepararVoz(u, [voz("Sabina", "es-MX")]);
    expect(u.voice).toBeUndefined();
    expect(u.lang).toBe("en-US");
  });

  test("toma el idioma real de la voz escogida", () => {
    const u = { lang: "en-US" };
    prepararVoz(u, [voz("Hazel", "en-GB")]);
    expect(u.lang).toBe("en-GB");
  });
});
