const { normalizarEscena } = require("../src/backend/src/utils/escenaGuion");

const BASE = {
  titulo: "The Last Train",
  situacion: "A woman runs to catch the last train home.",
  lineas: ["Wait, please hold the door!", "I can't miss this train tonight.", "My sister is waiting for me.", "Thank you so much, sir."],
  traducciones: ["¡Espere, por favor sostenga la puerta!", "No puedo perder este tren esta noche.", "Mi hermana me está esperando.", "Muchas gracias, señor."],
};

describe("normalizarEscena", () => {
  test("deja pasar la escena con una traducción por línea", () => {
    const escena = normalizarEscena(BASE);
    expect(escena.lineas).toHaveLength(4);
    expect(escena.traducciones).toEqual(BASE.traducciones);
    expect(escena.titulo).toBe("The Last Train");
  });

  test("sin traducciones la escena sigue, con traducciones en null", () => {
    const { traducciones, ...sinTraducir } = BASE;
    expect(normalizarEscena(sinTraducir).traducciones).toBeNull();
  });

  test("si falta una traducción o sobran, no se muestran desalineadas", () => {
    expect(normalizarEscena({ ...BASE, traducciones: BASE.traducciones.slice(0, 3) }).traducciones).toBeNull();
    expect(normalizarEscena({ ...BASE, traducciones: [...BASE.traducciones, "Extra"] }).traducciones).toBeNull();
    expect(normalizarEscena({ ...BASE, traducciones: ["", ...BASE.traducciones.slice(1)] }).traducciones).toBeNull();
  });

  test("una traducción que solo copia el inglés no cuenta", () => {
    const copiada = [...BASE.traducciones];
    copiada[2] = BASE.lineas[2];
    expect(normalizarEscena({ ...BASE, traducciones: copiada }).traducciones).toBeNull();
  });

  test("limpia espacios, recorta textos largos y quita líneas vacías sin perder el orden", () => {
    const escena = normalizarEscena({
      ...BASE,
      titulo: "  The   Last Train ",
      lineas: ["  Wait,   please! ", "", "Go now.", "x".repeat(500), "Run!"],
      traducciones: ["¡Espera, por favor!", "", "Vete ya.", "y".repeat(500), "¡Corre!"],
    });
    expect(escena.titulo).toBe("The Last Train");
    expect(escena.lineas[0]).toBe("Wait, please!");
    expect(escena.lineas).toHaveLength(4);
    expect(escena.lineas[2].length).toBeLessThanOrEqual(220);
    expect(escena.traducciones).toEqual(["¡Espera, por favor!", "Vete ya.", "y".repeat(220), "¡Corre!"]);
  });

  test("con menos de tres líneas la escena no sirve", () => {
    expect(() => normalizarEscena({ ...BASE, lineas: ["Only one."], traducciones: ["Solo una."] })).toThrow();
    expect(() => normalizarEscena(null)).toThrow();
  });

  test("la búsqueda del video queda corta, en minúsculas y sin signos", () => {
    expect(normalizarEscena({ ...BASE, ambiente: "Rainy STREET-market, at night!!" }).ambiente).toBe("rainy street market at night");
    expect(normalizarEscena({ ...BASE, ambiente: "one two three four five six seven" }).ambiente).toBe("one two three four five");
    expect(normalizarEscena({ ...BASE, ambiente: 42 }).ambiente).toBe("");
  });

  test("sin título usa uno genérico y nunca pasa algo que no sea texto", () => {
    const escena = normalizarEscena({ lineas: BASE.lineas, situacion: { malo: true } });
    expect(escena.titulo).toBe("Your scene");
    expect(escena.situacion).toBe("");
  });
});
