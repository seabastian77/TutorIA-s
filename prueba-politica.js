// La política de datos: que se vea, que se exija y que quede constancia
const { chromium } = require("playwright");
const { Pool } = require("/home/claude/t4/src/backend/node_modules/pg");

const API = "http://127.0.0.1:3000/api";
const WEB = "http://localhost:8080";
const pool = new Pool({ connectionString: "postgresql://postgres@localhost:5432/tutorias" });

const post = async (ruta, cuerpo) => {
  const r = await fetch(`${API}${ruta}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  return { estado: r.status, datos: await r.json() };
};

// Mide el contraste de cada texto visible contra el fondo que le toca
const MEDIR = () => {
  const lum = (c) => {
    const [r, g, b] = c.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const rgb = (s) => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
  const fondo = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const p = (getComputedStyle(n).backgroundColor.match(/\d+(\.\d+)?/g) || []).map(Number);
      if (p.length >= 3 && (p[3] === undefined || p[3] > 0.7)) return p.slice(0, 3);
      n = n.parentElement;
    }
    const b = (getComputedStyle(document.body).backgroundColor.match(/\d+/g) || []).map(Number);
    return b.length >= 3 ? b.slice(0, 3) : [255, 255, 255];
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
    return (x + 0.05) / (y + 0.05);
  };
  const malos = [];
  document.querySelectorAll("body *").forEach((el) => {
    const t = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join("");
    if (!t) return;
    const e = getComputedStyle(el);
    if (e.display === "none" || e.visibility === "hidden" || el.closest(".oculto")) return;
    const r = ratio(rgb(e.color), fondo(el));
    const grande = parseFloat(e.fontSize) >= 24 || (parseFloat(e.fontSize) >= 18.66 && Number(e.fontWeight) >= 700);
    if (r < (grande ? 3 : 4.5)) malos.push({ el: el.tagName, texto: t.slice(0, 30), ratio: r.toFixed(2) });
  });
  return malos;
};

(async () => {
  const marca = Date.now();

  // 1) El backend no deja registrarse sin aceptar, ni con algo que "parezca" un sí
  for (const [nombre, valor] of [["sin el campo", undefined], ["false", false], ['"true" en texto', "true"], ["1", 1]]) {
    const cuerpo = { nombre: "X", correo: `nop${nombre.length}${marca}@t4.com`, contrasena: "123456" };
    if (valor !== undefined) cuerpo.aceptaPolitica = valor;
    const r = await post("/auth/registro", cuerpo);
    console.log(`1. registro con ${nombre}: rechazado`, r.estado === 400, "|", r.datos.error);
  }

  // 2) Con la aceptación, entra y queda la constancia en la base
  const correo = `si${marca}@t4.com`;
  const ok = await post("/auth/registro", { nombre: "Sebas", correo, contrasena: "123456", aceptaPolitica: true });
  const { rows } = await pool.query(
    "SELECT politica_aceptada_en, politica_version FROM usuarios WHERE correo = $1", [correo]);
  console.log("2. con aceptación entra:", ok.estado === 201,
    "| fecha guardada:", !!rows[0].politica_aceptada_en, "| versión:", rows[0].politica_version);

  // 3) Quien entra con Google también queda con la constancia
  const g = await post("/auth/google", {
    credencial: JSON.stringify({ sub: `g-pol-${marca}`, email: `gpol${marca}@t4.com`, email_verified: true, name: "G" }),
  });
  const { rows: rg } = await pool.query(
    "SELECT politica_version FROM usuarios WHERE correo = $1", [`gpol${marca}@t4.com`]);
  console.log("3. cuenta nueva con Google guarda la versión:", g.estado === 200, "|", rg[0] && rg[0].politica_version);

  // 4) Nadie quedó creado por los intentos rechazados
  const { rows: fantasmas } = await pool.query(
    "SELECT COUNT(*)::int AS n FROM usuarios WHERE correo LIKE $1", [`nop%${marca}@t4.com`]);
  console.log("4. los rechazados no dejaron cuenta:", fantasmas[0].n === 0);

  const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

  for (const [tema, ancho, alto] of [["claro", 1280, 900], ["oscuro", 1280, 900], ["movil", 390, 800]]) {
    const p = await nav.newPage({ viewport: { width: ancho, height: alto } });
    const errores = [];
    p.on("pageerror", (e) => errores.push(String(e)));
    await p.goto(`${WEB}/`);
    if (tema === "oscuro") {
      await p.evaluate(() => localStorage.setItem("tutorias_tema", "oscuro"));
    }

    // 5) La página se sirve igual que en Railway (serve -s), no cae al index
    const resp = await p.goto(`${WEB}/privacidad.html`);
    const titulo = (await p.textContent("h1")).trim();
    console.log(tema, "| 5. la página responde:", resp.status(), "|", titulo);

    const desborde = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    const malos = await p.evaluate(MEDIR);
    console.log(tema, "| sin desborde horizontal:", !desborde, "| textos con poco contraste:", malos.length, JSON.stringify(malos.slice(0, 3)));
    await p.screenshot({ path: `/tmp/politica-${tema}.png`, fullPage: false });

    if (tema === "claro") {
      // Todos los enlaces del índice llevan a una sección que existe
      const rotos = await p.evaluate(() =>
        [...document.querySelectorAll(".legal-indice a")]
          .map((a) => a.getAttribute("href"))
          .filter((h) => !document.querySelector(h)));
      console.log(tema, "| enlaces del índice rotos:", rotos.length, rotos);
    }

    // 6) En el registro, la casilla es obligatoria también en la pantalla
    await p.goto(`${WEB}/`);
    await p.click("#tab-registro");
    await p.fill("#registro-nombre", "Sebas");
    await p.fill("#registro-correo", `ui${tema}${marca}@t4.com`);
    await p.fill("#registro-contrasena", "123456");
    const casilla = await p.locator(".casilla-politica").boundingBox();
    console.log(tema, "| 6. tamaño del área de la casilla:", Math.round(casilla.width) + "x" + Math.round(casilla.height));

    // Se salta la validación del navegador para comprobar que la app también la exige
    await p.evaluate(() => document.getElementById("form-registro").setAttribute("novalidate", ""));
    await p.click("#form-registro button[type=submit]");
    await p.waitForSelector(".mensaje-error.visible");
    console.log(tema, "|    sin marcar la casilla:", (await p.textContent(".mensaje-error")).trim());

    await p.check("#registro-politica");
    await p.click("#form-registro button[type=submit]");
    await p.waitForSelector("#vista-principal:not(.oculto)");
    console.log(tema, "|    marcándola entra: true");

    console.log(tema, "| errores de JS:", errores.length, errores.slice(0, 2));
    await p.close();
  }

  await nav.close();
  await pool.end();
})();
