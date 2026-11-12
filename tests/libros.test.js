const fs = require("fs");
const path = require("path");
const { LIBROS, obtenerLibro } = require("../src/backend/src/data/libros");
const { normalizarCapitulo, largoPorNivel, LINEAS_CAPITULO } = require("../src/backend/src/utils/libroCapitulo");
const { emparejarLineas } = require("../src/backend/src/utils/lineasBilingues");

const PORTADAS = path.join(__dirname, "..", "src", "frontend", "assets", "libros");

describe("estante de clásicos", () => {
  test("cada libro tiene identificador único, portada y capítulos con sus hechos", () => {
    const ids = LIBROS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    LIBROS.forEach((libro) => {
      expect(libro.id).toMatch(/^[a-z0-9-]+$/);
      expect(fs.existsSync(path.join(PORTADAS, `${libro.id}.webp`))).toBe(true);
      expect(libro.titulo && libro.tituloEs && libro.autor && libro.genero && libro.ambiente).toBeTruthy();
      expect(libro.capitulos.length).toBeGreaterThanOrEqual(3);
      libro.capitulos.forEach((c) => {
        expect(c.titulo && c.tituloEs).toBeTruthy();
        expect(c.hechos.length).toBeGreaterThan(120);
      });
    });
  });

  test("busca un libro por su identificador", () => {
    expect(obtenerLibro("house-of-usher").autor).toBe("Edgar Allan Poe");
    expect(obtenerLibro("no-existe")).toBeNull();
  });
});

describe("capítulo contado por la IA", () => {
  const lineas = ["One day a letter arrived.", "It was from Roderick.", "He was ill.", "I rode to his house.", "The house looked sad."];
  const traducciones = ["Un día llegó una carta.", "Era de Roderick.", "Estaba enfermo.", "Cabalgué a su casa.", "La casa se veía triste."];

  test("pasa con una traducción por línea", () => {
    const capitulo = normalizarCapitulo({ lineas, traducciones });
    expect(capitulo.lineas).toEqual(lineas);
    expect(capitulo.traducciones).toEqual(traducciones);
  });

  test("sin traducciones completas el capítulo sigue, sin español", () => {
    expect(normalizarCapitulo({ lineas, traducciones: traducciones.slice(1) }).traducciones).toBeNull();
  });

  test("con muy pocas líneas no se guarda", () => {
    expect(() => normalizarCapitulo({ lineas: lineas.slice(0, 3), traducciones: traducciones.slice(0, 3) })).toThrow();
    expect(() => normalizarCapitulo("nada")).toThrow();
  });

  test("nunca pasa más líneas de las que caben en un capítulo", () => {
    const muchas = Array.from({ length: 40 }, (_, i) => `Line number ${i + 1}.`);
    expect(normalizarCapitulo({ lineas: muchas }).lineas).toHaveLength(LINEAS_CAPITULO.maximas);
  });

  test("pide más líneas a medida que sube el nivel y entiende niveles raros", () => {
    expect(largoPorNivel("A1")).toMatch(/^8 to 10/);
    expect(largoPorNivel("C1")).toMatch(/^14 to 18/);
    expect(largoPorNivel("Z9")).toBe(largoPorNivel("B1"));
  });

  test("el emparejado limpia espacios y descarta la traducción que copia el inglés", () => {
    const r = emparejarLineas(["  Hello   there. ", "Bye."], ["Hola.", "Bye."], { minimas: 1, maximas: 5, largo: 50 });
    expect(r.lineas[0]).toBe("Hello there.");
    expect(r.traducciones).toBeNull();
  });
});
