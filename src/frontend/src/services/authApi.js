const URL_BASE = window.TUTORIAS_API_URL || "http://localhost:3000/api";

async function registrar({ nombre, correo, contrasena }) {
  const resp = await fetch(`${URL_BASE}/auth/registro`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, correo, contrasena }),
  });
  const datos = await resp.json();
  if (!resp.ok) throw new Error(datos.error || "Error al registrarse");
  return datos;
}

async function login({ correo, contrasena }) {
  const resp = await fetch(`${URL_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo, contrasena }),
  });
  const datos = await resp.json();
  if (!resp.ok) throw new Error(datos.error || "Error al iniciar sesión");
  return datos;
}

async function obtenerPerfil(token) {
  const resp = await fetch(`${URL_BASE}/auth/perfil`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const datos = await resp.json();
  if (!resp.ok) throw new Error(datos.error || "Error al obtener el perfil");
  return datos;
}

/** Lo que el navegador necesita saber antes de pintar el login. */
async function obtenerConfig() {
  const resp = await fetch(`${URL_BASE}/auth/config`);
  if (!resp.ok) throw new Error("No se pudo leer la configuración");
  return resp.json();
}

/** Entra con el token que devuelve el botón de Google. */
async function entrarConGoogle(credencial) {
  const resp = await fetch(`${URL_BASE}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credencial }),
  });
  const datos = await resp.json();
  if (!resp.ok) throw new Error(datos.error || "No se pudo entrar con Google");
  return datos;
}

/** Pide el enlace para cambiar la contraseña. */
async function pedirEnlace(correo) {
  const resp = await fetch(`${URL_BASE}/auth/olvide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo }),
  });
  const datos = await resp.json();
  if (!resp.ok) throw new Error(datos.error || "No se pudo pedir el enlace");
  return datos;
}

/** Cambia la contraseña con el token que venía en el enlace. */
async function restablecer({ token, contrasena }) {
  const resp = await fetch(`${URL_BASE}/auth/restablecer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, contrasena }),
  });
  const datos = await resp.json();
  if (!resp.ok) throw new Error(datos.error || "No se pudo cambiar la contraseña");
  return datos;
}

window.AuthAPI = {
  registrar, login, obtenerPerfil, pedirEnlace, restablecer,
  obtenerConfig, entrarConGoogle,
};
