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
  "If that email has an account, a link to reset the password is on its way.";

const AuthController = {
  async registrar(req, res) {
    try {
      const { correo, contrasena, aceptaPolitica } = req.body;
      const nombre = typeof req.body.nombre === "string" ? req.body.nombre.trim() : "";

      if (!nombre || !correo || !contrasena) {
        return res
          .status(400)
          .json({ error: "Name, email and password are required" });
      }
      // Los mismos límites que tiene la base de datos, para responder 400 y no un error del servidor
      if (nombre.length > 100) {
        return res.status(400).json({ error: "Your name can have up to 100 characters" });
      }
      if (!correoValido(correo) || correo.trim().length > 150) {
        return res.status(400).json({ error: "Enter a valid email address" });
      }
      if (!contrasenaValida(contrasena) || contrasena.length > 72) {
        return res
          .status(400)
          .json({ error: `Your password needs between ${LARGO_MINIMO} and 72 characters` });
      }
      // La ley exige autorización previa y expresa antes de guardar cualquier dato
      if (!aceptoPolitica(aceptaPolitica)) {
        return res
          .status(400)
          .json({ error: "Please accept the data policy to continue" });
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
        .json({ error: error.status ? error.message : "Server error" });
    }
  },

  async login(req, res) {
    try {
      const { correo, contrasena } = req.body;

      if (typeof correo !== "string" || typeof contrasena !== "string" || !correo || !contrasena) {
        return res
          .status(400)
          .json({ error: "Email and password are required" });
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
        .json({ error: error.status ? error.message : "Server error" });
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
        .json({ error: error.status ? error.message : "No se pudo entrar con Google" });
    }
  },

  /** Pide el enlace para cambiar la contraseña. */
  async olvide(req, res) {
    const { correo } = req.body || {};
    if (!correoValido(correo)) {
      return res.status(400).json({ error: "Enter a valid email address" });
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
        .json({ error: `Your password needs at least ${LARGO_MINIMO} characters` });
    }

    try {
      await RecuperacionService.restablecer(token, contrasena);
      res.json({ mensaje: "Your password was changed. You can log in with it now." });
    } catch (error) {
      if (!error.status) reportarError("Error restableciendo la contraseña", error);
      res
        .status(error.status || 500)
        .json({ error: error.status ? error.message : "Could not change your password" });
    }
  },
};

module.exports = AuthController;
