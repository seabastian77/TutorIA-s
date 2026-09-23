// Frases reales de Tatoeba en el dictado y en el vocabulario, con nivel CEFR-J y créditos
const { chromium } = require("playwright");
const { Pool } = require("/home/claude/t4/src/backend/node_modules/pg");
const redLocal = require("./red-local");

const API = "http://127.0.0.1:3000/api";
const pool = new Pool({ connectionString: "postgresql://postgres@localhost:5432/tutorias" });
const pedir = async (ruta, token, cuerpo) => {
  const r = await fetch(`${API}${ruta}`, {
    method: cuerpo ? "POST" : "GET",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  return { estado: r.status, datos: await r.json() };
};

(async () => {
  const correo = `frases${Date.now()}@t4.com`;
  const reg = await pedir("/auth/registro", "", { nombre: "Ana", correo, contrasena: "123456", aceptaPolitica: true });
  const { token } = reg.datos;
  const id = reg.datos.usuario.id;
  await pool.query("UPDATE usuarios SET nivel_mcer = 'B1' WHERE id = $1", [id]);

  const d1 = await pedir("/audio/dictado", token);
  console.log("1. dictado B1:", d1.datos.fuente, "|", d1.datos.frase, "|", d1.datos.pista);
  const r1 = await pedir("/audio/responder-dictado", token, { ejercicioId: d1.datos.ejercicioId, texto: d1.datos.frase });
  console.log("2. corrección:", r1.datos.porcentaje + "%", "| traducción:", r1.datos.traduccion, "|", r1.datos.credito && r1.datos.credito.texto);

  const frases = new Set();
  for (let i = 0; i < 15; i += 1) frases.add((await pedir("/audio/dictado", token)).datos.frase);
  console.log("3. 15 dictados seguidos, distintos:", frases.size, "| repite la primera:", frases.has(d1.datos.frase));

  await pool.query("UPDATE usuarios SET nivel_mcer = 'C1' WHERE id = $1", [id]);
  const d2 = await pedir("/audio/dictado", token);
  console.log("4. dictado C1 (la IA de prueba falla): usa", d2.datos.fuente, d2.estado, "|", d2.datos.pista);
  await pool.query("UPDATE usuarios SET nivel_mcer = 'A2' WHERE id = $1", [id]);

  for (const [palabra, trad] of [["apples", "manzanas"], ["went", "fue"], ["qwertyzz", "?"]]) {
    await pool.query("INSERT INTO vocabulario_usuario (usuario_id, palabra, traduccion, proximo_repaso) VALUES ($1, $2, $3, NOW() - INTERVAL '1 hour')", [id, palabra, trad]);
  }
  const v = await pedir("/vocabulario/repaso", token);
  for (const p of v.datos.palabras) console.log("5.", p.palabra, "| nivel", p.nivel, "|", p.ejemplo ? `${p.ejemplo.ingles} / ${p.ejemplo.espanol}` : "sin ejemplo");

  const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  for (const [nombre, viewport] of [["pc", { width: 1280, height: 900 }], ["cel", { width: 390, height: 844 }]]) {
    const ctx = await nav.newContext({ viewport, deviceScaleFactor: 2 });
    await redLocal(ctx);
    const p = await ctx.newPage();
    const errores = [];
    p.on("pageerror", (e) => errores.push(String(e)));
    await p.goto("http://localhost:8080/index.html");
    await p.fill("#login-correo", correo);
    await p.fill("#login-contrasena", "123456");
    await p.click("#form-login button[type=submit]");
    await p.waitForSelector("#vista-principal:not(.oculto)");
    await p.click("#btn-vocabulario");
    await p.waitForFunction(() => !document.getElementById("vocab-btn-mostrar").classList.contains("oculto"));
    const nivelVisible = await p.isVisible("#vocab-nivel");
    await p.click("#vocab-btn-mostrar");
    await p.waitForTimeout(300);
    const credito = await p.textContent("#vocab-credito");
    console.log(`6. [${nombre}] tarjeta: ${await p.textContent("#vocab-tarjeta-texto")} | chip nivel ${nivelVisible ? await p.textContent("#vocab-nivel") : "no"} | crédito: ${credito}`);
    await p.screenshot({ path: `/tmp/claude-0/-home-claude/89049888-3e0f-5eb9-bb9b-88be29d456a6/scratchpad/vocab-${nombre}.png` });
    // Dictado en pantalla: al comprobar se ven la traducción y el crédito
    await p.click("#btn-salir-vocabulario");
    await p.waitForSelector("#vista-principal:not(.oculto)");
    await p.click("#btn-audio");
    await p.click("#btn-modo-dictado");
    await p.waitForFunction(() => !document.getElementById("dictado-entrada").disabled);
    await p.fill("#dictado-entrada", "I think so");
    await p.click("#btn-comprobar-dictado");
    await p.waitForSelector("#dictado-frase-revelada:not(.oculto)");
    await p.waitForTimeout(300);
    console.log(`7. [${nombre}] pista: ${await p.textContent("#dictado-pista")} | traducción: ${await p.textContent("#dictado-traduccion")} | crédito: ${await p.textContent("#dictado-credito")}`);
    await p.evaluate(() => document.getElementById("dictado-credito").scrollIntoView({ block: "center" }));
    await p.screenshot({ path: `/tmp/claude-0/-home-claude/89049888-3e0f-5eb9-bb9b-88be29d456a6/scratchpad/dictado-${nombre}.png` });
    const desborde = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log(`   desborde horizontal [${nombre}]:`, desborde);
    console.log(`   errores JS [${nombre}]:`, errores.length, errores.slice(0, 2));
    await ctx.close();
  }
  await nav.close();
  await pool.end();
})();
