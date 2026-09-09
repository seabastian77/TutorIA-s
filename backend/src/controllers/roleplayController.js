const pool = require("../config/db");
const {
  listarEscenarios,
  obtenerEscenario,
  generarAperturaRoleplay,
  generarRespuestaRoleplay,
} = require("../services/iaContenido");
const { registrarActividad } = require("../utils/gamificacion");
const { guardarPalabraSiFalla } = require("../utils/vocabulario");
const { obtenerPerfil } = require("../utils/perfil");

const MAX_HISTORIAL = 12; // turnos que se aceptan del cliente

const RoleplayController = {
  async escenarios(req, res) {
    try {
      res.json({ escenarios: listarEscenarios() });
    } catch (error) {
      console.error("Error en /roleplay/escenarios:", error);
      res.status(500).json({ error: "No se pudieron cargar las situaciones" });
    }
  },

  async iniciar(req, res) {
    try {
      const { escenarioId } = req.body;
      const escenario = obtenerEscenario(escenarioId);

      if (!escenario) {
        return res.status(400).json({ error: "Esa situación no existe" });
      }

      const { nivel } = await obtenerPerfil(req.usuario.id);
      const apertura = await generarAperturaRoleplay({ escenario, nivel });

      await pool.query(
        "INSERT INTO roleplays (usuario_id, escenario, turnos) VALUES ($1, $2, 0)",
        [req.usuario.id, escenario.id],
      );

      res.json({
        escenario: {
          id: escenario.id,
          nombre: escenario.nombre,
          descripcion: escenario.descripcion,
          icono: escenario.icono,
          color: escenario.color,
        },
        nivel,
        mensaje: apertura.mensaje,
        sugerencias: apertura.sugerencias || [],
      });
    } catch (error) {
      console.error("Error en /roleplay/iniciar:", error);
      res.status(500).json({ error: "No se pudo iniciar la situación" });
    }
  },

  async responder(req, res) {
    try {
      const { escenarioId, historial, mensajeUsuario } = req.body;
      const escenario = obtenerEscenario(escenarioId);

      if (!escenario) {
        return res.status(400).json({ error: "Esa situación no existe" });
      }

      if (!mensajeUsuario || !mensajeUsuario.trim()) {
        return res.status(400).json({ error: "No mandaste ningún mensaje" });
      }

      const { nivel, ayudaEs } = await obtenerPerfil(req.usuario.id);

      const resultado = await generarRespuestaRoleplay({
        escenario,
        historial: Array.isArray(historial)
          ? historial.slice(-MAX_HISTORIAL)
          : [],
        mensajeUsuario: mensajeUsuario.trim().slice(0, 500),
        nivel,
        ayudaEs,
      });

      // Cada turno cuenta como conversación, igual que el chat de voz
      await pool.query(
        `INSERT INTO conversaciones (usuario_id, mensaje_usuario, respuesta_ia, correcciones)
         VALUES ($1, $2, $3, $4)`,
        [
          req.usuario.id,
          mensajeUsuario,
          resultado.mensaje,
          resultado.correccion
            ? JSON.stringify({ correccion: resultado.correccion })
            : null,
        ],
      );

      await pool.query(
        `UPDATE roleplays SET turnos = turnos + 1
          WHERE id = (SELECT id FROM roleplays
                       WHERE usuario_id = $1 AND escenario = $2
                       ORDER BY fecha DESC LIMIT 1)`,
        [req.usuario.id, escenario.id],
      );

      // Si lo corrigieron, la palabra fallada entra al vocabulario
      if (resultado.correccion) {
        guardarPalabraSiFalla(req.usuario.id, "roleplay", {
          frase: mensajeUsuario,
          correccion: resultado.correccion,
        });
      }

      const gamificacion = await registrarActividad(req.usuario.id, 8, {
        perfecto: !resultado.correccion,
      });

      res.json({
        mensaje: resultado.mensaje,
        correccion: resultado.correccion || null,
        sugerencias: resultado.sugerencias || [],
        terminado: resultado.terminado === true,
        xpGanado: gamificacion.xpGanado,
        puntosTotales: gamificacion.puntos,
        racha: gamificacion.racha,
        monedas: gamificacion.monedas,
        monedasGanadas: gamificacion.monedasGanadas,
        metaCompletada: gamificacion.metaCompletada,
      });
    } catch (error) {
      console.error("Error en /roleplay/responder:", error);
      res.status(500).json({ error: "No se pudo continuar la conversación" });
    }
  },
};

module.exports = RoleplayController;
