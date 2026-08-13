const {
  generarEscenaDiagnostico,
  evaluarRespuestaAbierta,
  generarResumenFinal,
} = require("../services/iaService");
const { registrarActividad } = require("../utils/gamificacion");
const { guardarPalabraSiFalla } = require("../utils/vocabulario");
const pool = require("../config/db");

const NIVELES_VALIDOS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const HABILIDADES = ["vocabulario", "gramatica", "comprension", "fluidez"];

const DiagnosticoController = {
  async escena(req, res) {
    try {
      const { nivel, turno, historialNarrativo } = req.body;
      const nivelValido = NIVELES_VALIDOS.includes(nivel) ? nivel : "B1";
      const turnoNum = Number.isInteger(turno) ? turno : 0;
      const habilidad = HABILIDADES[turnoNum % HABILIDADES.length];

      const escena = await generarEscenaDiagnostico({
        nivel: nivelValido,
        turno: turnoNum,
        historialNarrativo: historialNarrativo || [],
        habilidad,
      });

      res.json({ ...escena, habilidad });
    } catch (error) {
      console.error("Error en /nivel/escena:", error);
      res
        .status(500)
        .json({ error: "No se pudo generar la escena. Intenta de nuevo." });
    }
  },

  async evaluarAbierta(req, res) {
    try {
      const { pregunta, respuestaUsuario, nivel } = req.body;

      if (!pregunta || !respuestaUsuario) {
        return res.status(400).json({ error: "Faltan datos para evaluar" });
      }

      const evaluacion = await evaluarRespuestaAbierta({
        pregunta,
        respuestaUsuario,
        nivel: NIVELES_VALIDOS.includes(nivel) ? nivel : "B1",
      });

      // Si le fue mal, aprovechamos y guardamos la palabra en su vocabulario
      if ((evaluacion.puntuacion || 0) < 60) {
        guardarPalabraSiFalla(req.usuario.id, "escrita", {
          frase: pregunta,
          tema: "level diagnostic",
        });
      }

      res.json(evaluacion);
    } catch (error) {
      console.error("Error en /nivel/evaluar-abierta:", error);
      res.status(500).json({ error: "No se pudo evaluar tu respuesta." });
    }
  },

  // El frontend llama esto cuando el usuario falla una pregunta de
  // opción múltiple del diagnóstico, para capturar la palabra clave
  async falloOpcion(req, res) {
    try {
      const { pregunta, opciones, respuestaCorrecta, tema } = req.body;

      if (!pregunta || !Array.isArray(opciones)) {
        return res.status(400).json({ error: "Faltan datos" });
      }

      guardarPalabraSiFalla(req.usuario.id, "opcion_multiple", {
        pregunta,
        opciones,
        respuestaCorrecta,
        tema: tema || "level diagnostic",
      });

      res.json({ ok: true });
    } catch (error) {
      console.error("Error en /nivel/fallo-opcion:", error);
      res.status(500).json({ error: "No se pudo registrar" });
    }
  },

  async finalizar(req, res) {
    try {
      const { historial } = req.body;

      if (!Array.isArray(historial) || historial.length === 0) {
        return res.status(400).json({ error: "Historial vacío" });
      }

      const promedios = {};
      HABILIDADES.forEach((h) => {
        const turnos = historial.filter((t) => t.habilidad === h);
        promedios[h] = turnos.length
          ? Math.round(
              turnos.reduce((suma, t) => suma + (t.puntuacion || 0), 0) /
                turnos.length,
            )
          : 50;
      });

      const promedioGeneral =
        Object.values(promedios).reduce((a, b) => a + b, 0) /
        HABILIDADES.length;

      let nivelFinal = "A1";
      if (promedioGeneral >= 90) nivelFinal = "C2";
      else if (promedioGeneral >= 78) nivelFinal = "C1";
      else if (promedioGeneral >= 64) nivelFinal = "B2";
      else if (promedioGeneral >= 48) nivelFinal = "B1";
      else if (promedioGeneral >= 28) nivelFinal = "A2";

      const resumen = await generarResumenFinal({
        nivel: nivelFinal,
        promedios,
      });

      await pool.query(
        `INSERT INTO diagnosticos_nivel
           (usuario_id, nivel_mcer, vocabulario, gramatica, comprension, fluidez, resumen)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          req.usuario.id,
          nivelFinal,
          promedios.vocabulario,
          promedios.gramatica,
          promedios.comprension,
          promedios.fluidez,
          resumen,
        ],
      );

      await pool.query("UPDATE usuarios SET nivel_mcer = $1 WHERE id = $2", [
        nivelFinal,
        req.usuario.id,
      ]);

      const puntosGanados = Math.max(20, Math.round(promedioGeneral));
      const gamificacion = await registrarActividad(
        req.usuario.id,
        puntosGanados,
      );

      res.json({
        ok: true,
        nivel: nivelFinal,
        promedios,
        resumen,
        puntosGanados,
        puntosTotales: gamificacion.puntos,
        racha: gamificacion.racha,
      });
    } catch (error) {
      console.error("Error en /nivel/finalizar:", error);
      res.status(500).json({ error: "No se pudo guardar el diagnóstico" });
    }
  },
};

module.exports = DiagnosticoController;
