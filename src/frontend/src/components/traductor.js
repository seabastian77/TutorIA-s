// Globo de traducción: lo usa Library con sus palabras y, con la ayuda en español activa, cualquier texto de la app

const Traductor = (() => {
  const LETRA = /[A-Za-zÀ-ÖØ-öø-ÿ'’-]/;
  const PALABRA_INGLESA = /^[A-Za-z]+(?:['’-][A-Za-z]+)*$/;
  const PISTA_ESPANOL = /[áéíóúñ¿¡]/i;
  const NO_TRADUCIR = [
    "button", "a", "input", "textarea", "select", "label", "summary", "option",
    "[contenteditable]", "[role='button']", "[role='tab']", "[role='link']", "[role='switch']",
    "[tabindex]:not([tabindex='-1'])", "nav", ".barra-app", ".nav-lateral", ".nav-inferior",
    ".popover-palabra", ".palabra", "[data-sin-traduccion]", ".pantalla-auth", "svg",
  ].join(",");

  let globo = null;
  let ancla = null;
  let consulta = 0;
  let actual = null;
  let nativo = false;
  let cuadroPendiente = 0;
  const recientes = new Map();

  const $ = (id) => document.getElementById(id);

  /** Dice si la ayuda en español está prendida y hay sesión abierta. */
  function tocarActivo() {
    return document.body.classList.contains("ayuda-es") &&
      typeof Sesion !== "undefined" && !!Sesion.obtenerToken();
  }

  /** Encuentra la palabra bajo el dedo o el puntero sin envolver el texto en etiquetas. */
  function palabraEnPunto(x, y) {
    let nodo = null;
    let posicion = 0;
    if (document.caretPositionFromPoint) {
      const p = document.caretPositionFromPoint(x, y);
      if (p) { nodo = p.offsetNode; posicion = p.offset; }
    } else if (document.caretRangeFromPoint) {
      const r = document.caretRangeFromPoint(x, y);
      if (r) { nodo = r.startContainer; posicion = r.startOffset; }
    }
    if (!nodo || nodo.nodeType !== Node.TEXT_NODE) return null;

    const texto = nodo.data;
    let ini = posicion;
    let fin = posicion;
    while (ini > 0 && LETRA.test(texto[ini - 1])) ini -= 1;
    while (fin < texto.length && LETRA.test(texto[fin])) fin += 1;
    while (ini < fin && /['’-]/.test(texto[ini])) ini += 1;
    while (fin > ini && /['’-]/.test(texto[fin - 1])) fin -= 1;

    const palabra = texto.slice(ini, fin);
    if (palabra.length < 2 || !PALABRA_INGLESA.test(palabra)) return null;

    const rango = document.createRange();
    rango.setStart(nodo, ini);
    rango.setEnd(nodo, fin);

    // El toque tiene que caer sobre la palabra, no en el espacio vacío de al lado
    const encima = Array.from(rango.getClientRects()).some(
      (c) => x >= c.left - 2 && x <= c.right + 2 && y >= c.top - 2 && y <= c.bottom + 2,
    );
    return encima ? { palabra, rango } : null;
  }

  /** Saca la oración donde está la palabra, que es lo que la IA necesita para dar el sentido justo. */
  function fraseDe(rango) {
    const elemento = rango.startContainer.parentElement;
    const bloque = elemento.closest("p, li, h1, h2, h3, h4, h5, h6, td, th, blockquote, figcaption, dd, dt") ||
      elemento.closest("div") || elemento;
    const antes = document.createRange();
    antes.selectNodeContents(bloque);
    antes.setEnd(rango.startContainer, rango.startOffset);

    const texto = bloque.textContent || "";
    const pos = antes.toString().length;
    const previo = texto.slice(0, pos);
    const inicio = Math.max(...[". ", "? ", "! ", "\n"].map((s) => previo.lastIndexOf(s)));
    const resto = texto.slice(pos).search(/[.!?](\s|$)|\n/);
    const fin = resto === -1 ? texto.length : pos + resto + 1;
    return texto.slice(inicio + 1, fin).replace(/\s+/g, " ").trim().slice(0, 300);
  }

  /** Marca la palabra tocada con la API de resaltados; si el navegador no la tiene, solo se ve el globo. */
  function resaltar(nombre, rango) {
    if (!window.CSS || !CSS.highlights) return;
    if (rango) CSS.highlights.set(nombre, new Highlight(rango));
    else CSS.highlights.delete(nombre);
  }

  /** Ubica el globo encima de la palabra, o debajo si arriba no cabe. */
  function colocar() {
    cuadroPendiente = 0;
    if (!ancla || !estaAbierto()) return;
    const caja = ancla.getBoundingClientRect();
    if (caja.bottom < 0 || caja.top > window.innerHeight || (caja.width === 0 && caja.height === 0)) {
      cerrar();
      return;
    }
    const margen = 8;
    const ancho = globo.offsetWidth;
    const alto = globo.offsetHeight;
    const techo = (document.getElementById("barra-app")?.getBoundingClientRect().bottom || 0) + margen;
    const x = Math.min(Math.max(margen, caja.left + caja.width / 2 - ancho / 2), window.innerWidth - ancho - margen);
    const arriba = caja.top - alto - 12;
    const y = arriba >= techo ? arriba : Math.min(caja.bottom + 12, window.innerHeight - alto - margen);
    globo.style.left = `${Math.round(x)}px`;
    globo.style.top = `${Math.round(y)}px`;
    globo.style.setProperty("--flecha", `${Math.round(caja.left + caja.width / 2 - x)}px`);
    globo.dataset.lado = arriba >= techo ? "arriba" : "abajo";
  }

  function pedirColocar() {
    if (!cuadroPendiente) cuadroPendiente = requestAnimationFrame(colocar);
  }

  function estaAbierto() {
    return !!globo && (nativo ? globo.matches(":popover-open") : !globo.classList.contains("oculto"));
  }

  function abrirGlobo() {
    if (nativo) {
      if (!globo.matches(":popover-open")) globo.showPopover();
    } else {
      globo.classList.remove("oculto");
    }
  }

  /** Cierra el globo y quita el resaltado. */
  function cerrar() {
    if (!globo) return;
    consulta += 1;
    if (nativo) {
      if (globo.matches(":popover-open")) globo.hidePopover();
    } else {
      globo.classList.add("oculto");
    }
    resaltar("palabra-tocada", null);
    ancla = null;
    actual = null;
  }

  /** Pinta el botón de guardar según la palabra ya esté o no en el vocabulario. */
  function pintarGuardado(estado) {
    const boton = $("btn-guardar-palabra");
    const texto = $("guardar-palabra-texto");
    boton.classList.toggle("guardada", estado === "guardada");
    boton.disabled = estado !== "libre";
    texto.textContent = estado === "guardada" ? "Saved to your words"
      : estado === "guardando" ? "Saving..." : "Save word";
  }

  /** Guarda en memoria lo ya consultado: repetir un toque no vuelve a pedirle nada al servidor. */
  function recordar(clave, datos) {
    recientes.delete(clave);
    recientes.set(clave, datos);
    if (recientes.size > 200) recientes.delete(recientes.keys().next().value);
  }

  /** Abre el globo para una palabra y trae su traducción en la frase donde aparece. */
  async function mostrar({ palabra, contexto = "", anclaje, rango = null, guardar = false }) {
    if (!globo) return;
    const numero = ++consulta;
    ancla = rango || anclaje;
    const clave = `${palabra.toLowerCase()}|${contexto}`;
    actual = { palabra, contexto, clave };
    resaltar("palabra-tocada", rango);

    $("popover-palabra-texto").textContent = palabra;
    $("popover-tipo").textContent = "";
    $("popover-nivel").classList.add("oculto");
    $("popover-ejemplo").textContent = "";
    const traduccion = $("popover-traduccion");
    traduccion.textContent = "Translating...";
    traduccion.classList.add("cargando");
    $("popover-acciones").classList.add("oculto");

    abrirGlobo();
    colocar();

    try {
      const datos = !guardar && recientes.has(clave)
        ? recientes.get(clave)
        : await BibliotecaAPI.traducir(palabra, contexto, guardar);
      recordar(clave, datos);
      if (numero !== consulta) return;
      actual.palabra = datos.palabra || palabra;
      $("popover-palabra-texto").textContent = actual.palabra;
      $("popover-tipo").textContent = datos.tipo || "";
      traduccion.textContent = datos.traduccion || "";
      $("popover-ejemplo").textContent = datos.ejemplo || "";
      const nivel = $("popover-nivel");
      nivel.textContent = datos.nivel || "";
      nivel.title = datos.nivel ? `CEFR level ${datos.nivel}` : "";
      nivel.classList.toggle("oculto", !datos.nivel);
      pintarGuardado(datos.guardada ? "guardada" : "libre");
      $("popover-acciones").classList.remove("oculto");
    } catch (err) {
      if (numero !== consulta) return;
      traduccion.textContent = err.message === "That doesn't look like an English word"
        ? "That doesn't look like an English word."
        : "Could not look up that word. Try again in a moment.";
    } finally {
      if (numero === consulta) {
        traduccion.classList.remove("cargando");
        colocar();
      }
    }
  }

  /** Guarda la palabra abierta en el vocabulario de repaso. */
  async function guardarActual() {
    if (!actual) return;
    pintarGuardado("guardando");
    try {
      const datos = await BibliotecaAPI.traducir(actual.palabra, actual.contexto, true);
      recordar(actual.clave, datos);
      pintarGuardado(datos.guardada ? "guardada" : "libre");
    } catch (err) {
      pintarGuardado("libre");
    }
  }

  /** Descarta controles y zonas que ya hacen algo al tocarlas, para no robarles el clic. */
  function sePuedeTraducir(objetivo) {
    return objetivo instanceof Element && objetivo.isConnected && !objetivo.closest(NO_TRADUCIR) &&
      getComputedStyle(objetivo).cursor !== "pointer";
  }

  /** Atiende el toque sobre cualquier texto cuando la ayuda en español está prendida. */
  function alTocar(evento) {
    if (!tocarActivo() || evento.button !== 0) return;
    const objetivo = evento.target;
    if (!sePuedeTraducir(objetivo)) return;
    if (String(window.getSelection && window.getSelection()).trim()) return;
    if (objetivo.closest("[lang]")?.getAttribute("lang").startsWith("es")) return;

    const hallada = palabraEnPunto(evento.clientX, evento.clientY);
    if (!hallada) return;
    const contexto = fraseDe(hallada.rango);
    if (PISTA_ESPANOL.test(contexto)) return;

    mostrar({ palabra: hallada.palabra, contexto, rango: hallada.rango });
  }

  /** Con mouse, subraya la palabra bajo el puntero para que se note que se puede tocar. */
  function alPasar(evento) {
    if (evento.pointerType !== "mouse") return;
    if (!tocarActivo() || !sePuedeTraducir(evento.target)) {
      resaltar("palabra-encima", null);
      return;
    }
    const hallada = palabraEnPunto(evento.clientX, evento.clientY);
    resaltar("palabra-encima", hallada ? hallada.rango : null);
  }

  function iniciar() {
    globo = $("popover-palabra");
    if (!globo) return;
    nativo = typeof globo.showPopover === "function";
    if (nativo) {
      globo.setAttribute("popover", "manual");
      globo.classList.remove("oculto");
    }

    $("btn-cerrar-popover").addEventListener("click", cerrar);
    $("btn-guardar-palabra").addEventListener("click", guardarActual);
    $("btn-oir-palabra").addEventListener("click", () => {
      if (actual && typeof VozIngles !== "undefined") VozIngles.leer(actual.palabra, { idioma: "en", velocidad: 0.9 });
    });

    document.addEventListener("click", alTocar);
    let cuadroPuntero = 0;
    document.addEventListener("pointermove", (e) => {
      if (cuadroPuntero) return;
      cuadroPuntero = requestAnimationFrame(() => { cuadroPuntero = 0; alPasar(e); });
    }, { passive: true });

    // Tocar fuera cierra; tocar otra palabra la cambia sin cerrar primero
    document.addEventListener("pointerdown", (e) => {
      if (!estaAbierto() || globo.contains(e.target)) return;
      if (e.target instanceof Element && e.target.closest(".palabra")) return;
      const otra = tocarActivo() && sePuedeTraducir(e.target)
        ? palabraEnPunto(e.clientX, e.clientY) : null;
      if (!otra) cerrar();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && estaAbierto()) cerrar();
    });
    window.addEventListener("scroll", pedirColocar, { passive: true, capture: true });
    window.addEventListener("resize", pedirColocar, { passive: true });
  }

  document.addEventListener("DOMContentLoaded", iniciar);

  return { mostrar, cerrar };
})();
