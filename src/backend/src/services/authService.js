const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const UserModel = require("../models/userModel");
const { entraConContrasena } = require("../utils/cuentaGoogle");
const { POLITICA_VERSION } = require("../utils/politica");
const { RONDAS_BCRYPT } = require("../config/seguridad");
const { reportarError } = require("../utils/errores");

// Sin JWT_SECRET no se usa una clave conocida: se inventa una al azar (las sesiones se cierran al reiniciar)
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.warn("Falta JWT_SECRET: se usa una clave temporal y las sesiones se cerrarán al reiniciar el servidor");
  return require("crypto").randomBytes(48).toString("hex");
})();
const JWT_EXPIRA = "7d";
const HASH_DE_RELLENO = bcrypt.hashSync("tutorias-relleno", RONDAS_BCRYPT);

const AuthService = {
  async registrar({ nombre, correo, contrasena }) {
    const existente = await UserModel.buscarPorCorreo(correo);
    if (existente) {
      const error = new Error("That email is already registered");
      error.status = 409;
      throw error;
    }

    const contrasenaHash = await bcrypt.hash(contrasena, RONDAS_BCRYPT);
    const usuario = await UserModel.crear({
      nombre,
      correo,
      contrasenaHash,
      politicaVersion: POLITICA_VERSION,
    });
    const token = this.generarToken(usuario);

    return { usuario, token };
  },

  async login({ correo, contrasena }) {
    const usuario = await UserModel.buscarPorCorreo(correo);
    if (!usuario) {
      // Se compara igual contra un hash de relleno: así el tiempo no delata qué correos existen
      await bcrypt.compare(String(contrasena), HASH_DE_RELLENO);
      const error = new Error("Incorrect email or password");
      error.status = 401;
      throw error;
    }

    // Quien se registró con Google no tiene contraseña: hay que decírselo en
    // vez de dejarlo probando claves que nunca van a servir
    if (!entraConContrasena(usuario)) {
      const error = new Error("This account signs in with Google. Use the Google button.");
      error.status = 401;
      throw error;
    }

    const coincide = await bcrypt.compare(contrasena, usuario.contrasena_hash);
    if (!coincide) {
      const error = new Error("Incorrect email or password");
      error.status = 401;
      throw error;
    }

    await this.mejorarHash(usuario, contrasena);
    await UserModel.actualizarUltimoAcceso(usuario.id);
    const token = this.generarToken(usuario);

    delete usuario.contrasena_hash;
    return { usuario, token };
  },

  /** Pasa las cuentas viejas al costo actual de bcrypt sin pedirle nada al estudiante; si falla, entra igual. */
  async mejorarHash(usuario, contrasena) {
    try {
      if (bcrypt.getRounds(usuario.contrasena_hash) >= RONDAS_BCRYPT) return;
      await UserModel.actualizarHash(usuario.id, await bcrypt.hash(contrasena, RONDAS_BCRYPT));
    } catch (error) {
      reportarError("No se pudo actualizar el hash de la contraseña", error);
    }
  },

  generarToken(usuario) {
    return jwt.sign({ id: usuario.id, correo: usuario.correo }, JWT_SECRET, {
      expiresIn: JWT_EXPIRA,
    });
  },

  verificarToken(token) {
    return jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
  },
};

module.exports = AuthService;
