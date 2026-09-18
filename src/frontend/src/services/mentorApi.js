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

  /** Trae el saludo con que Tuti abre la charla. */
  async saludo() {
    const resp = await fetch(`${URL_BASE_MENTOR}/mentor/saludo`, {
      headers: { Authorization: `Bearer ${Sesion.obtenerToken()}` },
    });
    const datos = await resp.json();
    if (!resp.ok) throw new Error(datos.error || "Error abriendo la charla");
    return datos;
  },

  /** Manda un turno de la conversación con el historial y, si fue hablado, cómo sonó. */
  async charlar(mensaje, historial, voz) {
    const resp = await fetch(`${URL_BASE_MENTOR}/mentor/charla`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Sesion.obtenerToken()}`,
      },
      body: JSON.stringify({
        mensaje,
        historial,
        hablado: !!(voz && voz.hablado),
        claridad: voz && voz.claridad,
      }),
    });
    const datos = await resp.json();
    if (!resp.ok) throw new Error(datos.error || "Tuti no pudo responder");
    return datos;
  },
};

window.MentorAPI = MentorAPI;
