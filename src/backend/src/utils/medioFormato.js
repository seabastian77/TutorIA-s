/** Deja una foto de Pexels con la misma forma que guarda la tabla medios. */
function normalizarFoto(foto) {
  if (!foto) return null;

  const url = foto.src?.large || foto.src?.original;
  if (!url) return null;

  return {
    proveedorId: String(foto.id),
    url,
    urlMiniatura: foto.src?.medium || null,
    autor: foto.photographer || null,
    autorUrl: foto.photographer_url || null,
  };
}

/** Elige el mp4 más liviano que se vea nítido en la pantalla de la escena, o el más grande que haya. */
function normalizarVideo(video) {
  if (!video) return null;

  const mp4 = (video.video_files || []).filter((a) => a.file_type === "video/mp4" && a.link);
  const nitidos = mp4.filter((a) => a.width >= 960).sort((a, b) => a.width - b.width);
  const elegido = nitidos[0] || mp4.sort((a, b) => b.width - a.width)[0] || (video.video_files || [])[0];
  if (!elegido || !elegido.link) return null;

  return {
    proveedorId: String(video.id),
    url: elegido.link,
    urlMiniatura: video.image || null,
    autor: video.user?.name || null,
    autorUrl: video.user?.url || null,
  };
}

/**
 * Saca el primer objeto JSON completo de la respuesta. Cuenta las llaves en vez
 * de cortar en la última, porque el modelo a veces manda dos objetos seguidos o
 * deja texto suelto detrás.
 */
function extraerJSON(texto) {
  const limpio = (texto || "").replace(/```json/gi, "").replace(/```/g, "").trim();
  const inicio = limpio.indexOf("{");

  if (inicio === -1) {
    throw new Error("The vision model did not return JSON");
  }

  let profundidad = 0;
  let dentroDeTexto = false;
  let escapado = false;

  for (let i = inicio; i < limpio.length; i++) {
    const caracter = limpio[i];

    // Las llaves que van dentro de una cadena no cuentan
    if (escapado) {
      escapado = false;
    } else if (caracter === "\\") {
      escapado = true;
    } else if (caracter === '"') {
      dentroDeTexto = !dentroDeTexto;
    } else if (!dentroDeTexto) {
      if (caracter === "{") profundidad += 1;
      else if (caracter === "}") {
        profundidad -= 1;
        if (profundidad === 0) return JSON.parse(limpio.slice(inicio, i + 1));
      }
    }
  }

  throw new Error("The vision model returned incomplete JSON");
}

module.exports = { normalizarFoto, normalizarVideo, extraerJSON };
