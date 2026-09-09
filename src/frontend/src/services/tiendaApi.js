const URL_BASE_TIENDA = window.TUTORIAS_API_URL || "http://localhost:3000/api";

const TiendaAPI = {
  async obtenerCatalogo() {
    const token = Sesion.obtenerToken();
    const resp = await fetch(`${URL_BASE_TIENDA}/tienda/catalogo`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const datos = await resp.json();
    if (!resp.ok) throw new Error(datos.error || "Error loading the shop");
    return datos;
  },

  async comprar(articuloId) {
    const token = Sesion.obtenerToken();
    const resp = await fetch(`${URL_BASE_TIENDA}/tienda/comprar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ articuloId }),
    });
    const datos = await resp.json();
    if (!resp.ok) {
      // El código viaja aparte para poder dar un mensaje distinto
      const error = new Error(datos.error || "Could not complete the purchase");
      error.codigo = datos.codigo;
      error.faltan = datos.faltan;
      throw error;
    }
    return datos;
  },
};

window.TiendaAPI = TiendaAPI;
