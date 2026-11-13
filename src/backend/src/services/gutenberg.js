// Catálogo libre de Project Gutenberg vía Gutendex: busca libros por título, autor o género y baja su texto una sola vez

const { normalizarResultado, limpiarTextoGutenberg } = require("../utils/textoGutenberg");

const URL_GUTENDEX = (process.env.GUTENDEX_URL || "https://gutendex.com").replace(/\/+$/, "");
const URL_GUTENBERG = "https://www.gutenberg.org";
const AGENTE = "TutorIAs/1.0 (English learning app; graded readers of public-domain books)";
const HORAS_CACHE = 6;
const MAX_CACHE = 300;
const MAX_BYTES_TEXTO = 8 * 1024 * 1024;

// Géneros de los botones del estante y el tema con que Gutendex los busca
const GENEROS = {
  adventure: "adventure",
  mystery: "detective",
  horror: "horror",
  fantasy: "fantasy",
  scifi: "science fiction",
  romance: "love stories",
  children: "children",
  humor: "humor",
  stories: "short stories",
  fairy: "fairy tales",
};

const cache = new Map();

function errorConEstado(estado, mensaje) {
  const error = new Error(mensaje);
  error.status = estado;
  return error;
}

/** Guarda una respuesta unas horas para no repetir la misma búsqueda; borra la más vieja al llenarse. */
function guardar(clave, valor) {
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
  cache.set(clave, { valor, vence: Date.now() + HORAS_CACHE * 3600 * 1000 });
}

function leer(clave) {
  const fila = cache.get(clave);
  if (!fila) return null;
  if (fila.vence < Date.now()) {
    cache.delete(clave);
    return null;
  }
  return fila.valor;
}

async function pedirJSON(url) {
  let respuesta;
  try {
    respuesta = await fetch(url, { headers: { "User-Agent": AGENTE, Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
  } catch (error) {
    throw errorConEstado(502, `Gutendex no respondió: ${error.message}`);
  }
  if (respuesta.status === 404) throw errorConEstado(404, "That book doesn't exist");
  if (!respuesta.ok) throw errorConEstado(502, `Gutendex respondió ${respuesta.status}`);
  return respuesta.json();
}

/** Una página de libros en inglés que se pueden leer en Colombia; guarda la ficha de cada uno para abrirlo sin volver a Gutendex. */
async function buscarLibros({ busqueda = "", genero = "", pagina = 1 } = {}) {
  const params = new URLSearchParams({ languages: "en", mime_type: "text/plain" });
  if (busqueda) params.set("search", busqueda);
  if (genero && GENEROS[genero]) params.set("topic", GENEROS[genero]);
  if (pagina > 1) params.set("page", String(pagina));
  const url = `${URL_GUTENDEX}/books/?${params}`;
  const guardado = leer(url);
  if (guardado) return guardado;

  const datos = await pedirJSON(url);
  const vistos = new Set();
  const fichas = (Array.isArray(datos.results) ? datos.results : []).map((libro) => normalizarResultado(libro)).filter(Boolean);
  fichas.forEach((ficha) => guardar(`${URL_GUTENDEX}/books/${ficha.gutenbergId}`, ficha));
  const libros = fichas
    .filter((libro) => !vistos.has(libro.titulo.toLowerCase()) && vistos.add(libro.titulo.toLowerCase()))
    .map(({ textoUrl, ...libro }) => libro);
  const resultado = { libros, hayMas: Boolean(datos.next), total: Number(datos.count) || 0 };
  guardar(url, resultado);
  return resultado;
}

/** La ficha de un libro por su número de Gutenberg, solo si se puede leer en Colombia. */
async function obtenerFicha(gutenbergId) {
  const url = `${URL_GUTENDEX}/books/${gutenbergId}`;
  const guardada = leer(url);
  if (guardada) return guardada;
  const ficha = normalizarResultado(await pedirJSON(url));
  if (!ficha) throw errorConEstado(404, "That book isn't available");
  guardar(url, ficha);
  return ficha;
}

/** Baja el texto del libro desde Gutenberg: primero el archivo directo, luego la dirección de la ficha y, si el servidor no contesta, no insiste. */
async function descargarTexto(ficha) {
  const candidatas = [`${URL_GUTENBERG}/cache/epub/${ficha.gutenbergId}/pg${ficha.gutenbergId}.txt`, ficha.textoUrl];
  let ultimoError = null;
  for (const url of [...new Set(candidatas)]) {
    if (!/^https:\/\/(www\.)?gutenberg\.org\//.test(url)) continue;
    let respuesta;
    try {
      respuesta = await fetch(url, { headers: { "User-Agent": AGENTE }, signal: AbortSignal.timeout(20000) });
    } catch (error) {
      ultimoError = error;
      break;
    }
    try {
      if (!respuesta.ok) throw new Error(`Gutenberg respondió ${respuesta.status}`);
      const texto = (await respuesta.text()).slice(0, MAX_BYTES_TEXTO);
      if (texto.length < 500) throw new Error("El texto llegó vacío");
      return limpiarTextoGutenberg(texto);
    } catch (error) {
      ultimoError = error;
    }
  }
  throw errorConEstado(502, ultimoError ? ultimoError.message : "No se pudo bajar el libro");
}

/** Deja lista la primera página del catálogo al arrancar y la renueva cuando vence, para que el estante abra sin esperar. */
function mantenerCatalogoListo() {
  const calentar = () => buscarLibros().catch(() => {});
  setTimeout(calentar, 5000).unref();
  setInterval(calentar, HORAS_CACHE * 3600 * 1000 + 60000).unref();
}

module.exports = { buscarLibros, obtenerFicha, descargarTexto, mantenerCatalogoListo, GENEROS, URL_GUTENBERG };
