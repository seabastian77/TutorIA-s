// Las voces de Google: que se usen cuando están y que no dejen muda la app si no
const { chromium } = require("playwright");
const ESPERA = (ms) => new Promise((r) => setTimeout(r, ms));

// Micrófono y voz del navegador de mentiras, para ver a cuál de los dos se va
const ENTORNO = `
  window.__navegadorHablo = [];
  window.__audioSono = [];
  const VOCES = [
    { name: "Microsoft David - English (United States)", lang: "en-US", localService: true },
    { name: "Microsoft Zira - English (United States)", lang: "en-US", localService: true },
  ];
  Object.defineProperty(window, "speechSynthesis", {
    value: {
      getVoices: () => VOCES,
      speak: (u) => window.__navegadorHablo.push({ texto: u.text, voz: u.voice && u.voice.name }),
      cancel: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    configurable: true,
  });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; this.lang = "en-US"; this.rate = 1; };

  // Se anota qué audio se mandó a reproducir, sin sonar de verdad
  const AudioReal = window.Audio;
  window.Audio = function (src) {
    window.__audioSono.push(String(src).slice(0, 40));
    return { play: () => Promise.resolve(), pause: () => {} };
  };
`;

(async () => {
  const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const p = await nav.newPage({ viewport: { width: 1280, height: 900 } });
  const errores = [];
  p.on("pageerror", (e) => errores.push(String(e)));
  await p.addInitScript(ENTORNO);

  await p.goto("http://localhost:8080/index.html");
  await p.click("#tab-registro");
  await p.fill("#registro-nombre", "Sebas");
  await p.fill("#registro-correo", `tts${Date.now()}@t4.com`);
  await p.fill("#registro-contrasena", "123456");
  await p.check("#registro-politica");
  await p.click("#form-registro button[type=submit]");
  await p.waitForSelector("#vista-principal:not(.oculto)");
  await ESPERA(800); // que alcance a leer la configuración del servidor

  console.log("la app sabe que hay voces de Google:",
    await p.evaluate(() => VozIngles.leer && true));

  // Con Google encendido
  await p.evaluate(() => { window.__audioSono = []; window.__navegadorHablo = []; });
  await p.evaluate(() => VozIngles.leer("This is the dictation sentence", { idioma: "en" }));
  await ESPERA(900);
  let r = await p.evaluate(() => ({ audio: window.__audioSono, navegador: window.__navegadorHablo }));
  console.log("1. sonó con audio de Google:", r.audio.length === 1, "|", r.audio[0]);
  console.log("2. no usó la voz del navegador:", r.navegador.length === 0);

  // El dictado lento tiene que pedir otra velocidad, no el mismo audio
  await p.evaluate(() => { window.__audioSono = []; });
  await p.evaluate(() => VozIngles.leer("Slow one", { idioma: "en", velocidad: 0.6 }));
  await ESPERA(900);
  console.log("3. la versión lenta también sale por Google:",
    (await p.evaluate(() => window.__audioSono.length)) === 1);

  // Si Google no responde, la app no se puede quedar muda
  await p.route("**/voz/hablar", (ruta) => ruta.fulfill({
    status: 200, contentType: "application/json", body: '{"audio":null,"motivo":"fallo"}',
  }));
  await p.evaluate(() => { window.__audioSono = []; window.__navegadorHablo = []; });
  await p.evaluate(() => VozIngles.leer("Fallback please", { idioma: "en" }));
  await ESPERA(900);
  r = await p.evaluate(() => ({ audio: window.__audioSono, navegador: window.__navegadorHablo }));
  console.log("4. si Google falla, lee el navegador:", r.navegador.length === 1);
  console.log("5. y lo hace con voz de mujer:", r.navegador[0] && r.navegador[0].voz);

  // Y si la petición revienta del todo, igual
  await p.route("**/voz/hablar", (ruta) => ruta.abort());
  await p.evaluate(() => { window.__audioSono = []; window.__navegadorHablo = []; });
  await p.evaluate(() => VozIngles.leer("Network down", { idioma: "en" }));
  await ESPERA(900);
  console.log("6. si se cae la red, también lee el navegador:",
    (await p.evaluate(() => window.__navegadorHablo.length)) === 1);

  console.log("errores de JS:", errores.length, errores.slice(0, 2));
  await nav.close();
})();
