// El recorrido entero: pedir el enlace, cambiar la clave, entrar con la nueva
const { chromium } = require("playwright");
const { Pool } = require("/home/claude/t4/src/backend/node_modules/pg");

const API = "http://127.0.0.1:3000/api";
const pool = new Pool({ connectionString: "postgresql://postgres@localhost:5432/tutorias" });

const post = async (ruta, cuerpo) => {
  const r = await fetch(`${API}${ruta}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  return { estado: r.status, datos: await r.json() };
};

(async () => {
  const correo = `recu${Date.now()}@t4.com`;
  const registro = await post("/auth/registro", {
    nombre: "Sebas", correo, contrasena: "clavevieja", aceptaPolitica: true,
  });
  const tokenViejo = registro.datos.token;
  console.log("1. cuenta creada:", registro.estado === 201);

  // El backend imprime el enlace cuando no hay clave de correo configurada,
  // pero para la prueba se toma el token real desde la base
  const pedido = await post("/auth/olvide", { correo });
  console.log("2. respuesta al pedir:", JSON.stringify(pedido.datos));

  const inexistente = await post("/auth/olvide", { correo: "nadie" + correo });
  console.log("3. misma respuesta para un correo que no existe:",
    JSON.stringify(pedido.datos) === JSON.stringify(inexistente.datos));

  const { rows } = await pool.query(
    `SELECT r.token_hash FROM recuperaciones_contrasena r
       JOIN usuarios u ON u.id = r.usuario_id
      WHERE u.correo = $1 AND r.usado_en IS NULL`, [correo]);
  console.log("4. solicitudes pendientes en la base:", rows.length);
  console.log("5. en la base está el hash, no el token:",
    /^[0-9a-f]{64}$/.test(rows[0].token_hash));

  const crypto = require("crypto");

  /**
   * Siembra un token conocido sobre la solicitud pendiente. Se hace DESPUÉS de
   * la pantalla de "olvidé", porque pedir un enlace nuevo invalida el anterior.
   */
  async function sembrarToken() {
    const token = crypto.randomBytes(32).toString("hex");
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    const { rowCount } = await pool.query(
      `UPDATE recuperaciones_contrasena SET token_hash = $1
        WHERE id = (SELECT r.id FROM recuperaciones_contrasena r
                      JOIN usuarios u ON u.id = r.usuario_id
                     WHERE u.correo = $2 AND r.usado_en IS NULL
                     ORDER BY r.creado_en DESC LIMIT 1)`, [hash, correo]);
    return rowCount === 1 ? token : null;
  }

  let token = null;
  const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

  for (const [tema, ancho, alto] of [["claro", 1280, 900], ["oscuro", 1280, 900], ["movil", 390, 780]]) {
    const p = await nav.newPage({ viewport: { width: ancho, height: alto } });
    const errores = [];
    p.on("pageerror", (e) => errores.push(String(e)));

    if (tema === "oscuro") {
      await p.goto("http://localhost:8080/index.html");
      await p.evaluate(() => localStorage.setItem("tutorias_tema", "oscuro"));
    }

    // La pantalla de "olvidé", a la que se llega desde el login
    await p.goto("http://localhost:8080/index.html");
    await p.click("#btn-olvide");
    await p.waitForSelector("#pagina-olvide.activa");
    const tam = await p.locator("#btn-olvide").boundingBox().catch(() => null);
    await p.fill("#olvide-correo", correo);
    await p.click("#form-olvide button[type=submit]");
    await p.waitForSelector("#olvide-aviso:not(.oculto)");
    console.log(tema, "| aviso tras pedir:", (await p.textContent("#olvide-aviso")).trim().slice(0, 55));
    await p.screenshot({ path: `/tmp/recu-olvide-${tema}.png` });

    if (tema !== "claro") { await p.close(); continue; }

    // Ahora el enlace del correo, con el token sembrado ya sin más pedidos de por medio
    token = await sembrarToken();
    console.log(tema, "| token sembrado sobre la solicitud vigente:", !!token);
    await p.goto(`http://localhost:8080/index.html?recuperar=${token}`);
    await p.waitForSelector("#pagina-restablecer.activa");
    console.log(tema, "| el enlace abre la pantalla de clave nueva");

    // Claves que no coinciden
    await p.fill("#restablecer-contrasena", "clavenueva");
    await p.fill("#restablecer-repetir", "otracosa");
    await p.click("#form-restablecer button[type=submit]");
    await p.waitForSelector(".mensaje-error.visible");
    console.log(tema, "| avisa si no coinciden:",
      (await p.textContent(".mensaje-error")).trim());

    // Ahora sí
    await p.fill("#restablecer-repetir", "clavenueva");
    await p.click("#form-restablecer button[type=submit]");
    await p.waitForSelector("#restablecer-aviso:not(.oculto), .mensaje-error.visible");
    if (await p.locator("#restablecer-aviso.oculto").count()) {
      console.log(tema, "| FALLÓ:", (await p.textContent(".mensaje-error")).trim());
    }
    console.log(tema, "| cambiada:", (await p.textContent("#restablecer-aviso")).trim());
    console.log(tema, "| el token salió de la URL:",
      !(await p.evaluate(() => location.search)).includes("recuperar"));
    await p.screenshot({ path: `/tmp/recu-lista-${tema}.png` });
    console.log(tema, "| errores de JS:", errores.length, errores.slice(0, 2));
    await p.close();
  }

  await nav.close();

  // Lo que importa de verdad
  const vieja = await post("/auth/login", { correo, contrasena: "clavevieja" });
  console.log("6. la clave vieja ya no sirve:", vieja.estado === 401);

  const nueva = await post("/auth/login", { correo, contrasena: "clavenueva" });
  console.log("7. entra con la nueva:", nueva.estado === 200);

  const repetido = await post("/auth/restablecer", { token, contrasena: "otramas" });
  console.log("8. el mismo enlace no sirve dos veces:", repetido.estado === 400,
    "|", repetido.datos.error);

  const inventado = await post("/auth/restablecer", { token: "a".repeat(64), contrasena: "otramas" });
  console.log("9. un token inventado tampoco:", inventado.estado === 400);

  const corta = await post("/auth/restablecer", { token, contrasena: "123" });
  console.log("10. no deja poner una clave corta:", corta.estado === 400);

  // La sesión que estaba abierta antes del cambio tiene que caerse
  const conTokenViejo = await fetch(`${API}/auth/perfil`, {
    headers: { Authorization: `Bearer ${tokenViejo}` },
  });
  console.log("11. la sesión vieja quedó por fuera:", conTokenViejo.status === 401);

  const conTokenNuevo = await fetch(`${API}/auth/perfil`, {
    headers: { Authorization: `Bearer ${nueva.datos.token}` },
  });
  console.log("12. la sesión nueva sigue adentro:", conTokenNuevo.status === 200);

  // Tope de solicitudes por hora
  const correo2 = `tope${Date.now()}@t4.com`;
  await post("/auth/registro", { nombre: "Tope", correo: correo2, contrasena: "clavevieja", aceptaPolitica: true });
  for (let i = 0; i < 5; i++) await post("/auth/olvide", { correo: correo2 });
  const { rows: creadas } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM recuperaciones_contrasena r
       JOIN usuarios u ON u.id = r.usuario_id WHERE u.correo = $1`, [correo2]);
  console.log("13. 5 pedidos crearon solo:", creadas[0].n, "(tope 3)");

  await pool.end();
})();
