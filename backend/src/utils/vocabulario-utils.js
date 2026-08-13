const pool = require("../config/db");
const { extraerPalabraVocabulario } = require("../services/iaService");

// Se usa desde practicaController, nivelController y escenaController.
// Si falla algo aquí, NUNCA debe tumbar la respuesta principal del endpoint que la llama.
async function guardarPalabraSiFalla(usuarioId, tipo, contenido) {
  try {
    const vocab = await extraerPalabraVocabulario({ contenido, tipo });

    const existente = await pool.query(
      "SELECT id FROM vocabulario_usuario WHERE usuario_id = $1 AND LOWER(palabra) = LOWER($2)",
      [usuarioId, vocab.palabra],
    );

    if (existente.rows.length === 0) {
      await pool.query(
        `INSERT INTO vocabulario_usuario (usuario_id, palabra, traduccion, contexto)
         VALUES ($1, $2, $3, $4)`,
        [usuarioId, vocab.palabra, vocab.traduccion, vocab.contexto],
      );
    }
  } catch (error) {
    console.error("No se pudo guardar la palabra en el vocabulario:", error);
  }
}

module.exports = { guardarPalabraSiFalla };
