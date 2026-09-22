// Entrar con Google: valida el token que manda el navegador y resuelve la cuenta

const { OAuth2Client } = require("google-auth-library");
const UserModel = require("../models/userModel");
const AuthService = require("./authService");
const { datosDePerfilGoogle, decidirVinculo } = require("../utils/cuentaGoogle");
const { POLITICA_VERSION } = require("../utils/politica");

let cliente = null;

function clienteGoogle() {
  if (!cliente) cliente = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  return cliente;
}

/** Dice si la app tiene con qué ofrecer el botón de Google. */
function googleConfigurado() {
  return !!process.env.GOOGLE_CLIENT_ID;
}

/**
 * Valida el token contra Google. La librería comprueba la firma, que venga de
 * Google y que sea para ESTA app: sin lo último, un token pedido por otra
 * aplicación serviría para entrar aquí.
 */
async function verificarToken(credencial) {
  const entrada = await clienteGoogle().verifyIdToken({
    idToken: String(credencial || ""),
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return entrada.getPayload();
}

const GoogleService = {
  /**
   * Entra, vincula o crea, según lo que ya haya en la base. Vincular es seguro
   * porque solo se llega ahí con un correo que Google ya verificó.
   */
  async entrar(credencial) {
    if (!googleConfigurado()) {
      const error = new Error("Entrar con Google no está habilitado");
      error.status = 503;
      throw error;
    }

    let payload;
    try {
      payload = await verificarToken(credencial);
    } catch (e) {
      const error = new Error("El acceso con Google no se pudo verificar");
      error.status = 401;
      throw error;
    }

    const { googleId, correo, nombre } = datosDePerfilGoogle(payload);

    const porGoogleId = await UserModel.buscarPorGoogleId(googleId);
    const porCorreo = porGoogleId ? null : await UserModel.buscarPorCorreo(correo);
    const decision = decidirVinculo({ porGoogleId, porCorreo });

    let usuario;
    if (decision === "entrar") usuario = porGoogleId;
    else if (decision === "vincular") usuario = await UserModel.vincularGoogle(porCorreo.id, googleId);
    else {
      usuario = await UserModel.crearConGoogle({
        nombre,
        correo,
        googleId,
        politicaVersion: POLITICA_VERSION,
      });
    }

    await UserModel.actualizarUltimoAcceso(usuario.id);

    delete usuario.contrasena_hash;
    delete usuario.google_id;
    return { usuario, token: AuthService.generarToken(usuario), decision };
  },
};

module.exports = { GoogleService, googleConfigurado };
