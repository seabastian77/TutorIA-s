const URL_BASE_USUARIO = window.TUTORIAS_API_URL || "http://localhost:3000/api";

const UsuarioAPI = {
  async obtenerProgreso() {
    const token = Sesion.obtenerToken();
    const resp = await fetch(`${URL_BASE_USUARIO}/usuario/progreso`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    const datos = await resp.json();
    if (!resp.ok)
      throw new Error(datos.error || "Error obteniendo el progreso");
    return datos;
  },
};

window.UsuarioAPI = UsuarioAPI;
