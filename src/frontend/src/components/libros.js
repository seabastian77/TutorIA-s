// Clásicos en Library: el estante con portadas y el lector por capítulos, bilingüe y con la voz marcando cada palabra

const LIBRO_TRADUCCION = "tutorias_libro_traduccion";

let estanteLibros = [];
let capituloActual = null;
let lineaLibro = 0;
let pedidoLibro = 0;
let narrandoLibro = false;
let turnoLibro = 0;

const $libro = (id) => document.getElementById(id);

function ponerEstadoLibro(texto) {
  $libro("libro-estado").textContent = texto;
}

function traduccionPrendidaLibro() {
  try {
    return localStorage.getItem(LIBRO_TRADUCCION) !== "0";
  } catch (e) {
    return true;
  }
}

/** Cuántos capítulos leyó el estudiante y cuál le toca seguir. */
function avanceDe(libro) {
  const leidos = libro.capitulos.filter((c) => c.leido).length;
  const siguiente = libro.capitulos.find((c) => !c.leido);
  return { leidos, total: libro.capitulos.length, siguiente: siguiente ? siguiente.numero : 1 };
}

/** Pinta el estante con la portada, el autor y el avance de cada libro. */
async function pintarEstanteLibros() {
  const lista = $libro("libros-lista");
  if (!lista) return;
  lista.setAttribute("aria-busy", "true");
  try {
    const datos = await BibliotecaAPI.libros();
    estanteLibros = datos.libros;
    lista.innerHTML = "";
    estanteLibros.forEach((libro) => {
      const { leidos, total, siguiente } = avanceDe(libro);
      const tarjeta = document.createElement("button");
      tarjeta.type = "button";
      tarjeta.className = "libro-tarjeta";
      tarjeta.innerHTML = `
        <span class="libro-tapa"><img src="${libro.portada}" alt="" width="120" height="180" loading="lazy" decoding="async"></span>
        <span class="libro-tarjeta-texto">
          <span class="libro-genero"></span>
          <strong class="libro-nombre"></strong>
          <span class="libro-autor"></span>
          <span class="libro-avance"><span class="libro-barra"><span style="width:${Math.round((leidos / total) * 100)}%"></span></span><span class="libro-avance-texto"></span></span>
        </span>`;
      tarjeta.querySelector(".libro-genero").textContent = libro.genero;
      tarjeta.querySelector(".libro-nombre").textContent = libro.titulo;
      tarjeta.querySelector(".libro-autor").textContent = libro.autor;
      tarjeta.querySelector(".libro-avance-texto").textContent =
        leidos === total ? "Finished" : leidos ? `${leidos} of ${total} chapters` : `${total} chapters`;
      if (leidos === total) tarjeta.classList.add("libro-terminado");
      tarjeta.setAttribute("aria-label", `${libro.titulo}, by ${libro.autor}. ${tarjeta.querySelector(".libro-avance-texto").textContent}`);
      tarjeta.addEventListener("click", () => abrirCapituloLibro(libro.id, leidos === total ? 1 : siguiente));
      lista.appendChild(tarjeta);
    });
  } catch (err) {
    lista.innerHTML = "";
    const aviso = document.createElement("p");
    aviso.className = "estante-aviso";
    aviso.textContent = "Could not load the books. Try again in a moment.";
    lista.appendChild(aviso);
  } finally {
    lista.setAttribute("aria-busy", "false");
  }
}

/** Abre un capítulo: la primera vez en un nivel la IA lo cuenta y queda guardado para los demás. */
async function abrirCapituloLibro(id, numero) {
  const pedido = ++pedidoLibro;
  pararNarracionLibro();
  if (typeof Traductor !== "undefined") Traductor.cerrar();
  const libro = estanteLibros.find((l) => l.id === id);
  $libro("biblioteca-catalogo").classList.add("oculto");
  $libro("biblioteca-lectura").classList.add("oculto");
  $libro("biblioteca-libro").classList.remove("oculto");
  $libro("biblioteca-estado").textContent = "";
  pintarCargandoLibro(libro, numero);
  window.scrollTo({ top: 0 });

  try {
    const datos = await BibliotecaAPI.capitulo(id, numero);
    if (pedido !== pedidoLibro) return;
    capituloActual = datos;
    lineaLibro = 0;
    pintarCapituloLibro();
  } catch (err) {
    if (pedido !== pedidoLibro) return;
    $libro("libro-lector").setAttribute("aria-busy", "false");
    $libro("libro-capitulo-titulo").textContent = "The chapter didn't open";
    $libro("libro-lineas").innerHTML = "";
    ponerEstadoLibro("Check your connection and try again.");
    const terminar = $libro("btn-capitulo-terminar");
    terminar.disabled = false;
    terminar.textContent = "Try again";
    terminar.onclick = () => abrirCapituloLibro(id, numero);
  }
}

/** Mientras llega el capítulo, la portada ya se ve y la página muestra renglones en espera. */
function pintarCargandoLibro(libro, numero) {
  $libro("libro-lector").setAttribute("aria-busy", "true");
  if (libro) {
    $libro("libro-portada").src = libro.portada;
    $libro("libro-fondo-img").src = libro.portada;
    $libro("libro-obra").textContent = `${libro.titulo} · ${libro.autor}`;
    const capitulo = libro.capitulos[numero - 1];
    $libro("libro-sello").textContent = `Chapter ${numero} of ${libro.capitulos.length}`;
    $libro("libro-capitulo-titulo").textContent = capitulo ? capitulo.titulo : "";
    $libro("libro-capitulo-es").textContent = capitulo ? capitulo.tituloEs : "";
  }
  pintarVideoLibro(null);
  const lista = $libro("libro-lineas");
  lista.innerHTML = "";
  for (let i = 0; i < 5; i += 1) {
    const renglon = document.createElement("li");
    renglon.className = "escena-renglon escena-renglon-cargando";
    renglon.setAttribute("aria-hidden", "true");
    renglon.innerHTML =
      '<span class="escena-numero"></span>' +
      '<span class="escena-textos"><span class="escena-barra escena-barra-corta"></span><span class="escena-barra"></span></span>';
    lista.appendChild(renglon);
  }
  $libro("btn-libro-escuchar").disabled = true;
  $libro("btn-libro-traducir").disabled = true;
  $libro("libro-final").classList.add("oculto");
  $libro("libro-reporte").innerHTML = "";
  const terminar = $libro("btn-capitulo-terminar");
  terminar.disabled = true;
  terminar.textContent = "Finish chapter";
  terminar.onclick = terminarCapituloLibro;
  $libro("btn-capitulo-anterior").disabled = numero <= 1;
  ponerEstadoLibro("Opening the chapter at your level... the first time takes a moment.");
}

/** Pinta el capítulo listo: títulos, líneas, video si hay y el botón para terminarlo. */
function pintarCapituloLibro() {
  const c = capituloActual;
  $libro("libro-lector").setAttribute("aria-busy", "false");
  $libro("libro-portada").src = c.libro.portada;
  $libro("libro-fondo-img").src = c.libro.portada;
  $libro("libro-sello").textContent = `Chapter ${c.numero} of ${c.libro.total}`;
  $libro("libro-capitulo-titulo").textContent = c.titulo;
  $libro("libro-capitulo-es").textContent = c.tituloEs;
  $libro("libro-obra").textContent = `${c.libro.titulo} · ${c.libro.autor}`;
  pintarVideoLibro(c.video);
  LectorBilingue.pintarRenglones($libro("libro-lineas"), {
    lineas: c.lineas,
    traducciones: c.traducciones,
    alEscuchar: escucharLineaLibro,
  });
  pintarTraduccionLibro(traduccionPrendidaLibro());
  $libro("btn-libro-escuchar").disabled = false;
  const traducir = $libro("btn-libro-traducir");
  traducir.disabled = !c.traducciones;
  traducir.classList.toggle("oculto", !c.traducciones);
  $libro("btn-capitulo-anterior").disabled = c.numero <= 1;
  const terminar = $libro("btn-capitulo-terminar");
  terminar.disabled = false;
  terminar.textContent = "Finish chapter";
  terminar.onclick = terminarCapituloLibro;
  marcarLineaLibro();
  agregarReporteLibro();
  ponerEstadoLibro(
    c.leido
      ? "You already read this chapter. Read it again or go on to the next one."
      : "Tap Listen to hear the chapter while you read. Tap any word to translate it.",
  );
}

/** Si hay video de Pexels, corre detrás de la portada; si no, queda la portada desenfocada. */
function pintarVideoLibro(video) {
  const fuente = $libro("libro-video");
  const credito = $libro("libro-video-credito");
  credito.textContent = "";
  const hayVideo = !!(video && video.url);
  $libro("libro-escenario").classList.toggle("con-video", hayVideo);
  fuente.classList.toggle("oculto", !hayVideo);
  if (!hayVideo) {
    fuente.pause();
    if (fuente.getAttribute("src")) {
      fuente.removeAttribute("src");
      fuente.load();
    }
    return;
  }
  if (video.poster) fuente.poster = video.poster;
  fuente.src = video.url;
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) fuente.play().catch(() => {});
  if (video.autor) {
    const autor = document.createElement("a");
    autor.href = video.autorUrl || "https://www.pexels.com";
    autor.target = "_blank";
    autor.rel = "noopener";
    autor.textContent = video.autor;
    const sitio = document.createElement("a");
    sitio.href = "https://www.pexels.com";
    sitio.target = "_blank";
    sitio.rel = "noopener";
    sitio.textContent = "Pexels";
    credito.append("Video by ", autor, " on ", sitio);
  }
}

function renglonLibro(i) {
  return document.querySelector(`#libro-lineas .escena-renglon[data-linea="${i}"]`);
}

/** Resalta la línea donde va la lectura. */
function marcarLineaLibro() {
  document.querySelectorAll("#libro-lineas .escena-renglon").forEach((renglon, i) => {
    renglon.classList.toggle("actual", i === lineaLibro);
  });
}

function pintarTraduccionLibro(prendida) {
  $libro("libro-lector").classList.toggle("sin-traduccion", !prendida);
  $libro("btn-libro-traducir").setAttribute("aria-pressed", String(prendida));
}

function alternarTraduccionLibro() {
  const prendida = $libro("libro-lector").classList.contains("sin-traduccion");
  pintarTraduccionLibro(prendida);
  try {
    localStorage.setItem(LIBRO_TRADUCCION, prendida ? "1" : "0");
  } catch (e) {
    // Sin almacenamiento la preferencia dura solo esta visita
  }
}

/** Los subtítulos de la portada solo se usan en pantallas anchas, donde caben debajo del libro. */
function subtituloLibro(i) {
  const zona = $libro("libro-subtitulo");
  if (!window.matchMedia("(min-width: 621px)").matches) {
    zona.classList.add("oculto");
    return null;
  }
  const traduccion = capituloActual.traducciones ? capituloActual.traducciones[i] : null;
  LectorBilingue.pintarSubtitulo(zona, capituloActual.lineas[i], traduccion);
  zona.classList.remove("oculto");
  return zona;
}

function pintarBotonLibro(activo) {
  const boton = $libro("btn-libro-escuchar");
  boton.classList.toggle("activo", activo);
  boton.querySelector(".escena-chip-texto").textContent = activo ? "Stop" : "Listen";
}

function pararNarracionLibro() {
  turnoLibro += 1;
  if (narrandoLibro) {
    narrandoLibro = false;
    pintarBotonLibro(false);
  }
  $libro("libro-subtitulo").classList.add("oculto");
  if (typeof VozIngles !== "undefined") VozIngles.callar();
}

/** Listen lee el capítulo desde la línea marcada hasta el final, siguiendo el texto con la vista. */
async function alternarNarracionLibro() {
  if (!capituloActual) return;
  if (narrandoLibro) {
    pararNarracionLibro();
    ponerEstadoLibro("Paused. Tap Listen to go on from this line.");
    return;
  }
  pararNarracionLibro();
  const turno = turnoLibro;
  narrandoLibro = true;
  pintarBotonLibro(true);
  ponerEstadoLibro("Reading the chapter aloud...");
  const total = capituloActual.lineas.length;
  if (lineaLibro >= total - 1 && renglonLibro(lineaLibro).classList.contains("escena-leida")) lineaLibro = 0;

  for (let i = lineaLibro; i < total && turno === turnoLibro; i += 1) {
    lineaLibro = i;
    marcarLineaLibro();
    LectorBilingue.mostrar(renglonLibro(i));
    await LectorBilingue.narrar(renglonLibro(i), capituloActual.lineas[i], {
      vigente: () => turno === turnoLibro,
      subtitulo: subtituloLibro(i),
    });
    if (turno !== turnoLibro) return;
    renglonLibro(i).classList.add("escena-leida");
    if (i < total - 1) await new Promise((listo) => setTimeout(listo, 350));
  }
  if (turno !== turnoLibro) return;
  narrandoLibro = false;
  pintarBotonLibro(false);
  $libro("libro-subtitulo").classList.add("oculto");
  ponerEstadoLibro("End of the chapter. Tap Finish chapter to save your progress.");
  $libro("btn-capitulo-terminar").scrollIntoView({ block: "center", behavior: "smooth" });
}

/** El número de cada línea la lee sola y deja la lectura en ese punto. */
async function escucharLineaLibro(i) {
  if (!capituloActual) return;
  pararNarracionLibro();
  const turno = turnoLibro;
  lineaLibro = i;
  marcarLineaLibro();
  await LectorBilingue.narrar(renglonLibro(i), capituloActual.lineas[i], {
    vigente: () => turno === turnoLibro,
    subtitulo: subtituloLibro(i),
  });
  if (turno === turnoLibro) $libro("libro-subtitulo").classList.add("oculto");
}

/** Guarda el capítulo como leído; el XP llega la primera vez y el botón pasa al siguiente. */
async function terminarCapituloLibro() {
  if (!capituloActual) return;
  pararNarracionLibro();
  const boton = $libro("btn-capitulo-terminar");
  boton.disabled = true;
  const c = capituloActual;
  try {
    const datos = await BibliotecaAPI.terminarCapitulo(c.libro.id, c.numero);
    const libro = estanteLibros.find((l) => l.id === c.libro.id);
    if (libro) libro.capitulos[c.numero - 1].leido = true;
    const chip = document.getElementById("progreso-monedas");
    if (chip && typeof datos.monedas === "number") chip.textContent = datos.monedas;

    const fin = c.numero >= c.libro.total;
    $libro("libro-final-titulo").textContent = fin ? "You finished the book!" : "Chapter complete!";
    $libro("libro-final-texto").textContent = datos.repetida
      ? "You had already read this chapter, so it gives no XP this time."
      : `+${datos.xpGanado} XP for reading in English.`;
    $libro("libro-final").classList.remove("oculto");
    ponerEstadoLibro("");
    if (fin && !datos.repetida && typeof celebrarConTuti === "function") {
      celebrarConTuti("Book finished!", `${c.libro.titulo}. Great reading!`);
    }

    boton.disabled = false;
    if (fin) {
      boton.textContent = "Back to the books";
      boton.onclick = volverAlEstante;
    } else {
      boton.textContent = "Next chapter";
      boton.onclick = () => abrirCapituloLibro(c.libro.id, c.numero + 1);
    }
    boton.focus();
  } catch (err) {
    boton.disabled = false;
    ponerEstadoLibro("Could not save your progress. Try again.");
  }
}

/** El capítulo lo escribió la IA: si una línea o una traducción está mal, el estudiante lo reporta. */
function agregarReporteLibro() {
  const zona = $libro("libro-reporte");
  zona.innerHTML = "";
  if (typeof ReporteEjercicio === "undefined") return;
  const c = capituloActual;
  ReporteEjercicio.agregarBoton(zona, {
    modulo: "lectura",
    contenido: () => ({ libro: c.libro.id, capitulo: c.numero, nivel: c.nivel, lineas: c.lineas, traducciones: c.traducciones }),
  });
}

/** Vuelve al estante con el avance al día. */
function volverAlEstante() {
  pedidoLibro += 1;
  pararNarracionLibro();
  pintarVideoLibro(null);
  capituloActual = null;
  $libro("biblioteca-libro").classList.add("oculto");
  $libro("biblioteca-catalogo").classList.remove("oculto");
  pintarEstanteLibros();
}

/** Al salir de Library, por el botón o por el menú, se callan la voz y el video. */
function vigilarSalidaLibros() {
  const vista = document.getElementById("vista-biblioteca");
  if (!vista) return;
  new MutationObserver(() => {
    if (!vista.classList.contains("oculto")) return;
    pedidoLibro += 1;
    pararNarracionLibro();
    pintarVideoLibro(null);
  }).observe(vista, { attributes: true, attributeFilter: ["class"] });
}

document.addEventListener("DOMContentLoaded", () => {
  if (!$libro("libros-lista")) return;
  const abrirBiblioteca = document.getElementById("btn-biblioteca");
  if (abrirBiblioteca) abrirBiblioteca.addEventListener("click", pintarEstanteLibros);
  $libro("btn-libro-escuchar").addEventListener("click", alternarNarracionLibro);
  $libro("btn-libro-traducir").addEventListener("click", alternarTraduccionLibro);
  $libro("btn-capitulo-anterior").addEventListener("click", () => {
    if (capituloActual && capituloActual.numero > 1) abrirCapituloLibro(capituloActual.libro.id, capituloActual.numero - 1);
  });
  $libro("btn-volver-estante").addEventListener("click", volverAlEstante);
  vigilarSalidaLibros();
});
