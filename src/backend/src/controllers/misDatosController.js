const MisDatosService = require("../services/misDatosService");
const { reportarError } = require("../utils/errores");

// Devuelve el error esperado con su código, y los inesperados como 500 sin detalles
function responderError(res, error, contexto) {
  if (error.estado) return res.status(error.estado).json({ error: error.message });
  reportarError(contexto, error);
  return res.status(500).json({ error: "Algo salió mal. Intenta de nuevo en un momento." });
}

const MisDatosController = {
  // Lo que necesita la pantalla de datos para saber cómo pedir la confirmación
  async cuenta(req, res) {
    try {
      res.json(await MisDatosService.resumenCuenta(req.usuario.id));
    } catch (error) {
      responderError(res, error, "Error en GET /usuario/cuenta");
    }
  },

  // Todo lo que la app guarda de la persona, para que se lo lleve
  async exportar(req, res) {
    try {
      res.json(await MisDatosService.exportar(req.usuario.id));
    } catch (error) {
      responderError(res, error, "Error en /usuario/mis-datos");
    }
  },

  // Borra la cuenta y sus datos después de confirmar el correo y la contraseña
  async borrar(req, res) {
    try {
      const { correo, contrasena } = req.body || {};
      await MisDatosService.borrar(req.usuario.id, { correo, contrasena });
      res.json({ ok: true });
    } catch (error) {
      responderError(res, error, "Error en DELETE /usuario/cuenta");
    }
  },
};

module.exports = MisDatosController;
