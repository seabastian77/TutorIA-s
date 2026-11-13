// Libros en Library: el estante de clásicos, el catálogo libre sin fin y el lector bilingüe con la voz marcando cada palabra

const LIBRO_TRADUCCION = "tutorias_libro_traduccion";

let estanteLibros = [];
let capituloActual = null;
let lineaLibro = 0;
let pedidoLibro = 0;
let narrandoLibro = false;
let turnoLibro = 0;
const fichasLibros = new Map(); // id → { titulo, autor, portada, total } de los libros que se ven en pantalla
const explorarLibros = { busqueda: "", genero: "", pagina: 0, hayMas: true, cargando: false, consulta: 0, empezado: false, vacias: 0 };

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

/** Escapa un texto para meterlo dentro de un dibujo SVG. */
function textoSvgLibro(texto) {
  return String(texto || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/** Portada dibujada para los libros que no traen una: color según el título y el nombre en letra de libro. */
function portadaDibujadaLibro(titulo, autor) {
  const colores = [["#0f3d2b", "#f5b301"], ["#1d3557", "#fcd34d"], ["#5b1d2b", "#fde68a"], ["#33265a", "#f9a8d4"], ["#3d2a17", "#fbbf24"], ["#12403f", "#99f6e4"]];
  let semilla = 0;
  for (const c of String(titulo)) semilla = (semilla * 31 + c.charCodeAt(0)) % 9973;
  const [fondo, acento] = colores[semilla % colores.length];
  const palabras = String(titulo || "Book").split(/\s+/);
  const renglones = [];
  palabras.forEach((p) => {
    const ultimo = renglones[renglones.length - 1];
    if (ultimo && (ultimo + " " + p).length <= 14) renglones[renglones.length - 1] = `${ultimo} ${p}`;
    else renglones.push(p);
  });
  const visibles = renglones.slice(0, 5);
  const inicio = 150 - visibles.length * 17;
  const lineas = visibles
    .map((r, i) => `<text x="120" y="${inicio + i * 34}" text-anchor="middle" font-family="Georgia, serif" font-size="26" fill="#fff">${textoSvgLibro(r)}</text>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 360"><rect width="240" height="360" fill="${fondo}"/><rect x="14" y="14" width="212" height="332" fill="none" stroke="${acento}" stroke-width="2" opacity="0.8"/><rect x="24" y="24" width="192" height="312" fill="none" stroke="${acento}" stroke-width="0.8" opacity="0.6"/>${lineas}<line x1="90" y1="250" x2="150" y2="250" stroke="${acento}" stroke-width="2"/><text x="120" y="290" text-anchor="middle" font-family="Georgia, serif" font-size="15" fill="${acento}">${textoSvgLibro(String(autor || "").slice(0, 28))}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** La portada de un libro, o la dibujada si no tiene; si la imagen falla al cargar, también se cambia por la dibujada. */
function ponerPortadaLibro(img, libro) {
  const dibujada = portadaDibujadaLibro(libro.titulo, libro.autor);
  img.onerror = () => {
    img.onerror = null;
    img.src = dibujada;
  };
  img.src = libro.portada || dibujada;
}

/** "chapter" para los clásicos del estante y "part" para los del catálogo libre, que se parten por tamaño. */
function palabraParteLibro(tipo) {
  return tipo === "externo" ? "part" : "chapter";
}

const mayusculaLibro = (t) => t.charAt(0).toUpperCase() + t.slice(1);

/** Cuántos capítulos leyó el estudiante y cuál le toca seguir. */
function avanceDe(libro) {
  const leidos = libro.capitulos.filter((c) => c.leido).length;
  const siguiente = libro.capitulos.find((c) => !c.leido);
  return { leidos, total: libro.capitulos.length, siguiente: siguiente ? siguiente.numero : 1 };
}

/** Tarjeta de un libro del estante con su portada, su autor y la barra de avance. */
function tarjetaLibro({ id, titulo, autor, portada, etiqueta, leidos, total, siguiente, tipo }) {
  const tarjeta = document.createElement("button");
  tarjeta.type = "button";
  tarjeta.className = "libro-tarjeta";
  tarjeta.innerHTML = `
    <span class="libro-tapa"><img alt="" width="120" height="180" loading="lazy" decoding="async"></span>
    <span class="libro-tarjeta-texto">
      <span class="libro-genero"></span>
      <strong class="libro-nombre"></strong>
      <span class="libro-autor"></span>
      <span class="libro-avance"><span class="libro-barra"><span style="width:${Math.round((leidos / total) * 100)}%"></span></span><span class="libro-avance-texto"></span></span>
    </span>`;
  ponerPortadaLibro(tarjeta.querySelector("img"), { titulo, autor, portada });
  tarjeta.querySelector(".libro-genero").textContent = etiqueta;
  tarjeta.querySelector(".libro-nombre").textContent = titulo;
  tarjeta.querySelector(".libro-autor").textContent = autor;
  const nombre = palabraParteLibro(tipo);
  const avance = leidos >= total ? "Finished" : leidos ? `${leidos} of ${total} ${nombre}s` : `${total} ${nombre}s`;
  tarjeta.querySelector(".libro-avance-texto").textContent = avance;
  if (leidos >= total) tarjeta.classList.add("libro-terminado");
  tarjeta.setAttribute("aria-label", `${titulo}, by ${autor}. ${avance}`);
  tarjeta.addEventListener("click", () => abrirCapituloLibro(id, leidos >= total ? 1 : siguiente));
  return tarjeta;
}

/** Pinta el estante de clásicos y, si hay, la fila de libros empezados del catálogo libre. */
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
      fichasLibros.set(libro.id, { titulo: libro.titulo, autor: libro.autor, portada: libro.portada, total, tipo: "clasico" });
      lista.appendChild(tarjetaLibro({ ...libro, etiqueta: libro.genero, leidos, total, siguiente, tipo: "clasico" }));
    });
    pintarMisLibros(datos.empezados || []);
  } catch (err) {
    lista.innerHTML = "";
    const aviso = document.createElement("p");
    aviso.className = "estante-aviso";
    aviso.textContent = "Could not load the books. Try again in a moment.";
    lista.appendChild(aviso);
  } finally {
    lista.setAttribute("aria-busy", "false");
  }
  iniciarExplorarLibros();
}

/** La fila "Keep reading": los libros del catálogo libre que el estudiante ya empezó. */
function pintarMisLibros(empezados) {
  const seccion = $libro("estante-mios");
  const lista = $libro("mios-lista");
  if (!seccion || !lista) return;
  lista.innerHTML = "";
  seccion.classList.toggle("oculto", !empezados.length);
  empezados.forEach((libro) => {
    fichasLibros.set(libro.id, { titulo: libro.titulo, autor: libro.autor, portada: libro.portada, total: libro.total, tipo: "externo" });
    lista.appendChild(tarjetaLibro({ ...libro, etiqueta: "Your book", tipo: "externo" }));
  });
}

/** Tarjeta de un resultado del catálogo libre: portada, título, autor y cuánto lleva leído. */
function tarjetaExplorar(libro) {
  const item = document.createElement("li");
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "explorar-tarjeta";
  boton.innerHTML = '<span class="explorar-tapa"><img alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"></span><span class="explorar-nombre"></span><span class="explorar-autor"></span>';
  ponerPortadaLibro(boton.querySelector("img"), libro);
  boton.querySelector(".explorar-nombre").textContent = libro.titulo;
  boton.querySelector(".explorar-autor").textContent = libro.autor;
  if (libro.leidos) {
    const marca = document.createElement("span");
    marca.className = "explorar-leidos";
    marca.textContent = `${libro.leidos} read`;
    boton.appendChild(marca);
  }
  boton.setAttribute("aria-label", `${libro.titulo}, by ${libro.autor}${libro.leidos ? `. ${libro.leidos} parts read` : ""}`);
  boton.addEventListener("click", () => {
    fichasLibros.set(libro.id, { titulo: libro.titulo, autor: libro.autor, portada: libro.portada, tipo: "externo" });
    abrirCapituloLibro(libro.id, 1);
  });
  item.appendChild(boton);
  return item;
}

/** Tarjetas grises mientras llega la siguiente página del catálogo. */
function pintarEsperaExplorar(cuantas) {
  const lista = $libro("explorar-lista");
  for (let i = 0; i < cuantas; i += 1) {
    const item = document.createElement("li");
    item.className = "explorar-espera";
    item.setAttribute("aria-hidden", "true");
    item.innerHTML = '<span class="explorar-tapa"></span><span class="explorar-barra"></span><span class="explorar-barra explorar-barra-corta"></span>';
    lista.appendChild(item);
  }
}

/** Trae la siguiente página del catálogo; con `nueva` empieza otra búsqueda o género desde cero. */
async function cargarExplorarLibros(nueva = false) {
  const estado = explorarLibros;
  const lista = $libro("explorar-lista");
  const aviso = $libro("explorar-estado");
  const mas = $libro("btn-explorar-mas");
  if (nueva) {
    estado.consulta += 1;
    estado.pagina = 0;
    estado.hayMas = true;
    estado.cargando = false;
    estado.vacias = 0;
    lista.innerHTML = "";
  }
  if (estado.cargando || !estado.hayMas) return;
  const consulta = estado.consulta;
  estado.cargando = true;
  mas.classList.add("oculto");
  aviso.textContent = "";
  pintarEsperaExplorar(estado.pagina ? 4 : 8);
  try {
    const datos = await BibliotecaAPI.buscarLibros({ busqueda: estado.busqueda, genero: estado.genero, pagina: estado.pagina + 1 });
    if (consulta !== estado.consulta) return;
    lista.querySelectorAll(".explorar-espera").forEach((e) => e.remove());
    estado.pagina += 1;
    estado.hayMas = datos.hayMas;
    datos.libros.forEach((libro) => lista.appendChild(tarjetaExplorar(libro)));
    if (!lista.children.length) {
      aviso.textContent = estado.busqueda ? "No books found. Try another title or author." : "No books here yet. Try another genre.";
    } else if (datos.libros.length) {
      aviso.textContent = estado.pagina > 1 ? `${datos.libros.length} more books loaded.` : "";
    }
    mas.textContent = "Show more books";
    mas.classList.toggle("oculto", !estado.hayMas);
    estado.cargando = false;
    // Si el final sigue a la vista pide la siguiente página; tras varias páginas vacías espera un toque
    estado.vacias = datos.libros.length ? 0 : estado.vacias + 1;
    if (estado.hayMas && estado.vacias < 3) requestAnimationFrame(revisarFinalExplorar);
  } catch (err) {
    if (consulta !== estado.consulta) return;
    lista.querySelectorAll(".explorar-espera").forEach((e) => e.remove());
    aviso.textContent = err.message || "The book catalog isn't answering. Try again in a moment.";
    mas.textContent = "Try again";
    mas.classList.remove("oculto");
    estado.cargando = false;
  }
}

/** Pide más libros cuando el final de la lista está cerca de la pantalla. */
function revisarFinalExplorar() {
  const final = $libro("explorar-final");
  if (!final || $libro("biblioteca-catalogo").classList.contains("oculto")) return;
  const caja = final.getBoundingClientRect();
  if (caja.top < window.innerHeight + 500 && caja.bottom > 0) cargarExplorarLibros();
}

/** La primera vez que se ve el catálogo carga los libros más leídos y desde ahí la lista no tiene fin. */
function iniciarExplorarLibros() {
  const seccion = $libro("explorar");
  if (!seccion || explorarLibros.empezado) return;
  explorarLibros.empezado = true;
  if (typeof IntersectionObserver === "undefined") {
    cargarExplorarLibros(true);
    return;
  }
  const vigilante = new IntersectionObserver((entradas) => {
    if (!entradas.some((e) => e.isIntersecting)) return;
    if (!explorarLibros.pagina && !explorarLibros.cargando) cargarExplorarLibros(true);
    else cargarExplorarLibros();
  }, { rootMargin: "500px 0px" });
  vigilante.observe($libro("explorar-final"));
}

/** Cambia el género del catálogo y vuelve a empezar la lista. */
function elegirGeneroExplorar(boton) {
  document.querySelectorAll(".explorar-genero").forEach((b) => {
    const activo = b === boton;
    b.classList.toggle("activo", activo);
    b.setAttribute("aria-pressed", String(activo));
  });
  explorarLibros.genero = boton.dataset.genero || "";
  explorarLibros.busqueda = "";
  $libro("explorar-texto").value = "";
  cargarExplorarLibros(true);
}

/** Busca por título o autor en todo el catálogo, sin género. */
function buscarExplorar(evento) {
  evento.preventDefault();
  const texto = $libro("explorar-texto").value.replace(/\s+/g, " ").trim();
  explorarLibros.busqueda = texto;
  explorarLibros.genero = "";
  document.querySelectorAll(".explorar-genero").forEach((b) => {
    const activo = !texto && !b.dataset.genero;
    b.classList.toggle("activo", activo);
    b.setAttribute("aria-pressed", String(activo));
  });
  cargarExplorarLibros(true);
}

/** Abre un capítulo: la primera vez en un nivel la IA lo cuenta y queda guardado para los demás. */
async function abrirCapituloLibro(id, numero) {
  const pedido = ++pedidoLibro;
  pararNarracionLibro();
  if (typeof Traductor !== "undefined") Traductor.cerrar();
  $libro("biblioteca-catalogo").classList.add("oculto");
  $libro("biblioteca-lectura").classList.add("oculto");
  $libro("biblioteca-libro").classList.remove("oculto");
  $libro("biblioteca-estado").textContent = "";
  pintarCargandoLibro(id, numero);
  window.scrollTo({ top: 0 });

  // Un libro nuevo del catálogo tarda más la primera vez: se baja, se parte y la IA cuenta la primera parte
  const avisos = [
    setTimeout(() => { if (pedido === pedidoLibro && !capituloActual) ponerEstadoLibro("Getting the book ready... this can take a few seconds."); }, 6000),
    setTimeout(() => { if (pedido === pedidoLibro && !capituloActual) ponerEstadoLibro("Almost there. The AI is retelling this part at your level."); }, 14000),
  ];
  try {
    const datos = await BibliotecaAPI.capitulo(id, numero);
    if (pedido !== pedidoLibro) return;
    capituloActual = datos;
    fichasLibros.set(id, { titulo: datos.libro.titulo, autor: datos.libro.autor, portada: datos.libro.portada, total: datos.libro.total, tipo: datos.libro.tipo });
    lineaLibro = 0;
    pintarCapituloLibro();
  } catch (err) {
    if (pedido !== pedidoLibro) return;
    $libro("libro-lector").setAttribute("aria-busy", "false");
    $libro("libro-capitulo-titulo").textContent = "This page didn't open";
    $libro("libro-lineas").innerHTML = "";
    ponerEstadoLibro(err.message && !/fetch|network/i.test(err.message) ? err.message : "Check your connection and try again.");
    const terminar = $libro("btn-capitulo-terminar");
    terminar.disabled = false;
    terminar.textContent = "Try again";
    terminar.onclick = () => abrirCapituloLibro(id, numero);
  } finally {
    avisos.forEach(clearTimeout);
  }
}

/** Mientras llega el capítulo, la portada ya se ve y la página muestra renglones en espera. */
function pintarCargandoLibro(id, numero) {
  capituloActual = null;
  $libro("libro-lector").setAttribute("aria-busy", "true");
  const ficha = fichasLibros.get(id);
  const clasico = estanteLibros.find((l) => l.id === id);
  if (ficha) {
    ponerPortadaLibro($libro("libro-portada"), ficha);
    ponerPortadaLibro($libro("libro-fondo-img"), ficha);
    $libro("libro-obra").textContent = `${ficha.titulo} · ${ficha.autor}`;
    const nombre = mayusculaLibro(palabraParteLibro(ficha.tipo));
    $libro("libro-sello").textContent = ficha.total ? `${nombre} ${numero} of ${ficha.total}` : `${nombre} ${numero}`;
    const capitulo = clasico ? clasico.capitulos[numero - 1] : null;
    $libro("libro-capitulo-titulo").textContent = capitulo ? capitulo.titulo : "Opening the book...";
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
  $libro("libro-fuente").classList.add("oculto");
  $libro("libro-reporte").innerHTML = "";
  const tipo = ficha ? ficha.tipo : "clasico";
  pintarBotonesLibro(tipo, numero);
  const terminar = $libro("btn-capitulo-terminar");
  terminar.disabled = true;
  terminar.onclick = terminarCapituloLibro;
  ponerEstadoLibro(`Opening the ${palabraParteLibro(tipo)} at your level... the first time takes a moment.`);
}

/** Los botones de abajo dicen "chapter" o "part" según el libro. */
function pintarBotonesLibro(tipo, numero) {
  const nombre = palabraParteLibro(tipo);
  $libro("libro-anterior-texto").textContent = `Previous ${nombre}`;
  $libro("btn-capitulo-anterior").disabled = numero <= 1;
  $libro("btn-capitulo-terminar").textContent = `Finish ${nombre}`;
}

/** Pinta el capítulo listo: títulos, líneas, video si hay y el botón para terminarlo. */
function pintarCapituloLibro() {
  const c = capituloActual;
  const nombre = palabraParteLibro(c.libro.tipo);
  $libro("libro-lector").setAttribute("aria-busy", "false");
  ponerPortadaLibro($libro("libro-portada"), c.libro);
  ponerPortadaLibro($libro("libro-fondo-img"), c.libro);
  $libro("libro-sello").textContent = `${mayusculaLibro(nombre)} ${c.numero} of ${c.libro.total}`;
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
  pintarBotonesLibro(c.libro.tipo, c.numero);
  const terminar = $libro("btn-capitulo-terminar");
  terminar.disabled = false;
  terminar.onclick = terminarCapituloLibro;
  pintarFuenteLibro(c.libro.fuente);
  marcarLineaLibro();
  agregarReporteLibro();
  ponerEstadoLibro(
    c.leido
      ? `You already read this ${nombre}. Read it again or go on to the next one.`
      : "Tap Listen to hear it while you read. Tap any word to translate it.",
  );
}

/** Crédito del texto original para los libros del catálogo libre, con el enlace a su página en Gutenberg. */
function pintarFuenteLibro(fuente) {
  const zona = $libro("libro-fuente");
  zona.innerHTML = "";
  zona.classList.toggle("oculto", !fuente);
  if (!fuente) return;
  const enlace = document.createElement("a");
  enlace.href = fuente.url;
  enlace.target = "_blank";
  enlace.rel = "noopener";
  enlace.textContent = fuente.nombre;
  zona.append("Retold by AI at your level from the public-domain text on ", enlace, ".");
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

/** Listen lee desde la línea marcada hasta el final, siguiendo el texto con la vista. */
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
  ponerEstadoLibro("Reading aloud...");
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
  const nombre = palabraParteLibro(capituloActual.libro.tipo);
  ponerEstadoLibro(`End of the ${nombre}. Tap Finish ${nombre} to save your progress.`);
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
  const nombre = palabraParteLibro(c.libro.tipo);
  try {
    const datos = await BibliotecaAPI.terminarCapitulo(c.libro.id, c.numero);
    const libro = estanteLibros.find((l) => l.id === c.libro.id);
    if (libro) libro.capitulos[c.numero - 1].leido = true;
    const chip = document.getElementById("progreso-monedas");
    if (chip && typeof datos.monedas === "number") chip.textContent = datos.monedas;

    const fin = c.numero >= c.libro.total;
    $libro("libro-final-titulo").textContent = fin ? "You finished the book!" : `${mayusculaLibro(nombre)} complete!`;
    $libro("libro-final-texto").textContent = datos.repetida
      ? `You had already read this ${nombre}, so it gives no XP this time.`
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
      boton.textContent = `Next ${nombre}`;
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
  $libro("explorar-form").addEventListener("submit", buscarExplorar);
  document.querySelectorAll(".explorar-genero").forEach((b) => b.addEventListener("click", () => elegirGeneroExplorar(b)));
  $libro("btn-explorar-mas").addEventListener("click", () => cargarExplorarLibros());
  vigilarSalidaLibros();
});
