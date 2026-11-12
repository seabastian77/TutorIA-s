// Lectura guiada: parte una línea en palabras y calcula cuál va sonando mientras se lee en voz alta

const LecturaGuiada = (() => {
  // Las mismas letras que el comparador de pronunciación cuenta como parte de una palabra
  const PIEZA_PALABRA = /[A-Za-z0-9À-ÖØ-öø-ÿ'’‘]+/g;

  /** Separa el texto en piezas: las palabras, con su posición en el texto, y lo que va entre ellas. */
  function partirEnPiezas(texto) {
    const fuente = String(texto || "");
    const piezas = [];
    let ultimo = 0;
    for (const m of fuente.matchAll(PIEZA_PALABRA)) {
      if (m.index > ultimo) piezas.push({ texto: fuente.slice(ultimo, m.index), palabra: false });
      piezas.push({ texto: m[0], palabra: true, inicio: m.index, fin: m.index + m[0].length });
      ultimo = m.index + m[0].length;
    }
    if (ultimo < fuente.length) piezas.push({ texto: fuente.slice(ultimo), palabra: false });
    return piezas;
  }

  /** Peso de una palabra al leerla: sus sílabas aproximadas más la pausa de la puntuación que la sigue. */
  function pesoDePalabra(palabra, despues = "") {
    const letras = String(palabra).toLowerCase().replace(/[^a-z]/g, "");
    const grupos = letras.replace(/e$/, "").match(/[aeiouy]+/g);
    const silabas = /\d/.test(palabra)
      ? Math.max(1, String(palabra).replace(/\D/g, "").length)
      : Math.max(1, grupos ? grupos.length : 1);
    const pausa = /[.!?…]/.test(despues) ? 2 : /[,;:—–]/.test(despues) ? 1 : 0;
    return silabas + 0.5 + pausa;
  }

  /** Pesos de todas las palabras de la línea, en orden. */
  function pesosDe(piezas) {
    const pesos = [];
    piezas.forEach((pieza, i) => {
      if (!pieza.palabra) return;
      const siguiente = piezas[i + 1] && !piezas[i + 1].palabra ? piezas[i + 1].texto : "";
      pesos.push(pesoDePalabra(pieza.texto, siguiente));
    });
    return pesos;
  }

  /** Reparte el audio entre las palabras: para cada una, la fracción (0 a 1) en la que empieza a sonar. */
  function marcasDeTiempo(piezas) {
    const pesos = pesosDe(piezas);
    const total = pesos.reduce((suma, peso) => suma + peso, 0) || 1;
    let acumulado = 0;
    return pesos.map((peso) => {
      const inicio = acumulado / total;
      acumulado += peso;
      return inicio;
    });
  }

  /** Índice de la palabra que suena en una fracción del audio; -1 si la línea no tiene palabras. */
  function palabraEnFraccion(marcas, fraccion) {
    let indice = marcas.length ? 0 : -1;
    for (let i = 0; i < marcas.length && marcas[i] <= fraccion; i += 1) indice = i;
    return indice;
  }

  /** Índice de la palabra que la voz del navegador avisa por su posición en el texto. */
  function palabraEnCaracter(piezas, caracter) {
    let indice = -1;
    for (const pieza of piezas) {
      if (!pieza.palabra) continue;
      indice += 1;
      if (pieza.fin > caracter) return indice;
    }
    return indice;
  }

  /** Avance del audio descontando el silencio que la voz deja al principio y al final. */
  function fraccionDeAudio(tiempo, duracion) {
    if (!(duracion > 0) || !Number.isFinite(duracion)) return 0;
    const antes = Math.min(0.12, duracion * 0.05);
    const despues = Math.min(0.3, duracion * 0.08);
    const util = Math.max(0.01, duracion - antes - despues);
    return Math.min(1, Math.max(0, (tiempo - antes) / util));
  }

  /** Cuánto tarda la línea leída a esa velocidad, para marcar las palabras cuando la voz no avisa. */
  function duracionEstimada(piezas, velocidad = 1) {
    const total = pesosDe(piezas).reduce((suma, peso) => suma + peso, 0);
    return Math.round((total * 230 + 300) / Math.max(0.5, velocidad));
  }

  return {
    partirEnPiezas, pesoDePalabra, marcasDeTiempo, palabraEnFraccion, palabraEnCaracter,
    fraccionDeAudio, duracionEstimada,
  };
})();

if (typeof window !== "undefined") window.LecturaGuiada = LecturaGuiada;
if (typeof module !== "undefined" && module.exports) module.exports = LecturaGuiada;
