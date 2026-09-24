const pool = require("../config/db");
const {
  generarDictado,
  generarComprensionAudio,
} = require("../services/iaContenido");
const { registrarActividad } = require("../utils/gamificacion");
const { guardarPalabraSiFalla } = require("../utils/vocabulario");
const { obtenerPerfil } = require("../utils/perfil");
const { compararDictado } = require("../utils/textoDictado");
const { reportarError } = require("../utils/errores");
const { idValido, marcarRespondido, YA_RESPONDIDO } = require("../utils/ejercicios");
const { fraseDeDictado, credito } = require("../utils/frasesTatoeba");

const NIVELES = ["A1", "A2", "B1", "B2", "C1", "C2"];

const AudioController = {
  /**
   * Prepara una frase para dictado y la guarda para poder corregirla después.
   * De A1 a B2 usa frases reales de Tatoeba escritas por nativos; en C1 y C2, o si algo falla, la IA.
   */
  async dictado(req, res) {
    try {
      const { nivel } = await obtenerPerfil(req.usuario.id);

      const { rows: vistas } = await pool.query(
        `SELECT contenido->>'frase' AS frase FROM ejercicios
          WHERE usuario_id = $1 AND tipo = 'dictado'
          ORDER BY fecha DESC LIMIT 400`,
        [req.usuario.id],
      );
      const yaVistas = new Set(vistas.map((v) => v.frase));
      let real = fraseDeDictado(nivel, yaVistas);

      // C1 y C2 van con la IA; si la IA falla, mejor una frase B2 real que dejar a la persona sin dictado
      let generado = null;
      if (!real) {
        generado = await generarDictado({ nivel }).catch((error) => {
          reportarError("La IA no pudo generar el dictado", error);
          return null;
        });
        if (!generado || !generado.frase) real = fraseDeDictado("B2", yaVistas);
      }

      let contenido;
      let pista;
      if (real) {
        contenido = {
          frase: real.en,
          tema: "tatoeba",
          fuente: "tatoeba",
          traduccion: real.es,
          credito: credito(real),
        };
        pista = `A real sentence written by a native speaker · ${real.nivel}`;
      } else {
        contenido = { frase: generado.frase, tema: generado.tema, fuente: "ia" };
        pista = generado.pista || null;
      }

      const indiceNivel = NIVELES.indexOf(nivel);
      const { rows } = await pool.query(
        `INSERT INTO ejercicios (usuario_id, tipo, nivel_dificultad, contenido)
         VALUES ($1, 'dictado', $2, $3) RETURNING id`,
        [
          req.usuario.id,
          indiceNivel >= 0 ? indiceNivel : 0,
          JSON.stringify(contenido),
        ],
      );

      res.json({
        ejercicioId: rows[0].id,
        nivel,
        fuente: contenido.fuente,
        // El navegador necesita el texto para leerlo en voz alta
        frase: contenido.frase,
        pista,
      });
    } catch (error) {
      reportarError("Error en /audio/dictado", error);
      res.status(500).json({ error: "No se pudo preparar el dictado" });
    }
  },

  /** Corrige el dictado contra la frase guardada, nunca contra lo que mande el cliente. */
  async responderDictado(req, res) {
    try {
      const ejercicioId = idValido((req.body || {}).ejercicioId);
      const texto = typeof (req.body || {}).texto === "string" ? req.body.texto.slice(0, 1000) : "";

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

      const { frase, traduccion = null, credito: creditoFrase = null } = rows[0].contenido;
      const resultado = compararDictado(frase, texto);
      const perfecto = resultado.porcentaje === 100;

      if (!(await marcarRespondido(ejercicioId, req.usuario.id, perfecto))) {
        return res.status(409).json(YA_RESPONDIDO);
      }

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
        { perfecto, modulo: "audio" },
      );

      res.json({
        frase,
        // Las frases de Tatoeba traen su traducción y el crédito que exige la licencia
        traduccion,
        credito: creditoFrase,
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
      reportarError("Error en /audio/responder-dictado", error);
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
      reportarError("Error en /audio/comprension", error);
      res.status(500).json({ error: "No se pudo preparar el audio" });
    }
  },

  async responderComprension(req, res) {
    try {
      const ejercicioId = idValido((req.body || {}).ejercicioId);
      const { respuestas } = req.body || {};

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

      if (!(await marcarRespondido(ejercicioId, req.usuario.id, perfecto))) {
        return res.status(409).json(YA_RESPONDIDO);
      }

      const gamificacion = await registrarActividad(
        req.usuario.id,
        aciertos * 5,
        { perfecto, modulo: "audio" },
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
      reportarError("Error en /audio/responder-comprension", error);
      res.status(500).json({ error: "No se pudieron revisar tus respuestas" });
    }
  },
};

module.exports = AudioController;
