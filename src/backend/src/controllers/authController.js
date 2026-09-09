const AuthService = require("../services/authService");

const AuthController = {
  async registrar(req, res) {
    try {
      const { nombre, correo, contrasena } = req.body;

      if (!nombre || !correo || !contrasena) {
        return res
          .status(400)
          .json({ error: "Nombre, correo y contraseña son obligatorios" });
      }
      if (contrasena.length < 6) {
        return res
          .status(400)
          .json({ error: "La contraseña debe tener al menos 6 caracteres" });
      }

      const { usuario, token } = await AuthService.registrar({
        nombre,
        correo,
        contrasena,
      });
      res.status(201).json({ usuario, token });
    } catch (error) {
      console.error("Error en /registro:", error);
      res
        .status(error.status || 500)
        .json({ error: error.message || "Error en el servidor" });
    }
  },

  async login(req, res) {
    try {
      const { correo, contrasena } = req.body;

      if (!correo || !contrasena) {
        return res
          .status(400)
          .json({ error: "Correo y contraseña son obligatorios" });
      }

      const { usuario, token } = await AuthService.login({
        correo,
        contrasena,
      });
      res.json({ usuario, token });
    } catch (error) {
      console.error("Error en /login:", error);
      res
        .status(error.status || 500)
        .json({ error: error.message || "Error en el servidor" });
    }
  },

  async perfil(req, res) {
    res.json({ usuario: req.usuario });
  },
};

module.exports = AuthController;
