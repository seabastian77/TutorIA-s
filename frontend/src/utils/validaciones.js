// src/utils/validaciones.js

function correoValido(correo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

function contrasenaValida(contrasena) {
  return typeof contrasena === 'string' && contrasena.length >= 6;
}

window.Validaciones = { correoValido, contrasenaValida };
