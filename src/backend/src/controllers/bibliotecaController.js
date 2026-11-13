const zlib = require("zlib");
const pool = require("../config/db");
const {
  listarTemasLectura,
  obtenerTemaLectura,
  generarLectura,
  generarCapituloLibro,
  generarParteLibro,
  traducirPalabra,
} = require("../services/iaContenido");
const { LIBROS, obtenerLibro } = require("../data/libros");
const { buscarLibros, obtenerFicha, descargarTexto, GENEROS, URL_GUTENBERG } = require("../services/gutenberg");
const { partirEnPartes } = require("../utils/textoGutenberg");
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
const NUEVOS_POR_DIA = 20; // capítulos que la IA escribe al día por estudiante; los ya escritos se leen sin límite
const ID_EXTERNO = /^pg(\d{1,7})$/;
const MAX_EN_MEMORIA = 12;

// Si dos estudiantes abren a la vez un capítulo o un libro nuevo, se prepara una sola vez
const capitulosEnCamino = new Map();
const librosEnCamino = new Map();
const librosEnMemoria = new Map();

function errorConEstado(estado, mensaje) {
  const error = new Error(mensaje);
  error.status = estado;
  return error;
}

/** Guarda los últimos libros abiertos para no descomprimirlos en cada capítulo. */
function recordarLibro(id, valor) {
  librosEnMemoria.delete(id);
  if (librosEnMemoria.size >= MAX_EN_MEMORIA) librosEnMemoria.delete(librosEnMemoria.keys().next().value);
  librosEnMemoria.set(id, valor);
}

/** Un libro del catálogo libre: de la memoria, de la base o, la primera vez, bajado de Gutenberg y partido en partes. */
async function libroExterno(id) {
  if (librosEnMemoria.has(id)) return librosEnMemoria.get(id);
  if (!librosEnCamino.has(id)) {
    const promesa = (async () => {
      const { rows } = await pool.query(
        "SELECT gutenberg_id, titulo, autor, portada, partes FROM libros_externos WHERE id = $1",
        [id],
      );
      let ficha = rows[0] ? { gutenbergId: rows[0].gutenberg_id, titulo: rows[0].titulo, autor: rows[0].autor, portada: rows[0].portada } : null;
      let partes;
      if (ficha) {
        partes = JSON.parse(zlib.gunzipSync(rows[0].partes).toString("utf8"));
      } else {
        ficha = await obtenerFicha(Number(ID_EXTERNO.exec(id)[1]));
        partes = partirEnPartes(await descargarTexto(ficha)).map((p) => ({ t: p.titulo, x: p.texto }));
        if (!partes.length) throw errorConEstado(422, "This book can't be read here");
        await pool.query(
          `INSERT INTO libros_externos (id, gutenberg_id, titulo, autor, portada, total, partes)
           VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
          [id, ficha.gutenbergId, ficha.titulo, ficha.autor, ficha.portada, partes.length, zlib.gzipSync(Buffer.from(JSON.stringify(partes)))],
        );
      }
      const valor = {
        libro: { id, tipo: "externo", gutenbergId: ficha.gutenbergId, titulo: ficha.titulo, autor: ficha.autor, portada: ficha.portada, total: partes.length },
        partes,
      };
      recordarLibro(id, valor);
      return valor;
    })().finally(() => librosEnCamino.delete(id));
    librosEnCamino.set(id, promesa);
  }
  return librosEnCamino.get(id);
}

/** El libro que pide la ruta: un clásico del estante o uno del catálogo libre; null si no existe. */
async function resolverLibro(id) {
  const clasico = obtenerLibro(id);
  if (clasico) {
    return {
      clasico,
      libro: { id: clasico.id, tipo: "clasico", titulo: clasico.titulo, autor: clasico.autor, portada: `assets/libros/${clasico.id}.webp`, total: clasico.capitulos.length },
    };
  }
  return ID_EXTERNO.test(String(id)) ? libroExterno(String(id)) : null;
}

/** Cuántos capítulos tiene un libro ya abierto alguna vez; null si nadie lo ha abierto. */
async function totalDeLibro(id) {
  const clasico = obtenerLibro(id);
  if (clasico) return clasico.capitulos.length;
  if (!ID_EXTERNO.test(String(id))) return null;
  if (librosEnMemoria.has(id)) return librosEnMemoria.get(id).libro.total;
  const { rows } = await pool.query("SELECT total FROM libros_externos WHERE id = $1", [id]);
  return rows.length ? rows[0].total : null;
}

/** Trae el capítulo guardado de ese nivel o lo pide a la IA y lo guarda para los demás. */
async function capituloDelNivel(datos, numero, nivel, usuarioId) {
  const { libro } = datos;
  const { rows } = await pool.query(
    "SELECT lineas, traducciones, titulo, titulo_es, ambiente FROM libros_capitulos WHERE libro = $1 AND capitulo = $2 AND nivel = $3",
    [libro.id, numero, nivel],
  );
  if (rows.length) return rows[0];

  const clave = `${libro.id}|${numero}|${nivel}`;
  if (!capitulosEnCamino.has(clave)) {
    const { rows: hoy } = await pool.query(
      "SELECT COUNT(*)::int AS n FROM libros_capitulos WHERE creado_por = $1 AND fecha > NOW() - INTERVAL '1 day'",
      [usuarioId],
    );
    if (hoy[0].n >= NUEVOS_POR_DIA) throw errorConEstado(429, "Ya pidió muchos capítulos nuevos hoy");
    const promesa = (async () => {
      const parte = datos.partes ? datos.partes[numero - 1] : null;
      const nuevo = datos.clasico
        ? await generarCapituloLibro({ libro: datos.clasico, numero, nivel })
        : await generarParteLibro({ libro, numero, parte: { titulo: parte.t, texto: parte.x }, nivel });
      const { rows: guardado } = await pool.query(
        `INSERT INTO libros_capitulos (libro, capitulo, nivel, lineas, traducciones, titulo, titulo_es, ambiente, creado_por)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (libro, capitulo, nivel) DO UPDATE SET libro = libros_capitulos.libro
         RETURNING lineas, traducciones, titulo, titulo_es, ambiente`,
        [
          libro.id, numero, nivel,
          JSON.stringify(nuevo.lineas), nuevo.traducciones ? JSON.stringify(nuevo.traducciones) : null,
          nuevo.titulo || null, nuevo.tituloEs || null, nuevo.ambiente || null, usuarioId,
        ],
      );
      return guardado[0];
    })().finally(() => capitulosEnCamino.delete(clave));
    capitulosEnCamino.set(clave, promesa);
  }
  return capitulosEnCamino.get(clave);
}

/** El número de capítulo que pide la ruta, solo si existe en ese libro. */
function numeroDeCapitulo(total, valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= 1 && numero <= total ? numero : null;
}

/** El primer capítulo que le falta al estudiante, o el 1 si ya leyó todo. */
function siguienteCapitulo(leidos, total) {
  for (let n = 1; n <= total; n += 1) if (!leidos.has(n)) return n;
  return 1;
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

  /** El estante: los clásicos con su avance y los libros del catálogo libre que el estudiante ya empezó. */
  async libros(req, res) {
    try {
      const { nivel } = await obtenerPerfil(req.usuario.id);
      const { rows } = await pool.query(
        "SELECT libro, capitulo FROM libros_leidos WHERE usuario_id = $1",
        [req.usuario.id],
      );
      const leidos = new Set(rows.map((f) => `${f.libro}|${f.capitulo}`));
      const { rows: externos } = await pool.query(
        `SELECT e.id, e.titulo, e.autor, e.portada, e.total, ARRAY_AGG(l.capitulo) AS capitulos, MAX(l.fecha) AS ultima
           FROM libros_leidos l JOIN libros_externos e ON e.id = l.libro
          WHERE l.usuario_id = $1
          GROUP BY e.id
          ORDER BY ultima DESC
          LIMIT 12`,
        [req.usuario.id],
      );

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
        empezados: externos.map((e) => {
          const hechos = new Set(e.capitulos);
          return {
            id: e.id,
            titulo: e.titulo,
            autor: e.autor,
            portada: e.portada,
            total: e.total,
            leidos: hechos.size,
            siguiente: siguienteCapitulo(hechos, e.total),
          };
        }),
      });
    } catch (error) {
      reportarError("Error en /biblioteca/libros", error);
      res.status(500).json({ error: "Could not load the books" });
    }
  },

  /** Busca en el catálogo libre por título o autor, o muestra un género; pagina sin fin. */
  async buscarLibros(req, res) {
    try {
      const busqueda = typeof req.query.q === "string" ? req.query.q.replace(/\s+/g, " ").trim().slice(0, 80) : "";
      const genero = typeof req.query.genero === "string" && GENEROS[req.query.genero] ? req.query.genero : "";
      const pagina = Math.min(100, Math.max(1, parseInt(req.query.pagina, 10) || 1));
      const datos = await buscarLibros({ busqueda, genero, pagina });

      const ids = datos.libros.map((l) => l.id);
      let avance = new Map();
      if (ids.length) {
        const { rows } = await pool.query(
          "SELECT libro, COUNT(*)::int AS leidos FROM libros_leidos WHERE usuario_id = $1 AND libro = ANY($2) GROUP BY libro",
          [req.usuario.id, ids],
        );
        avance = new Map(rows.map((f) => [f.libro, f.leidos]));
      }
      res.json({
        libros: datos.libros.map((l) => ({ id: l.id, titulo: l.titulo, autor: l.autor, portada: l.portada, leidos: avance.get(l.id) || 0 })),
        pagina,
        hayMas: datos.hayMas,
        total: datos.total,
      });
    } catch (error) {
      reportarError("Error en /biblioteca/libros/buscar", error);
      res.status(502).json({ error: "The book catalog isn't answering right now. Try again in a moment." });
    }
  },

  /** Un capítulo contado al nivel del estudiante, con su español y, si hay, video de ambiente. */
  async capitulo(req, res) {
    try {
      const datos = await resolverLibro(req.params.libro);
      const numero = datos && numeroDeCapitulo(datos.libro.total, req.params.numero);
      if (!datos || !numero) {
        return res.status(404).json({ error: "That chapter doesn't exist" });
      }

      const { nivel } = await obtenerPerfil(req.usuario.id);
      const contenido = await capituloDelNivel(datos, numero, nivel, req.usuario.id);

      const { rows: leido } = await pool.query(
        "SELECT 1 FROM libros_leidos WHERE usuario_id = $1 AND libro = $2 AND capitulo = $3",
        [req.usuario.id, datos.libro.id, numero],
      );

      // El video es solo ambiente: si falla o no hay clave de Pexels, el capítulo se lee igual
      let video = null;
      try {
        const ambiente = datos.clasico ? datos.clasico.ambiente : contenido.ambiente || "old library books";
        const medio = await obtenerMedio("video", ambiente);
        if (medio) video = { url: medio.url, poster: medio.miniatura, autor: medio.autor, autorUrl: medio.autorUrl };
      } catch (error) {
        reportarError("No se pudo traer el video del libro", error);
      }

      const { libro } = datos;
      const capitulo = datos.clasico ? datos.clasico.capitulos[numero - 1] : null;
      const parte = datos.partes ? datos.partes[numero - 1] : null;
      res.json({
        libro: {
          id: libro.id,
          tipo: libro.tipo,
          titulo: libro.titulo,
          autor: libro.autor,
          portada: libro.portada,
          total: libro.total,
          fuente: libro.tipo === "externo" ? { nombre: "Project Gutenberg", url: `${URL_GUTENBERG}/ebooks/${libro.gutenbergId}` } : null,
        },
        nivel,
        numero,
        titulo: capitulo ? capitulo.titulo : contenido.titulo || (parte && parte.t) || `Part ${numero}`,
        tituloEs: capitulo ? capitulo.tituloEs : contenido.titulo_es || "",
        lineas: contenido.lineas,
        traducciones: contenido.traducciones,
        leido: leido.length > 0,
        video,
      });
    } catch (error) {
      if (error.status === 429) {
        return res.status(429).json({ error: "You opened many new chapters today. Read one you already started, or come back tomorrow." });
      }
      if (error.status === 404 || error.status === 422) {
        return res.status(404).json({ error: "This book can't be read here. Try another one." });
      }
      reportarError("Error en /biblioteca/libros/capitulo", error);
      res.status(error.status === 502 ? 502 : 500).json({ error: "Could not open the chapter" });
    }
  },

  /** Marca el capítulo como terminado; el XP llega solo la primera vez. */
  async terminarCapitulo(req, res) {
    try {
      const total = await totalDeLibro(req.params.libro);
      const numero = total && numeroDeCapitulo(total, req.params.numero);
      if (!total || !numero) {
        return res.status(404).json({ error: "That chapter doesn't exist" });
      }

      const { rows } = await pool.query(
        `INSERT INTO libros_leidos (usuario_id, libro, capitulo) VALUES ($1, $2, $3)
         ON CONFLICT (usuario_id, libro, capitulo) DO NOTHING
         RETURNING capitulo`,
        [req.usuario.id, req.params.libro, numero],
      );
      const primeraVez = rows.length > 0;
      const gamificacion = primeraVez
        ? await registrarActividad(req.usuario.id, XP_POR_CAPITULO, { modulo: "libros" })
        : { xpGanado: 0, monedasGanadas: 0, metaCompletada: false };

      res.json({
        repetida: !primeraVez,
        terminado: numero === total,
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
