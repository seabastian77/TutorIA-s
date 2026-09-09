const URL_BASE_LIGA = window.TUTORIAS_API_URL || "http://localhost:3000/api";

const LigaAPI = {
  async obtenerClasificacion() {
    const token = Sesion.obtenerToken();
    const resp = await fetch(`${URL_BASE_LIGA}/liga/clasificacion`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const datos = await resp.json();
    if (!resp.ok)
      throw new Error(datos.error || "Error loading the leaderboard");
    return datos;
  },
};

window.LigaAPI = LigaAPI;
