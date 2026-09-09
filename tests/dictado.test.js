const {
  normalizar,
  compararDictado,
} = require("../src/backend/src/utils/textoDictado");

describe("normalizar", () => {
  test("pasa todo a minúsculas", () => {
    expect(normalizar("Hello World")).toBe("hello world");
  });

  test("quita la puntuación", () => {
    expect(normalizar("Hello, world! How are you?")).toBe(
      "hello world how are you",
    );
  });

  test("conserva los apóstrofes de las contracciones", () => {
    expect(normalizar("I don't know")).toBe("i don't know");
  });

  test("colapsa los espacios de más", () => {
    expect(normalizar("  too    many   spaces  ")).toBe("too many spaces");
  });

  test("quita las tildes", () => {
    expect(normalizar("café")).toBe("cafe");
  });

  test("aguanta valores vacíos sin reventar", () => {
    expect(normalizar(null)).toBe("");
    expect(normalizar(undefined)).toBe("");
    expect(normalizar("")).toBe("");
  });
});

describe("compararDictado", () => {
  const frase = "She goes to the market every Saturday morning.";

  test("da 100% cuando la respuesta es idéntica", () => {
    const r = compararDictado(frase, frase);
    expect(r.porcentaje).toBe(100);
    expect(r.aciertos).toBe(r.total);
    expect(r.detalle.every((d) => d.acerto)).toBe(true);
  });

  test("ignora mayúsculas y puntuación", () => {
    const r = compararDictado(
      frase,
      "she GOES to the market, every saturday morning!!",
    );
    expect(r.porcentaje).toBe(100);
  });

  test("marca en falso solo las palabras que faltan", () => {
    const r = compararDictado(frase, "she go to the market every sunday");
    const falladas = r.detalle.filter((d) => !d.acerto).map((d) => d.palabra);

    expect(falladas).toContain("goes");
    expect(falladas).toContain("saturday");
    expect(falladas).toContain("morning");
    expect(falladas).not.toContain("market");
  });

  test("no cuenta dos veces una palabra repetida por el usuario", () => {
    // "the" aparece una vez en la frase original
    const r = compararDictado("the cat sat", "the the the");
    expect(r.aciertos).toBe(1);
    expect(r.total).toBe(3);
  });

  test("da 0% con una respuesta vacía", () => {
    const r = compararDictado(frase, "");
    expect(r.porcentaje).toBe(0);
    expect(r.aciertos).toBe(0);
  });

  test("no divide por cero si la frase original está vacía", () => {
    const r = compararDictado("", "algo");
    expect(r.porcentaje).toBe(0);
    expect(r.total).toBe(0);
  });

  test("el porcentaje es coherente con los aciertos", () => {
    const r = compararDictado("one two three four", "one two");
    expect(r.total).toBe(4);
    expect(r.aciertos).toBe(2);
    expect(r.porcentaje).toBe(50);
  });
});
