// Revisa en vivo los arreglos: práctica calificada en el servidor, sin doble XP, correos sin mayúsculas y límites
const { chromium } = require("playwright");
const redLocal = require("./red-local");
const { Pool } = require("/home/claude/t4/src/backend/node_modules/pg");
const API = "http://127.0.0.1:3000/api";
const pool = new Pool({ connectionString: "postgresql://postgres@localhost:5432/tutorias" });

const pedir = async (ruta, token, cuerpo, metodo) => {
  const r = await fetch(`${API}${ruta}`, {
    method: metodo || (cuerpo ? "POST" : "GET"),
    headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
    body: cuerpo === undefined ? undefined : typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
  });
  let datos = null;
  try { datos = await r.json(); } catch { datos = null; }
  return { estado: r.status, datos };
};

(async () => {
  const base = `Correc${Date.now()}@T4.com`;
  const reg = await pedir("/auth/registro", "", { nombre: "Ana", correo: base, contrasena: "123456", aceptaPolitica: true });
  const { token } = reg.datos;
  console.log("1. correo guardado en minúsculas:", reg.datos.usuario.correo);
  const login = await pedir("/auth/login", "", { correo: base.toUpperCase(), contrasena: "123456" });
  console.log("2. entra escribiendo el correo en mayúsculas:", login.estado === 200);
  const dup = await pedir("/auth/registro", "", { nombre: "B", correo: base.toLowerCase(), contrasena: "123456", aceptaPolitica: true });
  console.log("3. no deja registrar el mismo correo con otras mayúsculas:", dup.estado);

  // Práctica: la respuesta correcta ya no viaja al navegador
  const p = await pedir("/practica/pregunta", token, { tema: null });
  console.log("4. pregunta:", p.estado, p.datos && p.datos.tipo, "| trae ejercicioId:", Boolean(p.datos && p.datos.ejercicioId), "| esconde la respuesta:", p.datos && p.datos.contenido && !("respuestaCorrecta" in p.datos.contenido));
  const trampa = await pedir("/practica/responder", token, { tipo: "opcion_multiple", contenido: { respuestaCorrecta: "x" }, respuestaUsuario: "x" });
  console.log("5. la trampa de mandar la respuesta propia:", trampa.estado, trampa.datos && trampa.datos.error);
  if (p.datos && p.datos.ejercicioId) {
    const resp = p.datos.tipo === "opcion_multiple" ? 0 : "is";
    const r1 = await pedir("/practica/responder", token, { ejercicioId: p.datos.ejercicioId, respuestaUsuario: resp });
    const r2 = await pedir("/practica/responder", token, { ejercicioId: p.datos.ejercicioId, respuestaUsuario: resp });
    console.log("6. primera respuesta:", r1.estado, "| segunda:", r2.estado, r2.datos && r2.datos.codigo);
  }

  // Dictado: la segunda corrección del mismo ejercicio ya no paga
  const d = await pedir("/audio/dictado", token);
  const c1 = await pedir("/audio/responder-dictado", token, { ejercicioId: d.datos.ejercicioId, texto: "nothing" });
  const c2 = await pedir("/audio/responder-dictado", token, { ejercicioId: d.datos.ejercicioId, texto: d.datos.frase });
  console.log("7. dictado primera:", c1.estado, "| repetido con la frase ya vista:", c2.estado, c2.datos && c2.datos.codigo);
  const raro = await pedir("/audio/responder-dictado", token, { ejercicioId: "abc", texto: "hi" });
  console.log("8. id que no es número:", raro.estado);

  // JSON dañado y cuerpo gigante
  const roto = await pedir("/auth/login", "", "{no es json");
  console.log("9. JSON dañado:", roto.estado, JSON.stringify(roto.datos));
  const gigante = await pedir("/voz/hablar", token, { texto: "a".repeat(100000) });
  console.log("10. cuerpo gigante:", gigante.estado, JSON.stringify(gigante.datos));

  // Meta diaria: si la última actividad fue ayer, arranca en cero
  const id = reg.datos.usuario.id;
  await pool.query("UPDATE usuarios SET actividades_hoy = 4, ultima_actividad = CURRENT_DATE - 1 WHERE id = $1", [id]);
  const prog = await pedir("/usuario/progreso", token);
  console.log("11. meta del día con actividad de ayer:", prog.datos.actividadesHoy);

  // Límite de intentos de entrada
  let ultimo = 0;
  for (let i = 0; i < 12; i += 1) ultimo = (await pedir("/auth/login", "", { correo: "nadie@t4.com", contrasena: "malamala" })).estado;
  console.log("12. después de 12 intentos fallidos:", ultimo);

  // En pantalla: doble clic en Vocabulary responde una sola vez
  await pool.query("INSERT INTO vocabulario_usuario (usuario_id, palabra, traduccion, proximo_repaso) VALUES ($1, 'bridge', 'puente', NOW() - INTERVAL '1 hour'), ($1, 'candle', 'vela', NOW() - INTERVAL '1 hour')", [id]);
  const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const ctx = await nav.newContext();
  await redLocal(ctx);
  const pg = await ctx.newPage();
  const errores = [];
  pg.on("pageerror", (e) => errores.push(String(e)));
  let respuestas = 0;
  pg.on("request", (r) => { if (r.url().includes("/vocabulario/responder")) respuestas += 1; });
  await pg.goto("http://localhost:8080/index.html");
  await pg.fill("#login-correo", base);
  await pg.fill("#login-contrasena", "123456");
  await pg.click("#form-login button[type=submit]");
  await pg.waitForSelector("#vista-principal:not(.oculto)");
  await pg.click("#btn-vocabulario");
  await pg.waitForFunction(() => !document.getElementById("vocab-btn-mostrar").classList.contains("oculto"));
  await pg.click("#vocab-btn-mostrar");
  await pg.dblclick("#btn-vocab-sabia");
  await pg.keyboard.press("ArrowRight");
  await pg.waitForTimeout(900);
  console.log("13. doble clic + flecha sobre la misma palabra → respuestas enviadas:", respuestas, "| ahora muestra:", await pg.textContent("#vocab-tarjeta-texto"));

  // Abrir "Tus datos" desde Vocabulary no deja nada corriendo
  await pg.evaluate(() => abrirMisDatos());
  await pg.waitForTimeout(300);
  console.log("14. desde Vocabulary a Tus datos:", await pg.evaluate(() => [...document.querySelectorAll(".pantalla-principal")].filter((v) => !v.classList.contains("oculto")).map((v) => v.id).join(",")));
  console.log("errores de JS:", errores);
  await nav.close();
  await pool.end();
})();
