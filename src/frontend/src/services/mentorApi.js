const URL_BASE_MENTOR = window.TUTORIAS_API_URL || "http://localhost:3000/api";

const MentorAPI = {
  /** Trae el consejo inmediato calculado con reglas, sin pasar por la IA. */
  async obtenerEstado() {
    const resp = await fetch(`${URL_BASE_MENTOR}/mentor/estado`, {
      headers: { Authorization: `Bearer ${Sesion.obtenerToken()}` },
    });
    const datos = await resp.json();
    if (!resp.ok) throw new Error(datos.error || "Error leyendo el estado");
    return datos;
  },

  /** Pide el consejo del día redactado por la IA. */
  async consejoDelDia() {
    const resp = await fetch(`${URL_BASE_MENTOR}/mentor/consejo-del-dia`, {
      headers: { Authorization: `Bearer ${Sesion.obtenerToken()}` },
    });
    const datos = await resp.json();
    if (!resp.ok) throw new Error(datos.error || "Error pidiendo el consejo");
    return datos;
  },
};

window.MentorAPI = MentorAPI;
