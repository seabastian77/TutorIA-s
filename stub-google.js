// Hace de Google para las pruebas locales: el "token" es el perfil en JSON.
// Solo se carga a mano al arrancar el servidor de pruebas, nunca en producción.

const Module = require("module");
const original = Module.prototype.require;

Module.prototype.require = function (nombre) {
  if (nombre === "google-auth-library") {
    return {
      OAuth2Client: class {
        async verifyIdToken({ idToken }) {
          let payload;
          try {
            payload = JSON.parse(idToken);
          } catch (e) {
            throw new Error("Token de Google inválido (prueba)");
          }
          if (!payload || !payload.sub) throw new Error("Token de Google inválido (prueba)");
          return { getPayload: () => payload };
        }
      },
    };
  }
  return original.apply(this, arguments);
};
