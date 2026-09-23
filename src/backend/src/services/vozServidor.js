// Decide quién lee en voz alta desde el servidor: Google si la app tiene la clave, si no la voz propia en inglés

const { sintetizar, vozGoogleConfigurada } = require("./vozGoogleService");
const { sintetizarPiper, vozPiperLista } = require("./vozPiperService");
const { idiomaValido } = require("../utils/vozGoogle");

/** Los idiomas que el servidor puede leer; los demás los lee el navegador. */
function idiomasConVoz() {
  if (vozGoogleConfigurada()) return ["en", "es"];
  return vozPiperLista() ? ["en"] : [];
}

/** Devuelve el audio en MP3 y base64, o null para que lea el navegador. */
async function leerEnServidor(texto, idioma, velocidad) {
  const lengua = idiomaValido(idioma);
  let audio = null;
  if (vozGoogleConfigurada()) audio = await sintetizar(texto, lengua, velocidad);
  if (!audio && lengua === "en" && vozPiperLista()) audio = await sintetizarPiper(texto, velocidad);
  return audio;
}

module.exports = { idiomasConVoz, leerEnServidor };
