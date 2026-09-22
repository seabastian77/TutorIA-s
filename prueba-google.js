// Entrar con Google: vincular, crear, y que no rompa el login con contraseña
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

// El stub de Google (stub-google.js) devuelve este perfil a partir del "token"
const perfil = (sub, email, verificado = true) =>
  JSON.stringify({ sub, email, email_verified: verificado, name: "Sebas González" });

(async () => {
  const marca = Date.now();
  const correoViejo = `viejo${marca}@t4.com`;
  const correoNuevo = `nuevo${marca}@t4.com`;
  // Los ids también únicos por corrida: si no, la segunda encuentra los de la primera
  const gViejo = `g-viejo-${marca}`;
  const gNuevo = `g-nuevo-${marca}`;
  const gSinVerificar = `g-sin-${marca}`;

  // 1) Cuenta que ya existía con contraseña
  await post("/auth/registro", { nombre: "Sebas", correo: correoViejo, contrasena: "miclave", aceptaPolitica: true });

  // 2) Entra con Google usando ESE mismo correo: tiene que vincular, no duplicar
  const vinculo = await post("/auth/google", { credencial: perfil(gViejo, correoViejo) });
  console.log("1. entra con Google teniendo cuenta previa:", vinculo.estado === 200);

  const { rows: cuentas } = await pool.query(
    "SELECT id, google_id, contrasena_hash FROM usuarios WHERE correo = $1", [correoViejo]);
  console.log("2. no se duplicó la cuenta:", cuentas.length === 1);
  console.log("3. quedó vinculada a Google:", cuentas[0].google_id === gViejo);
  console.log("4. conservó su contraseña:", !!cuentas[0].contrasena_hash);

  const conClave = await post("/auth/login", { correo: correoViejo, contrasena: "miclave" });
  console.log("5. y todavía puede entrar con su contraseña:", conClave.estado === 200);

  // 3) Cuenta nueva, solo con Google
  const creada = await post("/auth/google", { credencial: perfil(gNuevo, correoNuevo) });
  console.log("6. crea cuenta nueva con Google:", creada.estado === 200);

  const { rows: nuevas } = await pool.query(
    "SELECT google_id, contrasena_hash FROM usuarios WHERE correo = $1", [correoNuevo]);
  console.log("7. queda sin contraseña guardada:", nuevas[0].contrasena_hash === null);

  const intentaClave = await post("/auth/login", { correo: correoNuevo, contrasena: "loquesea" });
  console.log("8. si intenta con contraseña, se lo explican:",
    intentaClave.estado === 401, "|", intentaClave.datos.error);

  // 4) Volver a entrar con el mismo Google no crea otra cuenta
  await post("/auth/google", { credencial: perfil(gNuevo, correoNuevo) });
  const { rows: repetidas } = await pool.query(
    "SELECT COUNT(*)::int AS n FROM usuarios WHERE correo = $1", [correoNuevo]);
  console.log("9. entrar dos veces no duplica:", repetidas[0].n === 1);

  // 5) Lo que protege la cuenta: un correo que Google no verificó
  const sinVerificar = await post("/auth/google", {
    credencial: perfil(gSinVerificar, `otro${marca}@t4.com`, false),
  });
  console.log("10. correo sin verificar se rechaza:", sinVerificar.estado === 401,
    "|", sinVerificar.datos.error);

  // 6) Un token que el stub no reconoce
  const basura = await post("/auth/google", { credencial: "no-es-un-token" });
  console.log("11. token inválido se rechaza:", basura.estado === 401);

  // 7) Alguien de Google puede pedir contraseña y quedarse con las dos formas
  const pide = await post("/auth/olvide", { correo: correoNuevo });
  console.log("12. quien entra con Google puede pedir una contraseña:", pide.estado === 200);

  const config = await fetch(`${API}/auth/config`).then((r) => r.json());
  console.log("13. el navegador sabe si Google está habilitado:", "googleClientId" in config);

  await pool.end();
})();
