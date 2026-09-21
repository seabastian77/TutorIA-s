const AuthService = require('../services/authService');
const UserModel = require('../models/userModel');
const { tokenAnteriorAlCambio } = require('../utils/sesionValida');

async function verificarAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    const payload = AuthService.verificarToken(token);
    const usuario = await UserModel.buscarPorId(payload.id);

    if (!usuario) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    // Cambiar la contraseña cierra las sesiones que estaban abiertas antes
    if (tokenAnteriorAlCambio(payload.iat, usuario.contrasena_cambiada_en)) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    delete usuario.contrasena_cambiada_en;
    req.usuario = usuario;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

module.exports = verificarAuth;
