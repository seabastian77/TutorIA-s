const {
  generarPreguntaNivel,
  generarPreguntaEscrita,
  evaluarRespuestaEscrita,
} = require("../services/iaService");
const EjercicioModel = require("../models/ejercicioModel");
const pool = require("../config/db");
const { obtenerPerfil } = require("../utils/perfil");
const { registrarActividad } = require("../utils/gamificacion");
const { guardarPalabraSiFalla } = require("../utils/vocabulario");
const { reportarError } = require("../utils/errores");
const { idValido, marcarRespondido, YA_RESPONDIDO } = require("../utils/ejercicios");

const NIVELES = ["A1", "A2", "B1", "B2", "C1", "C2"];

function calcularNivelAdaptativo(historial, nivelUsuarioBase) {
  let indice = NIVELES.indexOf(nivelUsuarioBase);
  if (indice < 0) indice = 2;

  if (historial.length === 0) return { indice, temasRecientes: [] };

  const ultimos5 = historial.slice(0, 5);
  const aciertos = ultimos5.filter((e) => e.correcto).length;

  if (aciertos >= 4) indice = Math.min(indice + 1, NIVELES.length - 1);
  else if (aciertos <= 1) indice = Math.max(indice - 1, 0);

  const temasRecientes = historial
    .slice(0, 8)
    .map((e) => e.contenido?.tema)
    .filter(Boolean);

  return { indice, temasRecientes };
}

const PracticaController = {
  async siguientePregunta(req, res) {
    try {
      const historial = await EjercicioModel.obtenerHistorialReciente(
        req.usuario.id,
      );
      const { indice, temasRecientes } = calcularNivelAdaptativo(
        historial,
        req.usuario.nivel_mcer,
      );
      const nivel = NIVELES[indice];
      const tipo = Math.random() < 0.6 ? "opcion_multiple" : "escrita";

      // El tema lo elige el usuario en la pantalla previa; si no eligió, va libre
      const tema = typeof req.body?.tema === "string"
        ? req.body.tema.slice(0, 80)
        : null;

      const contenido =
        tipo === "opcion_multiple"
          ? await generarPreguntaNivel(nivel, temasRecientes, { tema })
          : await generarPreguntaEscrita(nivel, temasRecientes, { tema });

      // La pregunta queda guardada con su respuesta; al navegador solo le llega lo que debe ver
      const { rows } = await pool.query(
        `INSERT INTO ejercicios (usuario_id, tipo, nivel_dificultad, contenido)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [req.usuario.id, tipo, indice, JSON.stringify(contenido)],
      );
      const { respuestaCorrecta, ...visible } = contenido || {};

      return res.json({ ejercicioId: rows[0].id, tipo, nivel, tema, contenido: visible });
    } catch (error) {
      reportarError("Error en /practica/pregunta", error);
      res.status(500).json({ error: "No se pudo generar el ejercicio" });
    }
  },

  async responder(req, res) {
    try {
      const ejercicioId = idValido((req.body || {}).ejercicioId);
      const respuestaUsuario = (req.body || {}).respuestaUsuario;
      if (!ejercicioId || respuestaUsuario === undefined || respuestaUsuario === null) {
        return res.status(400).json({ error: "Falta el ejercicio o la respuesta" });
      }

      // Se califica contra la pregunta guardada, nunca contra lo que mande el navegador
      const { rows } = await pool.query(
        `SELECT tipo, contenido, correcto FROM ejercicios
          WHERE id = $1 AND usuario_id = $2 AND tipo IN ('opcion_multiple', 'escrita')`,
        [ejercicioId, req.usuario.id],
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: "Ese ejercicio no existe" });
      }
      if (rows[0].correcto !== null) {
        return res.status(409).json(YA_RESPONDIDO);
      }

      const { tipo, contenido } = rows[0];
      let correcto;
      let explicacion = null;

      if (tipo === "opcion_multiple") {
        correcto = Number(respuestaUsuario) === Number(contenido.respuestaCorrecta);
      } else {
        const { ayudaEs } = await obtenerPerfil(req.usuario.id);
        const evaluacion = await evaluarRespuestaEscrita(
          contenido.frase,
          String(respuestaUsuario).slice(0, 300),
          { ayudaEs },
        );
        correcto = Boolean(evaluacion.correcto);
        explicacion = evaluacion.explicacion;
      }

      if (!(await marcarRespondido(ejercicioId, req.usuario.id, correcto))) {
        return res.status(409).json(YA_RESPONDIDO);
      }

      if (!correcto) {
        guardarPalabraSiFalla(req.usuario.id, tipo, contenido);
      }

      // Bonus por cinco aciertos seguidos, contando el actual
      let perfecto = false;
      if (correcto) {
        const { rows: ultimos } = await pool.query(
          `SELECT correcto FROM ejercicios
            WHERE usuario_id = $1 AND correcto IS NOT NULL
            ORDER BY fecha DESC, id DESC LIMIT 5`,
          [req.usuario.id],
        );
        perfecto = ultimos.length === 5 && ultimos.every((e) => e.correcto);
      }

      const puntosGanados = correcto ? 10 : 0;
      const gamificacion = await registrarActividad(
        req.usuario.id,
        puntosGanados,
        { perfecto, modulo: "practica" },
      );

      res.json({
        correcto,
        explicacion,
        respuestaCorrecta: tipo === "opcion_multiple" ? contenido.respuestaCorrecta : undefined,
        puntosGanados,
        perfecto,
        bonusPerfecto: gamificacion.bonusPerfecto,
        xpGanado: gamificacion.xpGanado,
        puntosTotales: gamificacion.puntos,
        racha: gamificacion.racha,
        monedas: gamificacion.monedas,
        monedasGanadas: gamificacion.monedasGanadas,
        metaCompletada: gamificacion.metaCompletada,
      });
    } catch (error) {
      reportarError("Error en /practica/responder", error);
      res.status(500).json({ error: "No se pudo evaluar la respuesta" });
    }
  },
};

module.exports = PracticaController;
