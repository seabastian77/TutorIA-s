const pool = require("../config/db");
const {
  listarTemasLectura,
  obtenerTemaLectura,
  generarLectura,
  generarCapituloLibro,
  traducirPalabra,
} = require("../services/iaContenido");
const { LIBROS, obtenerLibro } = require("../data/libros");
const { obtenerMedio } = require("../services/medios");
const { registrarActividad } = require("../utils/gamificacion");
const { obtenerPerfil } = require("../utils/perfil");
const { reportarError } = require("../utils/errores");
const {
  limpiarPalabra,
  esPalabraInglesa,
  limpiarFrase,
  normalizarTraduccion,
  crearCacheTraducciones,
  claveTraduccion,
} = require("../utils/palabraTocada");

const cacheTraducciones = crearCacheTraducciones();
const XP_POR_CAPITULO = 10;

// Si dos estudiantes abren a la vez un capítulo que nadie ha leído en su nivel, la IA lo escribe una sola vez
const capitulosEnCamino = new Map();

/** Trae el capítulo guardado de ese nivel o lo pide a la IA y lo guarda para los demás. */
async function capituloDelNivel(libro, numero, nivel) {
  const { rows } = await pool.query(
    "SELECT lineas, traducciones FROM libros_capitulos WHERE libro = $1 AND capitulo = $2 AND nivel = $3",
    [libro.id, numero, nivel],
  );
  if (rows.length) return rows[0];

  const clave = `${libro.id}|${numero}|${nivel}`;
  if (!capitulosEnCamino.has(clave)) {
    const promesa = (async () => {
      const nuevo = await generarCapituloLibro({ libro, numero, nivel });
      const { rows: guardado } = await pool.query(
        `INSERT INTO libros_capitulos (libro, capitulo, nivel, lineas, traducciones)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (libro, capitulo, nivel) DO UPDATE SET libro = libros_capitulos.libro
         RETURNING lineas, traducciones`,
        [libro.id, numero, nivel, JSON.stringify(nuevo.lineas), nuevo.traducciones ? JSON.stringify(nuevo.traducciones) : null],
      );
      return guardado[0];
    })().finally(() => capitulosEnCamino.delete(clave));
    capitulosEnCamino.set(clave, promesa);
  }
  return capitulosEnCamino.get(clave);
}

/** El número de capítulo que pide la ruta, solo si existe en ese libro. */
function numeroDeCapitulo(libro, valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= 1 && numero <= libro.capitulos.length ? numero : null;
}

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
      res.status(500).json({ error: "Could not load the library" });
    }
  },

  /** Abre una lectura: la sirve de la base, o la genera con IA la primera vez. */
  async lectura(req, res) {
    try {
      const { slug } = req.params;
      const tema = obtenerTemaLectura(slug);

      if (!tema) {
        return res.status(400).json({ error: "That reading doesn't exist" });
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
          .json({ error: "The AI returned an incomplete reading" });
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
      res.status(500).json({ error: "Could not open the reading" });
    }
  },

  /** Traduce la palabra tocada en su frase; la guarda en el vocabulario salvo que se pida lo contrario. */
  async traducir(req, res) {
    try {
      const { palabra, contexto, guardar = true } = req.body || {};
      const limpia = limpiarPalabra(palabra);

      if (!limpia) {
        return res.status(400).json({ error: "No word was sent" });
      }
      if (!esPalabraInglesa(limpia)) {
        return res.status(400).json({ error: "That doesn't look like an English word" });
      }

      const frase = limpiarFrase(contexto);
      const { ayudaEs } = await obtenerPerfil(req.usuario.id);

      const resultado = await cacheTraducciones.obtener(
        claveTraduccion({ palabra: limpia, contexto: frase, ayudaEs }),
        async () => normalizarTraduccion(
          await traducirPalabra({ palabra: limpia, contexto: frase, ayudaEs }),
          limpia,
        ),
      );

      if (!resultado.traduccion) {
        return res.status(502).json({ error: "Could not translate the word" });
      }

      let guardada = false;
      if (guardar === false) {
        // Sin guardar, igual se avisa si la palabra ya estaba en el vocabulario
        const { rows } = await pool.query(
          "SELECT 1 FROM vocabulario_usuario WHERE usuario_id = $1 AND LOWER(palabra) = LOWER($2) LIMIT 1",
          [req.usuario.id, resultado.palabra],
        );
        guardada = rows.length > 0;
      } else {
        // Entra al vocabulario de repetición espaciada si aún no estaba; nunca tumba la traducción
        try {
          await pool.query(
            `INSERT INTO vocabulario_usuario (usuario_id, palabra, traduccion, contexto)
             SELECT $1::int, $2::text, $3::text, $4::text
              WHERE NOT EXISTS (
                SELECT 1 FROM vocabulario_usuario
                 WHERE usuario_id = $1::int AND LOWER(palabra) = LOWER($2::text)
              )`,
            [req.usuario.id, resultado.palabra, resultado.traduccion, frase || null],
          );
          guardada = true;
        } catch (error) {
          reportarError("No se pudo guardar la palabra tocada", error);
        }
      }

      res.json({ ...resultado, guardada });
    } catch (error) {
      reportarError("Error en /biblioteca/traducir", error);
      res.status(500).json({ error: "Could not translate the word" });
    }
  },

  /** El estante de clásicos, con los capítulos que ya terminó el estudiante. */
  async libros(req, res) {
    try {
      const { nivel } = await obtenerPerfil(req.usuario.id);
      const { rows } = await pool.query(
        "SELECT libro, capitulo FROM libros_leidos WHERE usuario_id = $1",
        [req.usuario.id],
      );
      const leidos = new Set(rows.map((f) => `${f.libro}|${f.capitulo}`));

      res.json({
        nivel,
        libros: LIBROS.map((libro) => ({
          id: libro.id,
          titulo: libro.titulo,
          tituloEs: libro.tituloEs,
          autor: libro.autor,
          anio: libro.anio,
          genero: libro.genero,
          portada: `assets/libros/${libro.id}.webp`,
          capitulos: libro.capitulos.map((c, i) => ({
            numero: i + 1,
            titulo: c.titulo,
            tituloEs: c.tituloEs,
            leido: leidos.has(`${libro.id}|${i + 1}`),
          })),
        })),
      });
    } catch (error) {
      reportarError("Error en /biblioteca/libros", error);
      res.status(500).json({ error: "Could not load the books" });
    }
  },

  /** Un capítulo contado al nivel del estudiante, con su español y, si hay, video de ambiente. */
  async capitulo(req, res) {
    try {
      const libro = obtenerLibro(req.params.libro);
      const numero = libro && numeroDeCapitulo(libro, req.params.numero);
      if (!libro || !numero) {
        return res.status(404).json({ error: "That chapter doesn't exist" });
      }

      const { nivel } = await obtenerPerfil(req.usuario.id);
      const contenido = await capituloDelNivel(libro, numero, nivel);

      const { rows: leido } = await pool.query(
        "SELECT 1 FROM libros_leidos WHERE usuario_id = $1 AND libro = $2 AND capitulo = $3",
        [req.usuario.id, libro.id, numero],
      );

      // El video es solo ambiente: si falla o no hay clave de Pexels, el capítulo se lee igual
      let video = null;
      try {
        const medio = await obtenerMedio("video", libro.ambiente);
        if (medio) video = { url: medio.url, poster: medio.miniatura, autor: medio.autor, autorUrl: medio.autorUrl };
      } catch (error) {
        reportarError("No se pudo traer el video del libro", error);
      }

      const capitulo = libro.capitulos[numero - 1];
      res.json({
        libro: { id: libro.id, titulo: libro.titulo, autor: libro.autor, portada: `assets/libros/${libro.id}.webp`, total: libro.capitulos.length },
        nivel,
        numero,
        titulo: capitulo.titulo,
        tituloEs: capitulo.tituloEs,
        lineas: contenido.lineas,
        traducciones: contenido.traducciones,
        leido: leido.length > 0,
        video,
      });
    } catch (error) {
      reportarError("Error en /biblioteca/libros/capitulo", error);
      res.status(500).json({ error: "Could not open the chapter" });
    }
  },

  /** Marca el capítulo como terminado; el XP llega solo la primera vez. */
  async terminarCapitulo(req, res) {
    try {
      const libro = obtenerLibro(req.params.libro);
      const numero = libro && numeroDeCapitulo(libro, req.params.numero);
      if (!libro || !numero) {
        return res.status(404).json({ error: "That chapter doesn't exist" });
      }

      const { rows } = await pool.query(
        `INSERT INTO libros_leidos (usuario_id, libro, capitulo) VALUES ($1, $2, $3)
         ON CONFLICT (usuario_id, libro, capitulo) DO NOTHING
         RETURNING capitulo`,
        [req.usuario.id, libro.id, numero],
      );
      const primeraVez = rows.length > 0;
      const gamificacion = primeraVez
        ? await registrarActividad(req.usuario.id, XP_POR_CAPITULO, { modulo: "libros" })
        : { xpGanado: 0, monedasGanadas: 0, metaCompletada: false };

      res.json({
        repetida: !primeraVez,
        terminado: numero === libro.capitulos.length,
        xpGanado: gamificacion.xpGanado,
        puntosTotales: gamificacion.puntos,
        racha: gamificacion.racha,
        monedas: gamificacion.monedas,
        monedasGanadas: gamificacion.monedasGanadas,
        metaCompletada: gamificacion.metaCompletada,
      });
    } catch (error) {
      reportarError("Error en /biblioteca/libros/terminar", error);
      res.status(500).json({ error: "Could not save your progress" });
    }
  },

  /** Corrige las preguntas de comprensión y da la recompensa. */
  async responder(req, res) {
    try {
      const { respuestas } = req.body || {};
      const lecturaId = Number.isInteger(Number((req.body || {}).lecturaId)) ? Number(req.body.lecturaId) : null;

      if (!lecturaId || !Array.isArray(respuestas)) {
        return res.status(400).json({ error: "Some answer data is missing" });
      }

      const { rows } = await pool.query(
        "SELECT id, preguntas FROM lecturas WHERE id = $1",
        [lecturaId],
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: "That reading doesn't exist" });
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

      const { rows: guardada } = await pool.query(
        `INSERT INTO lecturas_completadas (usuario_id, lectura_id, aciertos, total)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (usuario_id, lectura_id)
         DO UPDATE SET aciertos = GREATEST(lecturas_completadas.aciertos, $3),
                       total = $4, fecha = NOW()
         RETURNING (xmax = 0) AS primera_vez`,
        [req.usuario.id, lecturaId, aciertos, total],
      );

      // Releer un cuento sirve para practicar, pero el XP y las monedas se ganan solo la primera vez
      const primeraVez = Boolean(guardada[0] && guardada[0].primera_vez);
      const gamificacion = primeraVez
        ? await registrarActividad(req.usuario.id, aciertos * 5, { perfecto, modulo: "biblioteca" })
        : { xpGanado: 0, monedasGanadas: 0, metaCompletada: false };

      res.json({
        aciertos,
        total,
        perfecto,
        correccion,
        repetida: !primeraVez,
        xpGanado: gamificacion.xpGanado,
        puntosTotales: gamificacion.puntos,
        racha: gamificacion.racha,
        monedas: gamificacion.monedas,
        monedasGanadas: gamificacion.monedasGanadas,
        metaCompletada: gamificacion.metaCompletada,
      });
    } catch (error) {
      reportarError("Error en /biblioteca/responder", error);
      res.status(500).json({ error: "Could not check your answers" });
    }
  },
};

/** El cliente nunca debe recibir cuál es la respuesta correcta. */
function quitarRespuestas(preguntas) {
  if (!Array.isArray(preguntas)) return [];
  return preguntas.map(({ respuestaCorrecta, ...resto }) => resto);
}

module.exports = BibliotecaController;
