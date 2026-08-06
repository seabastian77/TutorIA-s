const {
  generarPreguntaNivel,
  generarPreguntaEscrita,
  evaluarRespuestaEscrita,
} = require("../services/iaService");
const EjercicioModel = require("../models/ejercicioModel");

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

      if (tipo === "opcion_multiple") {
        const pregunta = await generarPreguntaNivel(nivel, temasRecientes);
        return res.json({ tipo, nivel, contenido: pregunta });
      } else {
        const ejercicio = await generarPreguntaEscrita(nivel, temasRecientes);
        return res.json({ tipo, nivel, contenido: ejercicio });
      }
    } catch (error) {
      console.error("Error en /practica/pregunta:", error);
      res.status(500).json({ error: "No se pudo generar el ejercicio" });
    }
  },

  async responder(req, res) {
    try {
      const { tipo, nivel, contenido, respuestaUsuario } = req.body;
      let correcto;
      let explicacion = null;

      if (tipo === "opcion_multiple") {
        correcto = respuestaUsuario === contenido.respuestaCorrecta;
      } else {
        const evaluacion = await evaluarRespuestaEscrita(
          contenido.frase,
          respuestaUsuario,
        );
        correcto = evaluacion.correcto;
        explicacion = evaluacion.explicacion;
      }

      const nivelIndice = NIVELES.indexOf(nivel);

      await EjercicioModel.registrar({
        usuarioId: req.usuario.id,
        tipo,
        nivelDificultad: nivelIndice >= 0 ? nivelIndice : 2,
        contenido,
        correcto,
      });

      res.json({ correcto, explicacion });
    } catch (error) {
      console.error("Error en /practica/responder:", error);
      res.status(500).json({ error: "No se pudo evaluar la respuesta" });
    }
  },
};

module.exports = PracticaController;
