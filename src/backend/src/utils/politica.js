// La política de datos vigente y cómo saber si alguien la aceptó

// Cambia cuando cambie la página privacidad.html de forma que afecte el uso de datos
const POLITICA_VERSION = "1.0";

/**
 * Solo cuenta un true de verdad. La ley pide autorización expresa: ni un
 * "true" en texto, ni un 1, ni que el campo falte valen como aceptación.
 */
function aceptoPolitica(valor) {
  return valor === true;
}

module.exports = { POLITICA_VERSION, aceptoPolitica };
