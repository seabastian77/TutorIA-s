const URL_BASE_VOZ = window.TUTORIAS_API_URL || "http://localhost:3000/api";

const VozAPI = {
  async enviarMensaje({ mensajeUsuario, historial, nivel }) {
    const token = Sesion.obtenerToken();
    const resp = await fetch(`${URL_BASE_VOZ}/voz/responder`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ mensajeUsuario, historial, nivel }),
    });
    const datos = await resp.json();
    if (!resp.ok) throw new Error(datos.error || "Error procesando tu mensaje");
    return datos;
  },
};

window.VozAPI = VozAPI;
