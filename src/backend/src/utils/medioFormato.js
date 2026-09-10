// Da forma a lo que devuelven Pexels y el modelo de visión, sin tocar la base ni la red

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

/** Elige el archivo de video más liviano que siga siendo decente para el fondo. */
function normalizarVideo(video) {
  if (!video) return null;

  const archivos = (video.video_files || [])
    .filter((a) => a.file_type === "video/mp4" && a.width >= 640)
    .sort((a, b) => a.width - b.width);

  const elegido = archivos[0] || (video.video_files || [])[0];
  if (!elegido || !elegido.link) return null;

  return {
    proveedorId: String(video.id),
    url: elegido.link,
    urlMiniatura: video.image || null,
    autor: video.user?.name || null,
    autorUrl: video.user?.url || null,
  };
}

/** Saca el JSON de la respuesta aunque el modelo lo envuelva en texto o en vallas. */
function extraerJSON(texto) {
  const limpio = (texto || "").replace(/```json/gi, "").replace(/```/g, "").trim();
  const inicio = limpio.indexOf("{");
  const fin = limpio.lastIndexOf("}");

  if (inicio === -1 || fin === -1) {
    throw new Error("El modelo de visión no devolvió JSON");
  }

  return JSON.parse(limpio.slice(inicio, fin + 1));
}

module.exports = { normalizarFoto, normalizarVideo, extraerJSON };
