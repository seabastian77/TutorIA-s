// src/utils/respuestas.js
// Helpers para respuestas HTTP consistentes

function exito(res, datos, status = 200) {
  return res.status(status).json({ ok: true, ...datos });
}

function error(res, mensaje, status = 500) {
  return res.status(status).json({ ok: false, error: mensaje });
}

module.exports = { exito, error };
