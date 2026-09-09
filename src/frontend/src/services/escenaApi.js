const URL_BASE_ESCENA = window.TUTORIAS_API_URL || "http://localhost:3000/api";

const EscenaAPI = {
  async obtenerEscena() {
    const token = Sesion.obtenerToken();
    const resp = await fetch(`${URL_BASE_ESCENA}/escena/nueva`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const datos = await resp.json();
    if (!resp.ok) throw new Error(datos.error || "Error generating the scene");
    return datos;
  },

  async evaluarLinea({ lineaObjetivo, transcripcion }) {
    const token = Sesion.obtenerToken();
    const resp = await fetch(`${URL_BASE_ESCENA}/escena/evaluar-linea`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ lineaObjetivo, transcripcion }),
    });
    const datos = await resp.json();
    if (!resp.ok) throw new Error(datos.error || "Error evaluating your line");
    return datos;
  },
};

window.EscenaAPI = EscenaAPI;
