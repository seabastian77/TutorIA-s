const pool = require("../config/db");
const {
  generarDictado,
  generarComprensionAudio,
} = require("../services/iaContenido");
const { registrarActividad } = require("../utils/gamificacion");
const { guardarPalabraSiFalla } = require("../utils/vocabulario");
const { obtenerPerfil } = require("../utils/perfil");
const { compararDictado } = require("../utils/textoDictado");

const NIVELES = ["A1", "A2", "B1", "B2", "C1", "C2"];

const AudioController = {
  /** Genera una frase para dictado y la guarda para poder corregirla después. */
  async dictado(req, res) {
    try {
      const { nivel } = await obtenerPerfil(req.usuario.id);
      const generado = await generarDictado({ nivel });

      if (!generado || !generado.frase) {
        return res
          .status(502)
          .json({ error: "La IA no devolvió una frase válida" });
      }

      const indiceNivel = NIVELES.indexOf(nivel);
      const { rows } = await pool.query(
        `INSERT INTO ejercicios (usuario_id, tipo, nivel_dificultad, contenido)
         VALUES ($1, 'dictado', $2, $3) RETURNING id`,
        [
          req.usuario.id,
          indiceNivel >= 0 ? indiceNivel : 0,
          JSON.stringify({ frase: generado.frase, tema: generado.tema }),
        ],
      );

      res.json({
        ejercicioId: rows[0].id,
        nivel,
        // El navegador necesita el texto para leerlo en voz alta
        frase: generado.frase,
        pista: generado.pista || null,
      });
    } catch (error) {
      console.error("Error en /audio/dictado:", error);
      res.status(500).json({ error: "No se pudo preparar el dictado" });
    }
  },

  /** Corrige el dictado contra la frase guardada, nunca contra lo que mande el cliente. */
  async responderDictado(req, res) {
    try {
      const { ejercicioId, texto } = req.body;

      if (!ejercicioId) {
        return res.status(400).json({ error: "Falta el ejercicio" });
      }

      const { rows } = await pool.query(
        `SELECT id, contenido FROM ejercicios
          WHERE id = $1 AND usuario_id = $2 AND tipo = 'dictado'`,
        [ejercicioId, req.usuario.id],
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: "Ese dictado no existe" });
      }

      const frase = rows[0].contenido.frase;
      const resultado = compararDictado(frase, texto);
      const perfecto = resultado.porcentaje === 100;

      await pool.query("UPDATE ejercicios SET correcto = $1 WHERE id = $2", [
        perfecto,
        ejercicioId,
      ]);

      if (!perfecto) {
        const falladas = resultado.detalle
          .filter((d) => !d.acerto)
          .map((d) => d.palabra)
          .join(", ");
        if (falladas) {
          guardarPalabraSiFalla(req.usuario.id, "dictado", {
            frase,
            falladas,
          });
        }
      }

      const gamificacion = await registrarActividad(
        req.usuario.id,
        Math.round(resultado.porcentaje / 10),
        { perfecto },
      );

      res.json({
        frase,
        ...resultado,
        perfecto,
        xpGanado: gamificacion.xpGanado,
        puntosTotales: gamificacion.puntos,
        racha: gamificacion.racha,
        monedas: gamificacion.monedas,
        monedasGanadas: gamificacion.monedasGanadas,
        metaCompletada: gamificacion.metaCompletada,
      });
    } catch (error) {
      console.error("Error en /audio/responder-dictado:", error);
      res.status(500).json({ error: "No se pudo revisar tu dictado" });
    }
  },

  /** Genera un audio de comprensión con sus preguntas. */
  async comprension(req, res) {
    try {
      const { nivel } = await obtenerPerfil(req.usuario.id);
      const generado = await generarComprensionAudio({ nivel });

      if (!generado || !generado.texto || !Array.isArray(generado.preguntas)) {
        return res
          .status(502)
          .json({ error: "La IA devolvió un audio incompleto" });
      }

      const indiceNivel = NIVELES.indexOf(nivel);
      const { rows } = await pool.query(
        `INSERT INTO ejercicios (usuario_id, tipo, nivel_dificultad, contenido)
         VALUES ($1, 'audio_comprension', $2, $3) RETURNING id`,
        [
          req.usuario.id,
          indiceNivel >= 0 ? indiceNivel : 0,
          JSON.stringify({
            texto: generado.texto,
            preguntas: generado.preguntas,
          }),
        ],
      );

      res.json({
        ejercicioId: rows[0].id,
        nivel,
        titulo: generado.titulo || "Listening",
        texto: generado.texto,
        preguntas: generado.preguntas.map(
          ({ respuestaCorrecta, ...resto }) => resto,
        ),
      });
    } catch (error) {
      console.error("Error en /audio/comprension:", error);
      res.status(500).json({ error: "No se pudo preparar el audio" });
    }
  },

  async responderComprension(req, res) {
    try {
      const { ejercicioId, respuestas } = req.body;

      if (!ejercicioId || !Array.isArray(respuestas)) {
        return res.status(400).json({ error: "Faltan datos de la respuesta" });
      }

      const { rows } = await pool.query(
        `SELECT contenido FROM ejercicios
          WHERE id = $1 AND usuario_id = $2 AND tipo = 'audio_comprension'`,
        [ejercicioId, req.usuario.id],
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: "Ese ejercicio no existe" });
      }

      const preguntas = rows[0].contenido.preguntas || [];
      const correccion = preguntas.map((p, i) => ({
        indice: i,
        correcta: p.respuestaCorrecta,
        acerto: respuestas[i] === p.respuestaCorrecta,
      }));

      const aciertos = correccion.filter((c) => c.acerto).length;
      const total = preguntas.length;
      const perfecto = total > 0 && aciertos === total;

      await pool.query("UPDATE ejercicios SET correcto = $1 WHERE id = $2", [
        perfecto,
        ejercicioId,
      ]);

      const gamificacion = await registrarActividad(
        req.usuario.id,
        aciertos * 5,
        { perfecto },
      );

      res.json({
        aciertos,
        total,
        perfecto,
        correccion,
        texto: rows[0].contenido.texto,
        xpGanado: gamificacion.xpGanado,
        puntosTotales: gamificacion.puntos,
        racha: gamificacion.racha,
        monedas: gamificacion.monedas,
        monedasGanadas: gamificacion.monedasGanadas,
        metaCompletada: gamificacion.metaCompletada,
      });
    } catch (error) {
      console.error("Error en /audio/responder-comprension:", error);
      res.status(500).json({ error: "No se pudieron revisar tus respuestas" });
    }
  },
};

module.exports = AudioController;
