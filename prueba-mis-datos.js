// Descargar los datos y borrar la cuenta: que funcione y que no deje nada atrás
const { chromium } = require("playwright");
const { Pool } = require("/home/claude/t4/src/backend/node_modules/pg");
const fs = require("fs");

const API = "http://127.0.0.1:3000/api";
const WEB = "http://localhost:8080";
const pool = new Pool({ connectionString: "postgresql://postgres@localhost:5432/tutorias" });
const TABLAS = ["diagnosticos_nivel", "ejercicios", "conversaciones", "roleplays", "lecturas_completadas",
  "vocabulario_usuario", "liga_semanal", "compras_tienda", "actividades", "recuperaciones_contrasena"];

const post = async (ruta, cuerpo, token) => {
  const r = await fetch(`${API}${ruta}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(cuerpo),
  });
  return { estado: r.status, datos: await r.json() };
};

/** Cuenta cuántas filas quedan de ese usuario en cada tabla. */
async function restos(id) {
  let total = 0;
  for (const t of TABLAS) {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM ${t} WHERE usuario_id = $1`, [id]);
    total += rows[0].n;
  }
  const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM usuarios WHERE id = $1", [id]);
  return total + rows[0].n;
}

(async () => {
  const marca = Date.now();
  const correo = `datos${marca}@t4.com`;
  const reg = await post("/auth/registro", { nombre: "Ana", correo, contrasena: "clave123", aceptaPolitica: true });
  const id = reg.datos.usuario.id;
  // Le deja rastro en varias tablas para comprobar que el borrado las limpia todas
  await pool.query("INSERT INTO vocabulario_usuario (usuario_id, palabra, traduccion) VALUES ($1, 'bridge', 'puente')", [id]);
  await pool.query("INSERT INTO diagnosticos_nivel (usuario_id, nivel_mcer, vocabulario) VALUES ($1, 'A2', 55)", [id]);
  await pool.query("INSERT INTO actividades (usuario_id, modulo, xp) VALUES ($1, 'practica', 10)", [id]);
  await post("/auth/olvide", { correo });
  console.log("1. filas antes de borrar:", await restos(id));

  const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  for (const [tema, ancho, alto] of [["claro", 1280, 900], ["movil", 390, 844]]) {
    const ctx = await nav.newContext({ viewport: { width: ancho, height: alto }, acceptDownloads: true });
    const p = await ctx.newPage();
    const errores = [];
    p.on("pageerror", (e) => errores.push(String(e)));
    await p.goto(`${WEB}/index.html`);
    await p.fill("#login-correo", correo);
    await p.fill("#login-contrasena", "clave123");
    await p.click("#form-login button[type=submit]");
    await p.waitForSelector("#vista-principal:not(.oculto)");
    await p.click("#btn-cuenta");
    await p.click("#btn-menu-datos");
    await p.waitForSelector("#vista-datos:not(.oculto)");
    await p.waitForFunction(() => document.getElementById("datos-correo-cuenta").textContent !== "");
    console.log(tema, "| 2. pide la contraseña (cuenta con clave):", await p.isVisible("#borrar-contrasena"));

    const [descarga] = await Promise.all([p.waitForEvent("download"), p.click("#btn-descargar-datos")]);
    const ruta = await descarga.path();
    const json = JSON.parse(fs.readFileSync(ruta, "utf8"));
    const texto = JSON.stringify(json);
    console.log(tema, "| 3. descarga:", descarga.suggestedFilename(), "| vocabulario:", json.vocabulario.length,
      "| diagnósticos:", json.diagnosticos.length, "| constancia de la política:", !!json.cuenta.politicaAceptadaEl);
    console.log(tema, "|    sin la contraseña ni hashes:", !texto.includes("$2a$") && !texto.includes("$2b$") && !texto.includes("token_hash"));
    await p.screenshot({ path: `/tmp/aud/datos-${tema}.png`, fullPage: true });

    if (tema === "claro") {
      await p.fill("#borrar-correo", "otro@t4.com");
      await p.fill("#borrar-contrasena", "clave123");
      await p.click("#btn-borrar-cuenta");
      console.log(tema, "| 4. correo equivocado:", (await p.textContent("#datos-aviso-borrar")).trim());
      await p.fill("#borrar-correo", correo.toUpperCase());
      await p.fill("#borrar-contrasena", "malaclave");
      await p.click("#btn-borrar-cuenta");
      await p.waitForFunction(() => document.getElementById("datos-aviso-borrar").textContent.includes("contraseña"));
      console.log(tema, "| 5. clave equivocada:", (await p.textContent("#datos-aviso-borrar")).trim(),
        "| sigue con sesión:", await p.isVisible("#barra-app"));
      console.log("   filas tras los intentos fallidos:", await restos(id));
    }
    await ctx.close();
  }

  // El borrado de verdad, en el celular
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await p.goto(`${WEB}/index.html`);
  await p.fill("#login-correo", correo);
  await p.fill("#login-contrasena", "clave123");
  await p.click("#form-login button[type=submit]");
  await p.waitForSelector("#vista-principal:not(.oculto)");
  await p.click("#btn-cuenta");
  await p.click("#btn-menu-datos");
  await p.fill("#borrar-correo", correo);
  await p.fill("#borrar-contrasena", "clave123");
  await Promise.all([p.waitForNavigation(), p.click("#btn-borrar-cuenta")]);
  await p.waitForSelector("#vista-auth:not(.oculto)");
  console.log("6. vuelve a la entrada con:", (await p.textContent("#mensaje-error")).trim(),
    "| clase:", await p.getAttribute("#mensaje-error", "class"));
  await p.screenshot({ path: "/tmp/aud/datos-despedida.png" });
  console.log("7. filas que quedan del usuario:", await restos(id));
  const entra = await post("/auth/login", { correo, contrasena: "clave123" });
  console.log("8. ya no puede entrar:", entra.estado === 401);
  await ctx.close();

  // Una cuenta de Google solo necesita el correo
  const g = await post("/auth/google", {
    credencial: JSON.stringify({ sub: `g-datos-${marca}`, email: `gdatos${marca}@t4.com`, email_verified: true, name: "G" }),
  });
  const token = g.datos.token;
  const r1 = await fetch(`${API}/usuario/cuenta`, { headers: { Authorization: `Bearer ${token}` } });
  console.log("9. Google:", JSON.stringify(await r1.json()));
  const r2 = await fetch(`${API}/usuario/cuenta`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ correo: `gdatos${marca}@t4.com` }),
  });
  console.log("10. Google se borra solo con el correo:", r2.status, "| el token viejo ya no sirve:",
    (await fetch(`${API}/usuario/progreso`, { headers: { Authorization: `Bearer ${token}` } })).status === 401);

  await nav.close();
  await pool.end();
})();
