const AuthService = require("../services/authService");
const RecuperacionService = require("../services/recuperacionService");
const { GoogleService, googleConfigurado } = require("../services/googleService");
const { vozGoogleConfigurada } = require("../services/vozGoogleService");
const { idiomasConVoz } = require("../services/vozServidor");
const { reportarError } = require("../utils/errores");
const { correoValido, contrasenaValida, LARGO_MINIMO } = require("../utils/recuperacion");
const { aceptoPolitica } = require("../utils/politica");

// La misma respuesta exista o no la cuenta: así nadie averigua quién está registrado
const RESPUESTA_NEUTRA =
  "Si ese correo tiene una cuenta, le llegará un enlace para cambiar la contraseña.";

const AuthController = {
  async registrar(req, res) {
    try {
      const { nombre, correo, contrasena, aceptaPolitica } = req.body;

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
      // La ley exige autorización previa y expresa antes de guardar cualquier dato
      if (!aceptoPolitica(aceptaPolitica)) {
        return res
          .status(400)
          .json({ error: "Debes aceptar la política de tratamiento de datos" });
      }

      const { usuario, token } = await AuthService.registrar({
        nombre,
        correo,
        contrasena,
      });
      res.status(201).json({ usuario, token });
    } catch (error) {
      reportarError("Error en /registro", error);
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
      reportarError("Error en /login", error);
      res
        .status(error.status || 500)
        .json({ error: error.message || "Error en el servidor" });
    }
  },

  async perfil(req, res) {
    res.json({ usuario: req.usuario });
  },

  /** Lo que el navegador necesita saber antes de pintar la pantalla. */
  async config(req, res) {
    res.json({
      googleClientId: googleConfigurado() ? process.env.GOOGLE_CLIENT_ID : null,
      vozGoogle: vozGoogleConfigurada(),
      // Idiomas que lee el servidor con una voz clara; el resto los lee el navegador
      vozServidor: idiomasConVoz(),
    });
  },

  /** Entra con la cuenta de Google. */
  async google(req, res) {
    try {
      const { usuario, token } = await GoogleService.entrar((req.body || {}).credencial);
      res.json({ usuario, token });
    } catch (error) {
      if (!error.status) reportarError("Error entrando con Google", error);
      res
        .status(error.status || 500)
        .json({ error: error.message || "No se pudo entrar con Google" });
    }
  },

  /** Pide el enlace para cambiar la contraseña. */
  async olvide(req, res) {
    const { correo } = req.body || {};
    if (!correoValido(correo)) {
      return res.status(400).json({ error: "Escribe un correo válido" });
    }

    try {
      await RecuperacionService.pedirEnlace(correo);
    } catch (error) {
      // Ni siquiera un fallo interno puede delatar si la cuenta existe
      reportarError("Error pidiendo el enlace de recuperación", error);
    }
    res.json({ mensaje: RESPUESTA_NEUTRA });
  },

  /** Cambia la contraseña con el token que venía en el enlace del correo. */
  async restablecer(req, res) {
    const { token, contrasena } = req.body || {};
    if (!contrasenaValida(contrasena)) {
      return res
        .status(400)
        .json({ error: `La contraseña debe tener al menos ${LARGO_MINIMO} caracteres` });
    }

    try {
      await RecuperacionService.restablecer(token, contrasena);
      res.json({ mensaje: "Tu contraseña quedó cambiada. Ya puedes entrar con ella." });
    } catch (error) {
      if (!error.status) reportarError("Error restableciendo la contraseña", error);
      res
        .status(error.status || 500)
        .json({ error: error.message || "No se pudo cambiar la contraseña" });
    }
  },
};

module.exports = AuthController;
