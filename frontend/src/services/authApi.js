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

window.AuthAPI = { registrar, login, obtenerPerfil };
