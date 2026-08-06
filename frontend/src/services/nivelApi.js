const URL_BASE_NIVEL = window.TUTORIAS_API_URL || "http://localhost:3000/api";

const NivelAPI = {
  async obtenerEscena({ nivel, turno, historialNarrativo }) {
    const token = Sesion.obtenerToken();
    const resp = await fetch(`${URL_BASE_NIVEL}/nivel/escena`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ nivel, turno, historialNarrativo }),
    });
    const datos = await resp.json();
    if (!resp.ok) throw new Error(datos.error || "Error generando la escena");
    return datos;
  },

  async evaluarRespuestaAbierta({ pregunta, respuestaUsuario, nivel }) {
    const token = Sesion.obtenerToken();
    const resp = await fetch(`${URL_BASE_NIVEL}/nivel/evaluar-abierta`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ pregunta, respuestaUsuario, nivel }),
    });
    const datos = await resp.json();
    if (!resp.ok)
      throw new Error(datos.error || "Error evaluando la respuesta");
    return datos;
  },

  async guardarDiagnosticoFinal(historial) {
    const token = Sesion.obtenerToken();
    const resp = await fetch(`${URL_BASE_NIVEL}/nivel/finalizar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ historial }),
    });
    const datos = await resp.json();
    if (!resp.ok)
      throw new Error(datos.error || "Error guardando el diagnóstico");
    return datos;
  },
};

window.NivelAPI = NivelAPI;
