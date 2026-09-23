const { esAdmin } = require("../utils/metricas");

// Deja pasar solo a las cuentas del equipo; va siempre después de verificarAuth
function soloAdmin(req, res, next) {
  if (!req.usuario || !esAdmin(req.usuario.correo)) {
    return res.status(403).json({ error: "No tienes acceso a esta sección" });
  }
  next();
}

module.exports = soloAdmin;
