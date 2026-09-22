// Comprueba la voz de mujer de Tuti y el micrófono dentro de la charla
const { chromium } = require("playwright");
const ESPERA = (ms) => new Promise((r) => setTimeout(r, ms));

// Un Windows típico: David (hombre, la que salía antes), Zira, Pablo y Sabina
const ENTORNO_FALSO = `
  window.__dichos = [];
  const VOCES = [
    { name: "Microsoft David - English (United States)", lang: "en-US", localService: true, default: true },
    { name: "Microsoft Zira - English (United States)", lang: "en-US", localService: true },
    { name: "Microsoft Pablo - Spanish (Spain)", lang: "es-ES", localService: true },
    { name: "Microsoft Sabina - Spanish (Mexico)", lang: "es-MX", localService: true },
  ];
  const falso = {
    getVoices: () => VOCES,
    speak: (u) => {
      window.__dichos.push({ texto: u.text, voz: u.voice && u.voice.name, lang: u.lang });
      if (u.onstart) u.onstart();
      setTimeout(() => u.onend && u.onend(), 60);
    },
    cancel: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    onvoiceschanged: null,
  };
  Object.defineProperty(window, "speechSynthesis", { value: falso, configurable: true });
  window.SpeechSynthesisUtterance = function (texto) {
    this.text = texto;
    this.lang = "en-US";
    this.rate = 1;
    this.voice = null;
  };

  // Un micrófono de mentiras que "oye" lo que diga window.__loQueDijo
  window.__loQueDijo = { transcript: "i want to speak better english", confidence: 0.91 };
  window.SpeechRecognition = function () {
    this.lang = "en-US";
    this.start = () => {
      window.__micAbierto = true;
      setTimeout(() => {
        window.__micAbierto = false;
        this.onresult && this.onresult({ results: [[window.__loQueDijo]] });
        this.onend && this.onend();
      }, 150);
    };
    this.stop = () => { window.__micAbierto = false; };
  };
`;

const MEDIR_CONTROLES = () => {
      const lum = (c) => {
        const [r, g, b] = c.map((v) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const num = (s) => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
      const ratio = (a, b) => {
        const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
        return (x + 0.05) / (y + 0.05);
      };
      const fondo = (el) => {
        let n = el;
        while (n && n !== document.documentElement) {
          const q = (getComputedStyle(n).backgroundColor.match(/\d+(\.\d+)?/g) || []).map(Number);
          if (q.length >= 3 && (q[3] === undefined || q[3] > 0.7)) return q.slice(0, 3);
          n = n.parentElement;
        }
        return [255, 255, 255];
      };
      const mic = document.getElementById("charla-mic");
      const oyendo = mic.classList.contains("oyendo");
      return oyendo
        ? {
            micOyendoTexto: ratio(num(getComputedStyle(mic).color), num(getComputedStyle(mic).backgroundColor)).toFixed(2),
            micOyendoFondo: ratio(num(getComputedStyle(mic).backgroundColor), fondo(mic.parentElement)).toFixed(2),
          }
        : {
            micQuietoBorde: ratio(num(getComputedStyle(mic).borderColor), fondo(mic)).toFixed(2),
          };
};

(async () => {
  const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

  for (const [tema, ancho, alto] of [["claro", 1280, 900], ["oscuro", 1280, 900], ["movil", 390, 780]]) {
    const p = await nav.newPage({ viewport: { width: ancho, height: alto } });
    const errores = [];
    p.on("pageerror", (e) => errores.push(String(e)));
    await p.addInitScript(ENTORNO_FALSO);

    await p.goto("http://localhost:8080/index.html");
    await p.click("#tab-registro");
    await p.fill("#registro-nombre", "Sebas");
    await p.fill("#registro-correo", `voz${tema}${Date.now()}@t4.com`);
    await p.fill("#registro-contrasena", "123456");
    await p.check("#registro-politica");
    await p.click("#form-registro button[type=submit]");
    await p.waitForSelector("#vista-principal:not(.oculto)");
    if (tema === "oscuro") {
      await p.click("#btn-tema");
      await ESPERA(300);
    }

    // Tuti saluda por escrito: en la charla no habla nadie
    await p.waitForSelector("#mentor-avatar");
    if (await p.locator("#mentor.encogido").count()) await p.click("#mentor-avatar");
    await p.click("#mentor-abrir-charla");
    await p.waitForSelector(".charla-suyo:not(.charla-pensando)");
    await ESPERA(250);
    console.log(tema, "| Tuti calla al saludar:", (await p.evaluate(() => window.__dichos.length)) === 0);

    // El micrófono: hablarle en vez de escribirle
    const tam = await p.locator("#charla-mic").boundingBox();
    console.log(tema, "| micrófono:", Math.round(tam.width) + "x" + Math.round(tam.height));

    const enviado = await p.evaluate(async () => {
      const original = window.fetch;
      let cuerpo = null;
      window.fetch = async (u, o) => {
        if (String(u).includes("/mentor/charla")) cuerpo = JSON.parse(o.body);
        return original(u, o);
      };
      document.getElementById("charla-mic").click();
      await new Promise((r) => setTimeout(r, 1500));
      window.fetch = original;
      return cuerpo;
    });
    console.log(
      tema,
      "| al backend | hablado:", enviado && enviado.hablado,
      "| claridad:", enviado && enviado.claridad,
      "| mensaje:", enviado && enviado.mensaje,
    );

    const mio = (await p.locator(".charla-mio .charla-globo").last().textContent()).trim();
    console.log(tema, "| lo que oyó quedó escrito:", mio);

    // Un mensaje escrito no puede ir marcado como hablado
    const escrito = await p.evaluate(async () => {
      const original = window.fetch;
      let cuerpo = null;
      window.fetch = async (u, o) => {
        if (String(u).includes("/mentor/charla")) cuerpo = JSON.parse(o.body);
        return original(u, o);
      };
      document.getElementById("charla-entrada").value = "hello there";
      document.getElementById("charla-enviar").click();
      await new Promise((r) => setTimeout(r, 1200));
      window.fetch = original;
      return cuerpo;
    });
    console.log(tema, "| escrito manda hablado:", escrito && escrito.hablado);

    // Ni al responder: la charla es solo texto
    console.log(tema, "| nada sonó en toda la charla:", (await p.evaluate(() => window.__dichos.length)) === 0);
    console.log(tema, "| ya no hay bocina:", (await p.locator("#charla-voz").count()) === 0);

    await p.screenshot({ path: `/tmp/voz-${tema}.png` });

    // Contraste de los botones nuevos contra el fondo que les toca
    const contraste = await p.evaluate(MEDIR_CONTROLES);
    await p.evaluate(() => document.getElementById("charla-mic").classList.add("oyendo"));
    await ESPERA(400);
    const contrasteOyendo = await p.evaluate(MEDIR_CONTROLES);
    await p.evaluate(() => document.getElementById("charla-mic").classList.remove("oyendo"));
    console.log(tema, "| contraste (>=3):", JSON.stringify(contraste), JSON.stringify(contrasteOyendo));

    // Los otros módulos siguen leyendo inglés, y ahora con voz de mujer
    await p.click("#charla-cerrar");
    const ingles = await p.evaluate(() => {
      window.__dichos = [];
      hablarIngles("This is the dictation sentence");
      hablar("Hi there, how are you?");
      return window.__dichos.map((d) => ({ voz: d.voz, lang: d.lang }));
    });
    console.log(tema, "| Audio Lab y Talk to the AI leen con:", JSON.stringify(ingles));

    console.log(tema, "| errores de JS:", errores.length, errores.slice(0, 2));
    await p.close();
  }

  await nav.close();
})();
