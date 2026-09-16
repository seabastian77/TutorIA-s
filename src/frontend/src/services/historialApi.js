const URL_BASE_HISTORIAL = window.TUTORIAS_API_URL || "http://localhost:3000/api";

const HistorialAPI = {
  /** Trae el historial completo del estudiante en una sola llamada. */
  async obtenerProgreso() {
    const resp = await fetch(`${URL_BASE_HISTORIAL}/historial/progreso`, {
      headers: { Authorization: `Bearer ${Sesion.obtenerToken()}` },
    });
    const datos = await resp.json();
    if (!resp.ok) throw new Error(datos.error || "Error cargando el historial");
    return datos;
  },
};

window.HistorialAPI = HistorialAPI;
