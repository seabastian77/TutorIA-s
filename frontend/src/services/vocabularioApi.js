const URL_BASE_VOCAB = window.TUTORIAS_API_URL || "http://localhost:3000/api";

const VocabularioAPI = {
  async obtenerRepaso() {
    const token = Sesion.obtenerToken();
    const resp = await fetch(`${URL_BASE_VOCAB}/vocabulario/repaso`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const datos = await resp.json();
    if (!resp.ok) throw new Error(datos.error || "Error loading vocabulary");
    return datos;
  },

  async responder({ id, sabia }) {
    const token = Sesion.obtenerToken();
    const resp = await fetch(`${URL_BASE_VOCAB}/vocabulario/responder`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id, sabia }),
    });
    const datos = await resp.json();
    if (!resp.ok) throw new Error(datos.error || "Error updating word");
    return datos;
  },
};

window.VocabularioAPI = VocabularioAPI;
