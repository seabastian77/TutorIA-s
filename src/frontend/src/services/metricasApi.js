const URL_BASE_METRICAS = window.TUTORIAS_API_URL || "http://localhost:3000/api";

const MetricasAPI = {
  /** Pregunta si la cuenta abierta puede ver las métricas del estudio. */
  async acceso() {
    const resp = await fetch(`${URL_BASE_METRICAS}/metricas/acceso`, {
      headers: { Authorization: `Bearer ${Sesion.obtenerToken()}` },
    });
    if (!resp.ok) return false;
    const datos = await resp.json();
    return datos.acceso === true;
  },

  /** Trae las cifras agregadas del tablero. */
  async resumen() {
    const resp = await fetch(`${URL_BASE_METRICAS}/metricas/resumen`, {
      headers: { Authorization: `Bearer ${Sesion.obtenerToken()}` },
    });
    const datos = await resp.json();
    if (!resp.ok) throw new Error(datos.error || "No se pudieron cargar las métricas");
    return datos;
  },
};

window.MetricasAPI = MetricasAPI;
