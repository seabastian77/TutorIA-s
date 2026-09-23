const { obtenerMetricas } = require("../services/metricasService");
const { esAdmin } = require("../utils/metricas");
const { reportarError } = require("../utils/errores");

const MetricasController = {
  // Dice si la cuenta que pregunta puede ver el tablero, para mostrar o no la opción
  acceso(req, res) {
    res.json({ acceso: esAdmin(req.usuario.correo) });
  },

  // Entrega las cifras agregadas del estudio
  async resumen(req, res) {
    try {
      res.json(await obtenerMetricas());
    } catch (error) {
      reportarError("Error en /metricas/resumen", error);
      res.status(500).json({ error: "No se pudieron calcular las métricas" });
    }
  },
};

module.exports = MetricasController;
