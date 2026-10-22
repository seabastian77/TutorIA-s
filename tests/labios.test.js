const Labios = require("../src/frontend/src/utils/labios");

describe("Sincronía de labios del avatar", () => {
  test("el silencio deja la boca cerrada y la voz fuerte la abre", () => {
    expect(Labios.nivelDesdeMuestras(new Float32Array(256))).toBe(0);
    expect(Labios.aperturaDesdeNivel(0)).toBe(0);
    expect(Labios.aperturaDesdeNivel(0.005)).toBe(0);
    expect(Labios.aperturaDesdeNivel(0.5)).toBe(1);
    const media = Labios.aperturaDesdeNivel(0.1);
    expect(media).toBeGreaterThan(0.3);
    expect(media).toBeLessThan(1);
  });

  test("el volumen de una onda senoidal es su amplitud sobre raíz de dos", () => {
    const onda = Float32Array.from({ length: 1000 }, (_, i) => 0.5 * Math.sin((i / 1000) * Math.PI * 20));
    expect(Labios.nivelDesdeMuestras(onda)).toBeCloseTo(0.5 / Math.SQRT2, 2);
  });

  test("la boca abre más rápido de lo que cierra", () => {
    const abre = Labios.suavizar(0, 1);
    const cierra = 1 - Labios.suavizar(1, 0);
    expect(abre).toBeGreaterThan(cierra);
  });

  test("los agudos estiran la boca y los graves la redondean", () => {
    const fs = 48000;
    const fft = 1024;
    const bins = (desde, hasta) => Array.from({ length: fft / 2 }, (_, i) => {
      const hz = (i * fs) / fft;
      return hz >= desde && hz < hasta ? 200 : 0;
    });
    expect(Labios.anchuraDesdeEspectro(bins(2000, 5000), fs, fft)).toBe(1);
    expect(Labios.anchuraDesdeEspectro(bins(250, 1000), fs, fft)).toBe(0);
    expect(Labios.anchuraDesdeEspectro([], fs, fft)).toBe(0.5);
  });

  test("cuenta sílabas y estima cuánto dura una frase", () => {
    expect(Labios.silabasDePalabra("hello")).toBe(2);
    expect(Labios.silabasDePalabra("make")).toBe(1);
    expect(Labios.silabasDePalabra("123")).toBe(0);
    expect(Labios.silabasDe("How are you today?")).toBe(5);
    const corta = Labios.duracionEstimada("Hi there");
    const larga = Labios.duracionEstimada("Hi there, how are you doing this beautiful morning?");
    expect(larga).toBeGreaterThan(corta);
    expect(Labios.duracionEstimada("Hi there", 0.5)).toBeGreaterThan(corta);
  });

  test("la apertura sintética siempre queda entre 0 y 1", () => {
    for (let ms = 0; ms < 3000; ms += 37) {
      const a = Labios.aperturaSintetica(ms, 3);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
    }
  });

  test("la boca cerrada no tiene alto y la abierta deja ver dientes", () => {
    const cerrada = Labios.formaDeBoca({ abierta: 0 });
    const abierta = Labios.formaDeBoca({ abierta: 1 });
    expect(cerrada.alto).toBe(0);
    expect(abierta.alto).toBe(20);
    expect(abierta.dientesAlto).toBeGreaterThan(0);
    expect(cerrada.interior).toMatch(/^M-?\d/);
    expect(Labios.formaDeBoca({ ancha: 1 }).semiancho).toBeGreaterThan(Labios.formaDeBoca({ ancha: 0 }).semiancho);
  });

  test("convierte audio a PCM16 de 16 kHz para el proveedor de video", () => {
    const muestras = Float32Array.from({ length: 48000 }, () => 1);
    const pcm = Labios.aPcm16(muestras, 48000);
    expect(pcm).toBeInstanceOf(Uint8Array);
    expect(pcm.length).toBe(16000 * 2);
    const vista = new DataView(pcm.buffer);
    expect(vista.getInt16(0, true)).toBe(0x7fff);
    const negativo = Labios.aPcm16(Float32Array.from([-1, -1, -1]), 16000);
    expect(new DataView(negativo.buffer).getInt16(0, true)).toBe(-0x8000);
    const saturado = Labios.aPcm16(Float32Array.from([3]), 16000);
    expect(new DataView(saturado.buffer).getInt16(0, true)).toBe(0x7fff);
  });
});
