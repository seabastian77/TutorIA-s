const URL_BASE_NIVEL = window.TUTORIAS_API_URL || "http://localhost:3000/api";

const NivelAPI = {
  async obtenerPregunta({ nivel, excluir }) {
    const token = Sesion.obtenerToken();
    const resp = await fetch(`${URL_BASE_NIVEL}/nivel/pregunta`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ nivel, excluir }),
    });
    const datos = await resp.json();
    if (!resp.ok) throw new Error(datos.error || "Error generando la pregunta");
    return datos;
  },

  async guardarNivelFinal(nivel) {
    const token = Sesion.obtenerToken();
    const resp = await fetch(`${URL_BASE_NIVEL}/nivel/finalizar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ nivel }),
    });
    const datos = await resp.json();
    if (!resp.ok) throw new Error(datos.error || "Error guardando el nivel");
    return datos;
  },
};

window.NivelAPI = NivelAPI;
