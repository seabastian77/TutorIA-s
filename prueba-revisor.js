// El revisor de LanguageTool en Real Situations: marca los errores y aplica las sugerencias
const { chromium } = require("playwright");
const redLocal = require("./red-local");
const API = "http://127.0.0.1:3000/api";
const SALIDA = process.env.SALIDA || "/tmp";

const RESPUESTA_LT = {
  matches: [
    { offset: 4, length: 2, message: "The verb 'go' does not agree with 'She'.", replacements: [{ value: "goes" }, { value: "went" }], rule: { issueType: "grammar", category: { id: "GRAMMAR" } } },
    { offset: 31, length: 1, message: "Use 'I' for the first person.", replacements: [{ value: "I" }], rule: { issueType: "typographical", category: { id: "CASING" } } },
    { offset: 37, length: 1, message: "Use 'an' before a vowel sound.", replacements: [{ value: "an" }], rule: { issueType: "misspelling", category: { id: "TYPOS" } } },
  ],
};

(async () => {
  const correo = `revisor${Date.now()}@t4.com`;
  await fetch(`${API}/auth/registro`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre: "Ana", correo, contrasena: "123456", aceptaPolitica: true }) });
  const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  for (const [nombre, viewport] of [["pc", { width: 1280, height: 900 }], ["cel", { width: 390, height: 844 }]]) {
    const ctx = await nav.newContext({ viewport, deviceScaleFactor: 2 });
    await redLocal(ctx);
    let pedidos = 0;
    await ctx.route("https://api.languagetool.org/**", (r) => {
      pedidos += 1;
      const cuerpo = new URLSearchParams(r.request().postData());
      if (cuerpo.get("language") !== "en-US" || cuerpo.get("motherTongue") !== "es") return r.fulfill({ status: 400, body: "bad" });
      return r.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(pedidos === 1 ? RESPUESTA_LT : { matches: [] }) });
    });
    const p = await ctx.newPage();
    const errores = [];
    p.on("pageerror", (e) => errores.push(String(e)));
    await p.goto("http://localhost:8080/index.html");
    await p.fill("#login-correo", correo);
    await p.fill("#login-contrasena", "123456");
    await p.click("#form-login button[type=submit]");
    await p.waitForSelector("#vista-principal:not(.oculto)");
    await p.click("#btn-roleplay");
    await p.click("#roleplay-escenarios .escenario");
    await p.waitForFunction(() => !document.getElementById("roleplay-entrada").disabled && document.querySelector("#roleplay-chat").children.length > 0);
    await p.fill("#roleplay-entrada", "She go to school yesterday and i has a apple.");
    await p.click(".revisor-boton");
    await p.waitForSelector(".revisor-item");
    const items = await p.$$eval(".revisor-item", (xs) => xs.map((x) => x.querySelector(".revisor-tipo").textContent + ": " + x.querySelector("mark").textContent));
    console.log(`[${nombre}] marcados:`, items.join(" | "));
    await p.evaluate(() => document.querySelector(".revisor").scrollIntoView({ block: "center" }));
    await p.screenshot({ path: `${SALIDA}/revisor-${nombre}.png` });
    for (const s of ["goes", "I", "an"]) await p.click(`.revisor-sugerencia >> text="${s}"`);
    console.log(`[${nombre}] texto corregido:`, await p.inputValue("#roleplay-entrada"));
    await p.click(".revisor-boton");
    await p.waitForSelector(".revisor-bien");
    console.log(`[${nombre}] segunda revisión:`, (await p.textContent(".revisor-bien")).trim(), "| crédito:", await p.textContent(".revisor-pie"));
    await p.fill("#roleplay-entrada", "Hello");
    console.log(`[${nombre}] al escribir se limpia:`, await p.$eval(".revisor-resultado", (z) => z.classList.contains("oculto")));
    const desborde = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log(`[${nombre}] pedidos a LanguageTool: ${pedidos} | desborde: ${desborde} | errores JS:`, errores);
    await ctx.close();
  }
  await nav.close();
})();
