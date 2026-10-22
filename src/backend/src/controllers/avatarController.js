const { configuracionPublica, crearSesion } = require("../services/avatarService");
const { reportarError } = require("../utils/errores");

const AvatarController = {
  /** Dice si la tutoría usa el avatar de demostración o un proveedor de video real. */
  config(req, res) {
    res.json(configuracionPublica());
  },

  /** Abre una sesión de video con el proveedor real; sin claves configuradas responde 503. */
  async sesion(req, res) {
    try {
      res.json(await crearSesion());
    } catch (error) {
      const estado = error.status || 500;
      if (estado >= 500 && estado !== 503) reportarError("Error en /avatar/sesion", error);
      res.status(estado).json({
        error: estado === 503 ? error.message : "No se pudo abrir el video del tutor; sigue el modo de demostración",
        modo: "demo",
      });
    }
  },
};

module.exports = AvatarController;
