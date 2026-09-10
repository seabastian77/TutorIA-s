const pool = require("../config/db");
const {
  listarTemasLectura,
  obtenerTemaLectura,
  generarLectura,
  traducirPalabra,
} = require("../services/iaContenido");
const { registrarActividad } = require("../utils/gamificacion");
const { obtenerPerfil } = require("../utils/perfil");
const { reportarError } = require("../utils/errores");

const BibliotecaController = {
  /** Catálogo: los temas fijos, marcando cuáles ya leyó el usuario. */
  async catalogo(req, res) {
    try {
      const { nivel } = await obtenerPerfil(req.usuario.id);

      const { rows: leidas } = await pool.query(
        `SELECT l.slug, lc.aciertos, lc.total
           FROM lecturas_completadas lc
           JOIN lecturas l ON l.id = lc.lectura_id
          WHERE lc.usuario_id = $1 AND l.nivel = $2`,
        [req.usuario.id, nivel],
      );

      const porSlug = {};
      leidas.forEach((f) => {
        porSlug[f.slug] = { aciertos: f.aciertos, total: f.total };
      });

      const temas = listarTemasLectura().map((t) => ({
        ...t,
        completada: !!porSlug[t.slug],
        resultado: porSlug[t.slug] || null,
      }));

      res.json({ nivel, temas });
    } catch (error) {
      reportarError("Error en /biblioteca/catalogo", error);
      res.status(500).json({ error: "No se pudo cargar la biblioteca" });
    }
  },

  /** Abre una lectura: la sirve de la base, o la genera con IA la primera vez. */
  async lectura(req, res) {
    try {
      const { slug } = req.params;
      const tema = obtenerTemaLectura(slug);

      if (!tema) {
        return res.status(400).json({ error: "Esa lectura no existe" });
      }

      const { nivel } = await obtenerPerfil(req.usuario.id);

      const { rows: existente } = await pool.query(
        "SELECT id, titulo, texto, preguntas FROM lecturas WHERE nivel = $1 AND slug = $2",
        [nivel, slug],
      );

      if (existente.length > 0) {
        const l = existente[0];
        return res.json({
          id: l.id,
          nivel,
          slug,
          titulo: l.titulo,
          texto: l.texto,
          preguntas: quitarRespuestas(l.preguntas),
        });
      }

      const generada = await generarLectura({ nivel, tema });

      if (!generada || !generada.texto || !Array.isArray(generada.preguntas)) {
        return res
          .status(502)
          .json({ error: "La IA devolvió una lectura incompleta" });
      }

      // ON CONFLICT por si dos usuarios abren la misma lectura a la vez
      const { rows: guardada } = await pool.query(
        `INSERT INTO lecturas (nivel, slug, titulo, texto, preguntas)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (nivel, slug) DO UPDATE SET titulo = lecturas.titulo
         RETURNING id, titulo, texto, preguntas`,
        [
          nivel,
          slug,
          generada.titulo || tema.titulo,
          generada.texto,
          JSON.stringify(generada.preguntas),
        ],
      );

      const l = guardada[0];
      res.json({
        id: l.id,
        nivel,
        slug,
        titulo: l.titulo,
        texto: l.texto,
        preguntas: quitarRespuestas(l.preguntas),
      });
    } catch (error) {
      reportarError("Error en /biblioteca/lectura", error);
      res.status(500).json({ error: "No se pudo abrir la lectura" });
    }
  },

  /** Traduce una palabra que el usuario tocó, y la guarda en su vocabulario. */
  async traducir(req, res) {
    try {
      const { palabra, contexto } = req.body;

      if (!palabra || !palabra.trim()) {
        return res.status(400).json({ error: "No mandaste ninguna palabra" });
      }

      const limpia = palabra.trim().slice(0, 40);
      const { ayudaEs } = await obtenerPerfil(req.usuario.id);

      const resultado = await traducirPalabra({
        palabra: limpia,
        contexto: (contexto || "").slice(0, 300),
        ayudaEs,
      });

      // Entra al vocabulario de repetición espaciada si aún no estaba
      try {
        const { rows: yaEsta } = await pool.query(
          "SELECT id FROM vocabulario_usuario WHERE usuario_id = $1 AND LOWER(palabra) = LOWER($2)",
          [req.usuario.id, resultado.palabra || limpia],
        );

        if (yaEsta.length === 0) {
          await pool.query(
            `INSERT INTO vocabulario_usuario (usuario_id, palabra, traduccion, contexto)
             VALUES ($1, $2, $3, $4)`,
            [
              req.usuario.id,
              resultado.palabra || limpia,
              resultado.traduccion,
              contexto || null,
            ],
          );
        }
      } catch (error) {
        // Guardar el vocabulario nunca debe tumbar la traducción
        reportarError("No se pudo guardar la palabra tocada", error);
      }

      res.json(resultado);
    } catch (error) {
      reportarError("Error en /biblioteca/traducir", error);
      res.status(500).json({ error: "No se pudo traducir la palabra" });
    }
  },

  /** Corrige las preguntas de comprensión y da la recompensa. */
  async responder(req, res) {
    try {
      const { lecturaId, respuestas } = req.body;

      if (!lecturaId || !Array.isArray(respuestas)) {
        return res.status(400).json({ error: "Faltan datos de la respuesta" });
      }

      const { rows } = await pool.query(
        "SELECT id, preguntas FROM lecturas WHERE id = $1",
        [lecturaId],
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: "Esa lectura no existe" });
      }

      const preguntas = rows[0].preguntas;
      const correccion = preguntas.map((p, i) => ({
        indice: i,
        correcta: p.respuestaCorrecta,
        acerto: respuestas[i] === p.respuestaCorrecta,
      }));

      const aciertos = correccion.filter((c) => c.acerto).length;
      const total = preguntas.length;
      const perfecto = aciertos === total;

      await pool.query(
        `INSERT INTO lecturas_completadas (usuario_id, lectura_id, aciertos, total)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (usuario_id, lectura_id)
         DO UPDATE SET aciertos = GREATEST(lecturas_completadas.aciertos, $3),
                       total = $4, fecha = NOW()`,
        [req.usuario.id, lecturaId, aciertos, total],
      );

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
        xpGanado: gamificacion.xpGanado,
        puntosTotales: gamificacion.puntos,
        racha: gamificacion.racha,
        monedas: gamificacion.monedas,
        monedasGanadas: gamificacion.monedasGanadas,
        metaCompletada: gamificacion.metaCompletada,
      });
    } catch (error) {
      reportarError("Error en /biblioteca/responder", error);
      res.status(500).json({ error: "No se pudieron revisar tus respuestas" });
    }
  },
};

/** El cliente nunca debe recibir cuál es la respuesta correcta. */
function quitarRespuestas(preguntas) {
  if (!Array.isArray(preguntas)) return [];
  return preguntas.map(({ respuestaCorrecta, ...resto }) => resto);
}

module.exports = BibliotecaController;
