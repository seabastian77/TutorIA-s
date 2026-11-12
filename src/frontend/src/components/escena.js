// Scene Mode: una escena original que se lee como libro bilingüe, se escucha palabra por palabra y se dice en voz alta

const ESCENA_TRADUCCION = "tutorias_escena_traduccion";

let escenaActual = null;
let indiceLinea = 0;
let resultadosEscena = [];
let xpEscena = 0;
let pedidoEscena = 0;
let reconocimientoEscena = null;
let escuchandoEscena = false;
let narrandoEscena = false;
let turnoNarracion = 0;
let videoPausadoEscena = false;

const $escena = (id) => document.getElementById(id);

function soporteVozDisponibleEscena() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function movimientoReducidoEscena() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function ponerEstadoEscena(texto) {
  $escena("escena-estado").textContent = texto;
}

/** La pista de qué hacer con la línea actual, según el navegador pueda oír al estudiante o no. */
function ayudaDeLineaEscena() {
  if (!soporteVozDisponibleEscena()) {
    return "Reading aloud works in Chrome or Edge. Here you can still listen and translate.";
  }
  return `Line ${indiceLinea + 1} of ${escenaActual.lineas.length}: tap its speaker to hear it, then Read aloud.`;
}

/** La traducción se ve al empezar, como en un libro bilingüe; luego se respeta lo que elija el estudiante. */
function traduccionPrendidaEscena() {
  try {
    return localStorage.getItem(ESCENA_TRADUCCION) !== "0";
  } catch (e) {
    return true;
  }
}

async function iniciarEscena() {
  document.getElementById("vista-principal").classList.add("oculto");
  $escena("vista-escena").classList.remove("oculto");
  if (!reconocimientoEscena) configurarReconocimientoEscena();
  await cargarEscena();
}

/** Pide una escena nueva; si mientras llega se pide otra o el estudiante sale, esta se descarta. */
async function cargarEscena() {
  const pedido = ++pedidoEscena;
  pararTodoEscena();
  escenaActual = null;
  indiceLinea = 0;
  resultadosEscena = [];
  xpEscena = 0;
  pintarCargandoEscena();

  try {
    const escena = await EscenaAPI.obtenerEscena();
    if (pedido !== pedidoEscena) return;
    escenaActual = escena;
    resultadosEscena = escena.lineas.map(() => null);
    $escena("escena-titulo").textContent = escena.titulo;
    $escena("escena-situacion").textContent = escena.situacion || "";
    pintarVideoEscena(escena.video);
    pintarLineasEscena();
    pintarSubtituloEscena(0);
    pintarTraduccionEscena(traduccionPrendidaEscena());
    habilitarHerramientasEscena(true);
    marcarLineaActual();
    agregarReporteEscena();
    $escena("escena-libro").setAttribute("aria-busy", "false");
    ponerEstadoEscena(
      soporteVozDisponibleEscena()
        ? "Tap Listen to hear the whole scene, then read line 1 aloud."
        : ayudaDeLineaEscena(),
    );
  } catch (err) {
    if (pedido !== pedidoEscena) return;
    pintarErrorEscena();
  }
}

/** Mientras la IA escribe la escena, la página muestra renglones en espera. */
function pintarCargandoEscena() {
  $escena("escena-libro").setAttribute("aria-busy", "true");
  $escena("escena-titulo").textContent = "Loading your scene...";
  $escena("escena-situacion").textContent = "";
  pintarVideoEscena(null);
  const lista = $escena("escena-lineas");
  lista.innerHTML = "";
  for (let i = 0; i < 4; i += 1) {
    const renglon = document.createElement("li");
    renglon.className = "escena-renglon escena-renglon-cargando";
    renglon.setAttribute("aria-hidden", "true");
    renglon.innerHTML =
      '<span class="escena-numero"></span>' +
      '<span class="escena-textos"><span class="escena-barra escena-barra-corta"></span><span class="escena-barra"></span></span>';
    lista.appendChild(renglon);
  }
  habilitarHerramientasEscena(false);
  $escena("escena-resultado").classList.add("oculto");
  $escena("escena-final").classList.add("oculto");
  $escena("escena-reporte").innerHTML = "";
  ponerEstadoEscena("Writing an original scene for your level...");
}

function pintarErrorEscena() {
  $escena("escena-libro").setAttribute("aria-busy", "false");
  $escena("escena-titulo").textContent = "The scene didn't load";
  $escena("escena-situacion").textContent = "";
  $escena("escena-lineas").innerHTML = "";
  ponerEstadoEscena("");
  $escena("escena-final-titulo").textContent = "Could not load the scene";
  $escena("escena-final-texto").textContent = "Check your connection and try again.";
  $escena("btn-otra-escena").textContent = "Try again";
  $escena("escena-final").classList.remove("oculto");
}

/** Con video la portada se vuelve pantalla de cine con subtítulos; sin video queda la portada de película. */
function pintarVideoEscena(video) {
  const portada = $escena("escena-portada");
  const capa = $escena("escena-video");
  const fuente = $escena("escena-video-fuente");
  const credito = $escena("escena-video-credito");
  if (!capa || !fuente) return;
  credito.textContent = "";
  const hayVideo = !!(video && video.url);
  portada.classList.toggle("con-video", hayVideo);
  capa.classList.toggle("oculto", !hayVideo);
  $escena("btn-escena-video").classList.toggle("oculto", !hayVideo);
  $escena("escena-subtitulo").classList.toggle("oculto", !hayVideo);

  if (!hayVideo) {
    fuente.pause();
    if (fuente.getAttribute("src")) {
      fuente.removeAttribute("src");
      fuente.removeAttribute("poster");
      fuente.load();
    }
    return;
  }

  if (video.poster) fuente.poster = video.poster;
  else fuente.removeAttribute("poster");
  fuente.src = video.url;
  videoPausadoEscena = movimientoReducidoEscena();
  pintarBotonVideoEscena();
  if (!videoPausadoEscena) fuente.play().catch(() => {});

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

/** Pinta la página con el lector bilingüe: el número de cada línea la lee en voz alta. */
function pintarLineasEscena() {
  const { lineas, traducciones } = escenaActual;
  LectorBilingue.pintarRenglones($escena("escena-lineas"), { lineas, traducciones, alEscuchar: escucharLineaEscena });
}

/** Pone la línea en los subtítulos del video, con cada palabra lista para el marcador. */
function pintarSubtituloEscena(i) {
  const zona = $escena("escena-subtitulo");
  if (!zona || !escenaActual || !$escena("escena-portada").classList.contains("con-video")) return;
  const traduccion = escenaActual.traducciones ? escenaActual.traducciones[i] : null;
  LectorBilingue.pintarSubtitulo(zona, escenaActual.lineas[i], traduccion);
}

/** El botón del video muestra pausa mientras corre y play cuando está quieto. */
function pintarBotonVideoEscena() {
  const boton = $escena("btn-escena-video");
  const quieto = $escena("escena-video-fuente").paused;
  boton.classList.toggle("pausado", quieto);
  boton.setAttribute("aria-label", quieto ? "Play the video" : "Pause the video");
}

function alternarVideoEscena() {
  const fuente = $escena("escena-video-fuente");
  if (!fuente.getAttribute("src")) return;
  videoPausadoEscena = !fuente.paused;
  if (videoPausadoEscena) fuente.pause();
  else fuente.play().catch(() => {});
}

/** El video corre solo mientras se ve: fuera de la pantalla se pausa y al volver sigue, si el estudiante no lo paró. */
function vigilarVideoEscena() {
  const fuente = $escena("escena-video-fuente");
  const pantalla = document.querySelector("#escena-portada .escena-pantalla");
  if (!fuente || !pantalla) return;
  fuente.addEventListener("play", pintarBotonVideoEscena);
  fuente.addEventListener("pause", pintarBotonVideoEscena);
  if (!("IntersectionObserver" in window)) return;
  new IntersectionObserver(([entrada]) => {
    if (!fuente.getAttribute("src")) return;
    if (!entrada.isIntersecting) fuente.pause();
    else if (!videoPausadoEscena) fuente.play().catch(() => {});
  }, { threshold: 0.25 }).observe(pantalla);
}

function renglonEscena(i) {
  return document.querySelector(`#escena-lineas .escena-renglon[data-linea="${i}"]`);
}

/** Resalta la línea que le toca al estudiante. */
function marcarLineaActual() {
  document.querySelectorAll("#escena-lineas .escena-renglon").forEach((renglon, i) => {
    const actual = i === indiceLinea;
    renglon.classList.toggle("actual", actual);
    if (actual) renglon.setAttribute("aria-current", "step");
    else renglon.removeAttribute("aria-current");
  });
}

function mostrarRenglonEscena(i) {
  LectorBilingue.mostrar(renglonEscena(i));
}

/** Cambia la línea que se practica y limpia el resultado de la anterior. */
function irALineaEscena(i) {
  if (!escenaActual || i < 0 || i >= escenaActual.lineas.length) return;
  if (escuchandoEscena && reconocimientoEscena) reconocimientoEscena.abort();
  indiceLinea = i;
  $escena("escena-resultado").classList.add("oculto");
  $escena("escena-final").classList.add("oculto");
  marcarLineaActual();
  pintarSubtituloEscena(i);
  ponerEstadoEscena(ayudaDeLineaEscena());
}

function habilitarHerramientasEscena(listas) {
  const traducir = $escena("btn-escena-traducir");
  $escena("btn-escena-escuchar").disabled = !listas;
  traducir.disabled = !listas;
  traducir.classList.toggle("oculto", listas && !(escenaActual && escenaActual.traducciones));
  $escena("btn-escena-leer").disabled = !listas || !soporteVozDisponibleEscena();
}

/** Muestra u oculta las traducciones de toda la página. */
function pintarTraduccionEscena(prendida) {
  $escena("escena-libro").classList.toggle("sin-traduccion", !prendida);
  $escena("btn-escena-traducir").setAttribute("aria-pressed", String(prendida));
}

function alternarTraduccionEscena() {
  const prendida = $escena("escena-libro").classList.contains("sin-traduccion");
  pintarTraduccionEscena(prendida);
  try {
    localStorage.setItem(ESCENA_TRADUCCION, prendida ? "1" : "0");
  } catch (e) {
    // Sin almacenamiento la preferencia dura solo esta visita
  }
}

/** Lee una línea con el marcador en la página y, si hay video, también en los subtítulos. */
function narrarLineaEscena(i, turno) {
  if (turno !== turnoNarracion) return Promise.resolve();
  pintarSubtituloEscena(i);
  const conVideo = $escena("escena-portada").classList.contains("con-video");
  return LectorBilingue.narrar(renglonEscena(i), escenaActual.lineas[i], {
    vigente: () => turno === turnoNarracion,
    subtitulo: conVideo ? $escena("escena-subtitulo") : null,
  });
}

/** Cambia el chip sin rehacer su contenido, para que el toque no caiga en un elemento que ya no existe. */
function pintarChipEscena(id, clase, activo, texto) {
  const boton = $escena(id);
  boton.classList.toggle(clase, activo);
  boton.querySelector(".escena-chip-texto").textContent = texto;
}

function pintarBotonNarracion(activo) {
  pintarChipEscena("btn-escena-escuchar", "activo", activo, activo ? "Stop" : "Listen");
}

function pararNarracionEscena() {
  turnoNarracion += 1;
  if (narrandoEscena) {
    narrandoEscena = false;
    pintarBotonNarracion(false);
    pintarSubtituloEscena(indiceLinea);
  }
  VozIngles.callar();
}

/** Listen lee toda la escena de corrido; tocarlo otra vez la detiene. */
async function alternarNarracionEscena() {
  if (!escenaActual) return;
  if (narrandoEscena) {
    pararNarracionEscena();
    ponerEstadoEscena(ayudaDeLineaEscena());
    return;
  }
  if (escuchandoEscena && reconocimientoEscena) reconocimientoEscena.abort();
  pararNarracionEscena();
  const turno = turnoNarracion;
  narrandoEscena = true;
  pintarBotonNarracion(true);
  ponerEstadoEscena("Listening to the scene...");

  for (let i = 0; i < escenaActual.lineas.length && turno === turnoNarracion; i += 1) {
    mostrarRenglonEscena(i);
    await narrarLineaEscena(i, turno);
    if (turno === turnoNarracion && i < escenaActual.lineas.length - 1) {
      await new Promise((listo) => setTimeout(listo, 450));
    }
  }
  if (turno !== turnoNarracion) return;
  narrandoEscena = false;
  pintarBotonNarracion(false);
  pintarSubtituloEscena(indiceLinea);
  mostrarRenglonEscena(indiceLinea);
  ponerEstadoEscena(
    soporteVozDisponibleEscena() ? `Your turn: read line ${indiceLinea + 1} aloud.` : ayudaDeLineaEscena(),
  );
}

/** El parlante de cada línea la lee sola y la deja como la línea para practicar. */
async function escucharLineaEscena(i) {
  if (!escenaActual) return;
  pararNarracionEscena();
  if (i !== indiceLinea) irALineaEscena(i);
  else if (escuchandoEscena && reconocimientoEscena) reconocimientoEscena.abort();
  const turno = turnoNarracion;
  ponerEstadoEscena(`Listening to line ${i + 1}...`);
  await narrarLineaEscena(i, turno);
  if (turno !== turnoNarracion || i !== indiceLinea) return;
  ponerEstadoEscena(soporteVozDisponibleEscena() ? `Your turn: read line ${i + 1} aloud.` : ayudaDeLineaEscena());
}

function configurarReconocimientoEscena() {
  if (!soporteVozDisponibleEscena()) return;

  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  reconocimientoEscena = new SpeechRecognitionAPI();
  reconocimientoEscena.lang = "en-US";
  reconocimientoEscena.interimResults = false;
  reconocimientoEscena.maxAlternatives = 1;

  reconocimientoEscena.onresult = (evento) => {
    const texto = evento.results[0][0].transcript;
    detenerEscuchaEscena();
    evaluarLineaDicha(texto);
  };

  reconocimientoEscena.onerror = (evento) => {
    detenerEscuchaEscena();
    if (evento.error === "aborted") return;
    ponerEstadoEscena(
      evento.error === "not-allowed"
        ? "Allow the microphone to read aloud."
        : evento.error === "no-speech"
          ? "I didn't hear anything. Tap Read aloud and try again."
          : "There was a problem listening. Try again.",
    );
  };

  reconocimientoEscena.onend = () => detenerEscuchaEscena();
}

function pintarBotonLeer(activo) {
  pintarChipEscena("btn-escena-leer", "escuchando", activo, activo ? "Stop" : "Read aloud");
}

/** Read aloud prende el micrófono para la línea actual; tocarlo otra vez lo apaga. */
function alternarEscuchaEscena() {
  if (!reconocimientoEscena || !escenaActual) return;
  if (escuchandoEscena) {
    reconocimientoEscena.stop();
    return;
  }
  pararNarracionEscena();
  try {
    reconocimientoEscena.start();
  } catch (e) {
    return;
  }
  escuchandoEscena = true;
  pintarBotonLeer(true);
  $escena("escena-resultado").classList.add("oculto");
  ponerEstadoEscena(`Listening to you... read line ${indiceLinea + 1} out loud.`);
}

function detenerEscuchaEscena() {
  if (!escuchandoEscena) return;
  escuchandoEscena = false;
  pintarBotonLeer(false);
}

/** Marca en la propia línea qué palabras se entendieron y cuáles no. */
function pintarPronunciacion(linea, resultado) {
  const renglon = renglonEscena(linea);
  if (!renglon) return;
  const palabras = [...renglon.querySelectorAll(".escena-palabra")];
  const detalle = Array.isArray(resultado.palabras) ? resultado.palabras : [];
  const alineadas = detalle.length === palabras.length;
  palabras.forEach((p, i) => {
    p.classList.toggle("bien", alineadas && !!detalle[i].acerto);
    p.classList.toggle("mal", alineadas && !detalle[i].acerto);
  });
}

/** La siguiente línea sin practicar después de la actual; -1 si ya se dijeron todas. */
function lineaPendienteEscena() {
  const total = escenaActual.lineas.length;
  for (let paso = 1; paso <= total; paso += 1) {
    const i = (indiceLinea + paso) % total;
    if (!resultadosEscena[i]) return i;
  }
  return -1;
}

function pintarResultadoEscena(resultado) {
  const nota = Math.max(0, Math.min(100, Math.round(Number(resultado.puntuacion) || 0)));
  const caja = $escena("escena-resultado");
  caja.dataset.tono = nota >= 85 ? "alto" : nota >= 60 ? "medio" : "bajo";
  $escena("escena-nota-cifra").textContent = String(nota);

  const partes = [];
  if (resultado.totalPalabras) partes.push(`${resultado.aciertos} of ${resultado.totalPalabras} words understood`);
  if (resultado.xpGanado) partes.push(`+${resultado.xpGanado} XP`);
  const sobrantes = Array.isArray(resultado.sobrantes) ? resultado.sobrantes : [];
  if (sobrantes.length) partes.push(`extra: ${sobrantes.join(", ")}`);
  $escena("escena-precision").textContent = partes.join(" · ");
  $escena("escena-feedback").textContent = resultado.feedback || "";

  $escena("btn-siguiente-linea").textContent = lineaPendienteEscena() === -1 ? "Finish scene" : "Next line";
  caja.classList.remove("oculto");
  ponerEstadoEscena("");
}

async function evaluarLineaDicha(transcripcion) {
  const escena = escenaActual;
  const linea = indiceLinea;
  ponerEstadoEscena("Checking your pronunciation...");

  try {
    const resultado = await EscenaAPI.evaluarLinea({
      lineaObjetivo: escena.lineas[linea],
      transcripcion,
    });
    if (escena !== escenaActual) return;

    resultadosEscena[linea] = { puntuacion: Number(resultado.puntuacion) || 0 };
    xpEscena += Number(resultado.xpGanado) || 0;
    const renglon = renglonEscena(linea);
    if (renglon) renglon.classList.add("hecha");
    const chip = document.getElementById("progreso-monedas");
    if (chip && typeof resultado.monedas === "number") chip.textContent = resultado.monedas;

    pintarPronunciacion(linea, resultado);
    if (linea !== indiceLinea) return;
    pintarResultadoEscena(resultado);
  } catch (err) {
    if (escena === escenaActual && linea === indiceLinea) {
      ponerEstadoEscena("Could not check your line. Try again.");
    }
  }
}

function siguienteLineaEscena() {
  const siguiente = lineaPendienteEscena();
  if (siguiente === -1) {
    terminarEscena();
    return;
  }
  irALineaEscena(siguiente);
  mostrarRenglonEscena(siguiente);
}

/** Cierra la escena con lo que de verdad pasó: líneas dichas, promedio y XP ganado. */
function terminarEscena() {
  const notas = resultadosEscena.filter(Boolean).map((r) => r.puntuacion);
  const promedio = notas.length ? Math.round(notas.reduce((a, b) => a + b, 0) / notas.length) : 0;
  $escena("escena-resultado").classList.add("oculto");
  $escena("escena-final-titulo").textContent = "Scene complete!";
  $escena("escena-final-texto").textContent =
    `You read all ${notas.length} lines · average ${promedio}/100 · +${xpEscena} XP`;
  $escena("btn-otra-escena").textContent = "New scene";
  $escena("escena-final").classList.remove("oculto");
  ponerEstadoEscena("");
  $escena("btn-otra-escena").focus();
  if (promedio >= 85 && typeof celebrarConTuti === "function") {
    celebrarConTuti("Scene complete!", `Average ${promedio}/100 · +${xpEscena} XP`);
  }
}

/** La escena la escribió la IA: si una traducción o una línea está mal, el estudiante lo reporta. */
function agregarReporteEscena() {
  const zona = $escena("escena-reporte");
  zona.innerHTML = "";
  if (typeof ReporteEjercicio === "undefined") return;
  const escena = escenaActual;
  ReporteEjercicio.agregarBoton(zona, {
    modulo: "escena",
    contenido: () => ({
      titulo: escena.titulo,
      situacion: escena.situacion,
      lineas: escena.lineas,
      traducciones: escena.traducciones,
    }),
  });
}

/** Calla la voz y el micrófono, venga de donde venga. */
function pararTodoEscena() {
  pararNarracionEscena();
  if (escuchandoEscena && reconocimientoEscena) reconocimientoEscena.abort();
  detenerEscuchaEscena();
}

function salirDeEscena() {
  $escena("vista-escena").classList.add("oculto");
  document.getElementById("vista-principal").classList.remove("oculto");
}

/** Al salir de Scene Mode, por el botón o por el menú, se apagan la voz, el micrófono y el video. */
function vigilarSalidaEscena() {
  const vista = $escena("vista-escena");
  if (!vista) return;
  new MutationObserver(() => {
    if (!vista.classList.contains("oculto")) return;
    pedidoEscena += 1;
    pararTodoEscena();
    pintarVideoEscena(null);
  }).observe(vista, { attributes: true, attributeFilter: ["class"] });
}

document.addEventListener("DOMContentLoaded", () => {
  const enlazar = (id, fn) => {
    const el = $escena(id);
    if (el) el.addEventListener("click", fn);
  };
  enlazar("btn-escena", iniciarEscena);
  enlazar("btn-escena-leer", alternarEscuchaEscena);
  enlazar("btn-escena-escuchar", alternarNarracionEscena);
  enlazar("btn-escena-traducir", alternarTraduccionEscena);
  enlazar("btn-repetir-linea", alternarEscuchaEscena);
  enlazar("btn-siguiente-linea", siguienteLineaEscena);
  enlazar("btn-otra-escena", cargarEscena);
  enlazar("btn-salir-escena", salirDeEscena);
  enlazar("btn-escena-video", alternarVideoEscena);
  vigilarSalidaEscena();
  vigilarVideoEscena();
});
