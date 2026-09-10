// Fotos y videos de Pexels, cacheados en la base para no gastar el límite por hora

const pool = require("../config/db");
const { reportarError } = require("../utils/errores");
const { normalizarFoto, normalizarVideo } = require("../utils/medioFormato");

const URL_PEXELS = "https://api.pexels.com";
const POR_PAGINA = 15;
const MINIMO_EN_CACHE = 8;

/** Dice si hay clave de Pexels; sin ella los ejercicios visuales se apagan solos. */
function hayMedios() {
  return Boolean(process.env.PEXELS_API_KEY);
}

async function pedirAPexels(ruta) {
  const resp = await fetch(`${URL_PEXELS}${ruta}`, {
    headers: { Authorization: process.env.PEXELS_API_KEY },
  });

  if (!resp.ok) {
    throw new Error(`Pexels respondió ${resp.status}`);
  }

  return resp.json();
}

/** Pide resultados nuevos a Pexels y los guarda, ignorando los que ya estaban. */
async function rellenarCache(tipo, consulta) {
  const ruta =
    tipo === "video"
      ? `/videos/search?query=${encodeURIComponent(consulta)}&per_page=${POR_PAGINA}&orientation=landscape`
      : `/v1/search?query=${encodeURIComponent(consulta)}&per_page=${POR_PAGINA}&orientation=landscape`;

  const datos = await pedirAPexels(ruta);
  const crudos = tipo === "video" ? datos.videos || [] : datos.photos || [];
  const limpios = crudos
    .map((m) => (tipo === "video" ? normalizarVideo(m) : normalizarFoto(m)))
    .filter((m) => m && m.url);

  for (const medio of limpios) {
    await pool.query(
      `INSERT INTO medios (tipo, consulta, proveedor_id, url, url_miniatura, autor, autor_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tipo, consulta, proveedor_id) DO NOTHING`,
      [
        tipo,
        consulta,
        medio.proveedorId,
        medio.url,
        medio.urlMiniatura,
        medio.autor,
        medio.autorUrl,
      ],
    );
  }

  return limpios.length;
}

/**
 * Devuelve un medio al azar de esa consulta. Solo llama a Pexels cuando la caché
 * se queda corta, así una misma consulta gasta una petición y sirve para siempre.
 */
async function obtenerMedio(tipo, consulta) {
  if (!hayMedios()) return null;

  try {
    const { rows: cuenta } = await pool.query(
      "SELECT COUNT(*)::int AS total FROM medios WHERE tipo = $1 AND consulta = $2",
      [tipo, consulta],
    );

    if (cuenta[0].total < MINIMO_EN_CACHE) {
      await rellenarCache(tipo, consulta);
    }
  } catch (error) {
    reportarError(`No se pudo rellenar la caché de medios (${consulta})`, error);
  }

  const { rows } = await pool.query(
    `SELECT id, url, url_miniatura, autor, autor_url
       FROM medios
      WHERE tipo = $1 AND consulta = $2
      ORDER BY RANDOM()
      LIMIT 1`,
    [tipo, consulta],
  );

  if (rows.length === 0) return null;

  return {
    id: rows[0].id,
    url: rows[0].url,
    miniatura: rows[0].url_miniatura,
    autor: rows[0].autor,
    autorUrl: rows[0].autor_url,
  };
}

/** Lee un medio ya guardado por su id, para evaluar contra la imagen real. */
async function obtenerMedioPorId(id) {
  const { rows } = await pool.query(
    "SELECT id, tipo, url, autor, autor_url FROM medios WHERE id = $1",
    [id],
  );
  return rows[0] || null;
}

module.exports = {
  MINIMO_EN_CACHE,
  hayMedios,
  normalizarFoto,
  normalizarVideo,
  rellenarCache,
  obtenerMedio,
  obtenerMedioPorId,
};
