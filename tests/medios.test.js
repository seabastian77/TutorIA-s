const {
  normalizarFoto,
  normalizarVideo,
  extraerJSON,
} = require("../src/backend/src/utils/medioFormato");

const FOTO = {
  id: 4321,
  photographer: "Ana Pérez",
  photographer_url: "https://www.pexels.com/@ana",
  src: {
    original: "https://images.pexels.com/foto-original.jpg",
    large: "https://images.pexels.com/foto-large.jpg",
    medium: "https://images.pexels.com/foto-medium.jpg",
  },
};

describe("normalizarFoto", () => {
  test("se queda con la versión grande y con el crédito", () => {
    expect(normalizarFoto(FOTO)).toEqual({
      proveedorId: "4321",
      url: "https://images.pexels.com/foto-large.jpg",
      urlMiniatura: "https://images.pexels.com/foto-medium.jpg",
      autor: "Ana Pérez",
      autorUrl: "https://www.pexels.com/@ana",
    });
  });

  test("si no hay versión grande usa la original", () => {
    const sinLarge = { ...FOTO, src: { original: "https://x/o.jpg" } };
    expect(normalizarFoto(sinLarge).url).toBe("https://x/o.jpg");
  });

  test("una foto sin ninguna URL se descarta", () => {
    expect(normalizarFoto({ id: 1, src: {} })).toBeNull();
    expect(normalizarFoto(null)).toBeNull();
  });

  test("el id siempre sale como texto", () => {
    expect(typeof normalizarFoto(FOTO).proveedorId).toBe("string");
  });
});

describe("normalizarVideo", () => {
  const VIDEO = {
    id: 99,
    image: "https://x/portada.jpg",
    user: { name: "Luis", url: "https://www.pexels.com/@luis" },
    video_files: [
      { file_type: "video/mp4", width: 1920, link: "https://x/1920.mp4" },
      { file_type: "video/mp4", width: 640, link: "https://x/640.mp4" },
      { file_type: "video/mp4", width: 1280, link: "https://x/1280.mp4" },
    ],
  };

  test("elige el archivo más liviano de los aceptables", () => {
    // El de fondo no necesita full HD y así pesa menos para el estudiante
    expect(normalizarVideo(VIDEO).url).toBe("https://x/640.mp4");
  });

  test("descarta los formatos que no son mp4", () => {
    const conWebm = {
      ...VIDEO,
      video_files: [
        { file_type: "video/webm", width: 640, link: "https://x/no.webm" },
        { file_type: "video/mp4", width: 1280, link: "https://x/si.mp4" },
      ],
    };
    expect(normalizarVideo(conWebm).url).toBe("https://x/si.mp4");
  });

  test("un video sin archivos se descarta", () => {
    expect(normalizarVideo({ id: 5, video_files: [] })).toBeNull();
    expect(normalizarVideo(null)).toBeNull();
  });

  test("guarda el crédito del autor", () => {
    const r = normalizarVideo(VIDEO);
    expect(r.autor).toBe("Luis");
    expect(r.autorUrl).toBe("https://www.pexels.com/@luis");
  });
});

describe("extraerJSON", () => {
  test("lee un JSON pelado", () => {
    expect(extraerJSON('{"precision": 80}')).toEqual({ precision: 80 });
  });

  test("lee un JSON envuelto en vallas de código", () => {
    const texto = '```json\n{"precision": 42}\n```';
    expect(extraerJSON(texto)).toEqual({ precision: 42 });
  });

  test("lee un JSON con texto del modelo alrededor", () => {
    const texto = 'Claro, aquí tienes:\n{"adecuada": true}\nEspero que sirva.';
    expect(extraerJSON(texto)).toEqual({ adecuada: true });
  });

  test("una respuesta sin JSON avisa con un error claro", () => {
    expect(() => extraerJSON("no encontré nada")).toThrow("no devolvió JSON");
  });

  test("una respuesta vacía también falla de forma controlada", () => {
    expect(() => extraerJSON("")).toThrow();
    expect(() => extraerJSON(null)).toThrow();
  });
});
