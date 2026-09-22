const { chromium } = require("playwright");
const ESPERA = (ms) => new Promise((r) => setTimeout(r, ms));

// Mide el contraste real de cada texto visible contra el fondo que le toca
const MEDIR = () => {
  const lum = (c) => {
    const [r, g, b] = c.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const rgb = (s) => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
  const opaco = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const f = getComputedStyle(n).backgroundColor;
      const p = (f.match(/\d+(\.\d+)?/g) || []).map(Number);
      if (p.length >= 3 && (p[3] === undefined || p[3] > 0.7)) return p.slice(0, 3);
      n = n.parentElement;
    }
    return [255, 255, 255];
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
    return (x + 0.05) / (y + 0.05);
  };
  const malos = [];
  document.querySelectorAll("#mentor-charla *, #mentor-abrir-charla, #mentor-abrir-charla *").forEach((el) => {
    const texto = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join("");
    if (!texto) return;
    const e = getComputedStyle(el);
    if (e.display === "none" || e.visibility === "hidden" || Number(e.opacity) < 0.2) return;
    if (el.closest(".sr-solo")) return;
    const r = ratio(rgb(e.color), opaco(el));
    const grande = parseFloat(e.fontSize) >= 24 || (parseFloat(e.fontSize) >= 18.66 && Number(e.fontWeight) >= 700);
    if (r < (grande ? 3 : 4.5)) {
      malos.push({ sel: String(el.tagName) + '.' + (typeof el.className === 'string' ? el.className : ''), texto: texto.slice(0, 30), ratio: r.toFixed(2) });
    }
  });
  return malos;
};

(async () => {
  const navegador = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

  for (const [tema, ancho, alto] of [["claro", 1280, 900], ["oscuro", 1280, 900], ["movil", 390, 780]]) {
    const pagina = await navegador.newPage({ viewport: { width: ancho, height: alto } });
    const errores = [];
    pagina.on("pageerror", (e) => errores.push(String(e)));
    pagina.on("console", (m) => m.type() === "error" && errores.push("console: " + m.text()));

    await pagina.goto("http://localhost:8080/index.html");
    await pagina.click("#tab-registro");
    await pagina.fill("#registro-nombre", "Sebas");
    await pagina.fill("#registro-correo", `charla${tema}${Date.now()}@t4.com`);
    await pagina.fill("#registro-contrasena", "123456");
    await pagina.check("#registro-politica");
    await pagina.click("#form-registro button[type=submit]");
    await pagina.waitForSelector("#vista-principal:not(.oculto)");

    if (tema === "oscuro") {
      await pagina.click("#btn-tema");
      await ESPERA(350);
    }

    await pagina.waitForSelector("#mentor-abrir-charla");
    const tam = await pagina.locator("#mentor-abrir-charla").boundingBox();
    console.log(tema, "| botón de charla:", Math.round(tam.width) + "x" + Math.round(tam.height));

    await pagina.click("#mentor-abrir-charla");
    await pagina.waitForSelector("#mentor-charla:not(.oculto)");
    await pagina.waitForSelector(".charla-suyo:not(.charla-pensando)");
    const saludo = (await pagina.textContent(".charla-suyo .charla-globo")).trim();
    console.log(tema, "| saludo:", saludo.slice(0, 60));

    // ¿Se replegó la burbuja del consejo para no estorbar?
    await ESPERA(450);
    const estadoMentor = await pagina.evaluate(() => ({
      clases: document.getElementById("mentor").className,
      opacidad: getComputedStyle(document.querySelector(".mentor-columna")).opacity,
    }));
    console.log(tema, "| mentor:", estadoMentor.clases, "| opacidad columna:", estadoMentor.opacidad);

    // Un turno de conversación
    await pagina.fill("#charla-entrada", "me da miedo hablar en inglés en clase");
    await pagina.click("#charla-enviar");
    await pagina.waitForFunction(() => document.querySelectorAll(".charla-suyo").length >= 2
      && !document.querySelector(".charla-pensando"));
    const turnos = await pagina.locator(".charla-turno").count();
    const ultimo = (await pagina.locator(".charla-suyo .charla-globo").last().textContent()).trim();
    console.log(tema, "| turnos:", turnos, "| respuesta:", ultimo.slice(0, 55));

    // El texto del estudiante no puede interpretarse como HTML
    await pagina.fill("#charla-entrada", "<img src=x onerror=alert(1)> hola");
    await pagina.click("#charla-enviar");
    await pagina.waitForFunction(() => document.querySelectorAll(".charla-suyo").length >= 3
      && !document.querySelector(".charla-pensando"));
    const imagenes = await pagina.locator(".charla-mensajes img").count();
    const crudo = (await pagina.locator(".charla-mio .charla-globo").last().textContent()).trim();
    console.log(tema, "| imágenes inyectadas:", imagenes, "| se ve tal cual:", crudo.startsWith("<img"));

    const controles = await pagina.evaluate(() => {
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
          const p = (getComputedStyle(n).backgroundColor.match(/\d+(\.\d+)?/g) || []).map(Number);
          if (p.length >= 3 && (p[3] === undefined || p[3] > 0.7)) return p.slice(0, 3);
          n = n.parentElement;
        }
        return [255, 255, 255];
      };
      const enviar = document.querySelector(".charla-enviar");
      const campo = document.querySelector(".charla-entrada");
      const abrir = document.getElementById("mentor-abrir-charla");
      return {
        enviar: ratio(num(getComputedStyle(enviar).backgroundColor), fondo(enviar.parentElement)).toFixed(2),
        campo: ratio(num(getComputedStyle(campo).borderColor), fondo(campo)).toFixed(2),
        abrir: ratio(num(getComputedStyle(abrir).backgroundColor), fondo(abrir.parentElement)).toFixed(2),
      };
    });
    console.log(tema, "| contraste de controles (>=3):", JSON.stringify(controles));

    const malos = await pagina.evaluate(MEDIR);
    console.log(tema, "| textos con poco contraste:", malos.length, JSON.stringify(malos));

    await pagina.screenshot({ path: `/tmp/charla-${tema}.png` });

    // Cerrar y reabrir: la charla no puede perderse
    await pagina.click("#charla-cerrar");
    await pagina.waitForSelector("#mentor-charla", { state: "hidden" });
    await pagina.click("#mentor-abrir-charla");
    const guardados = await pagina.locator(".charla-turno").count();
    console.log(tema, "| turnos al reabrir:", guardados);
    await pagina.click("#charla-cerrar");
    await pagina.waitForSelector("#mentor-charla", { state: "hidden" });

    // Al salir, la charla no puede quedar guardada para el siguiente
    await pagina.click("#btn-cerrar-sesion");
    await ESPERA(600);
    const quedo = await pagina.evaluate(() => sessionStorage.getItem("tutorias_charla"));
    console.log(tema, "| charla borrada al salir:", quedo === null);

    console.log(tema, "| errores de JS:", errores.length, errores.slice(0, 3));
    await pagina.close();
  }

  await navegador.close();
})();
