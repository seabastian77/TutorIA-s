// El vocabulario con FSRS: que programe bien, que convierta las palabras viejas y que la sesión repita las falladas
const { chromium } = require("playwright");
const { Pool } = require("/home/claude/t4/src/backend/node_modules/pg");

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
  const correo = `repaso${Date.now()}@t4.com`;
  const reg = await pedir("/auth/registro", "", { nombre: "Ana", correo, contrasena: "123456", aceptaPolitica: true });
  const { token } = reg.datos;
  const id = reg.datos.usuario.id;
  const insertar = (palabra, nivel) => pool.query(
    "INSERT INTO vocabulario_usuario (usuario_id, palabra, traduccion, nivel_dominio, proximo_repaso) VALUES ($1, $2, 'x', $3, NOW() - INTERVAL '1 hour') RETURNING id",
    [id, palabra, nivel]).then((r) => r.rows[0].id);
  const nueva = await insertar("bridge", 0);
  const vieja = await insertar("candle", 3);
  const fallada = await insertar("forest", 2);

  const r1 = await pedir("/vocabulario/responder", token, { id: nueva, sabia: true });
  console.log("1. nueva que sabía: vuelve en", Math.round((new Date(r1.datos.proximoRepaso) - Date.now()) / 60000), "min | nivel", r1.datos.nivelDominio);
  const r2 = await pedir("/vocabulario/responder", token, { id: vieja, sabia: true });
  console.log("2. vieja de nivel 3 que sabía: vuelve en", r2.datos.proximoRepasoEnDias, "días | nivel", r2.datos.nivelDominio);
  const r3 = await pedir("/vocabulario/responder", token, { id: fallada, sabia: false });
  console.log("3. fallada: vuelve en", Math.round((new Date(r3.datos.proximoRepaso) - Date.now()) / 60000), "min | nivel", r3.datos.nivelDominio);
  const { rows } = await pool.query("SELECT palabra, fsrs_estado, fsrs_repasos, fsrs_fallos, ultimo_repaso IS NOT NULL AS guardo FROM vocabulario_usuario WHERE usuario_id = $1 ORDER BY palabra", [id]);
  console.log("4. en la base:", JSON.stringify(rows));
  const ajena = await pedir("/vocabulario/responder", "", { id: nueva, sabia: true });
  console.log("5. sin sesión no deja:", ajena.estado === 401);

  // En la pantalla: la que no sabía vuelve al final de la misma sesión
  await pool.query("UPDATE vocabulario_usuario SET proximo_repaso = NOW() - INTERVAL '1 hour' WHERE usuario_id = $1", [id]);
  const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const p = await nav.newPage({ viewport: { width: 1280, height: 900 } });
  const errores = [];
  p.on("pageerror", (e) => errores.push(String(e)));
  await p.goto("http://localhost:8080/index.html");
  await p.fill("#login-correo", correo);
  await p.fill("#login-contrasena", "123456");
  await p.click("#form-login button[type=submit]");
  await p.waitForSelector("#vista-principal:not(.oculto)");
  await p.click("#btn-vocabulario");
  await p.waitForFunction(() => !document.getElementById("vocab-btn-mostrar").classList.contains("oculto"));
  const vistas = [];
  for (let i = 0; i < 6; i += 1) {
    const texto = (await p.textContent("#vocab-tarjeta-texto")).trim();
    if (texto.startsWith("You reviewed")) break;
    vistas.push(texto);
    await p.click("#vocab-btn-mostrar");
    await p.click(i === 0 ? "#btn-vocab-no-sabia" : "#btn-vocab-sabia");
    await p.waitForTimeout(500);
  }
  console.log("6. orden en la sesión:", vistas.join(" → "), "| la primera volvió al final:", vistas.length === 4 && vistas[3] === vistas[0]);
  console.log("errores de JS:", errores.length, errores.slice(0, 2));
  await nav.close();
  await pool.end();
})();
