const URL_BASE_PRACTICA =
  window.TUTORIAS_API_URL || "http://localhost:3000/api";

const PracticaAPI = {
  async obtenerPregunta() {
    const token = Sesion.obtenerToken();
    const resp = await fetch(`${URL_BASE_PRACTICA}/practica/pregunta`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const datos = await resp.json();
    if (!resp.ok) throw new Error(datos.error || "Error generando ejercicio");
    return datos;
  },

  async enviarRespuesta({ tipo, nivel, contenido, respuestaUsuario }) {
    const token = Sesion.obtenerToken();
    const resp = await fetch(`${URL_BASE_PRACTICA}/practica/responder`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tipo, nivel, contenido, respuestaUsuario }),
    });
    const datos = await resp.json();
    if (!resp.ok) throw new Error(datos.error || "Error evaluando respuesta");
    return datos;
  },
};

window.PracticaAPI = PracticaAPI;
