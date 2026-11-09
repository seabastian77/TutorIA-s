const URL_BASE_PRACTICA =
  window.TUTORIAS_API_URL || "http://localhost:3000/api";

const PracticaAPI = {
  async obtenerPregunta(tema = null) {
    const token = Sesion.obtenerToken();
    const resp = await fetch(`${URL_BASE_PRACTICA}/practica/pregunta`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tema }),
    });
    const datos = await resp.json();
    if (!resp.ok) throw new Error(datos.error || "Could not create the exercise");
    return datos;
  },

  async enviarRespuesta({ ejercicioId, respuestaUsuario }) {
    const token = Sesion.obtenerToken();
    const resp = await fetch(`${URL_BASE_PRACTICA}/practica/responder`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ejercicioId, respuestaUsuario }),
    });
    const datos = await resp.json();
    if (!resp.ok) throw new Error(datos.error || "Could not check your answer");
    return datos;
  },
};

window.PracticaAPI = PracticaAPI;
