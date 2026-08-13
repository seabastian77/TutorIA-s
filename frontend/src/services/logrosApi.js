const URL_BASE_LOGROS = window.TUTORIAS_API_URL || "http://localhost:3000/api";

const LogrosAPI = {
  async obtenerLogros() {
    const token = Sesion.obtenerToken();
    const resp = await fetch(`${URL_BASE_LOGROS}/usuario/logros`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const datos = await resp.json();
    if (!resp.ok) throw new Error(datos.error || "Error loading achievements");
    return datos;
  },
};

window.LogrosAPI = LogrosAPI;
