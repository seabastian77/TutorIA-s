// Tuti: el avatar que acompaña al estudiante y le dice qué hacer ahora

const MENTOR_NOMBRE = "Tuti";
const MENTOR_MEMORIA = "tutorias_mentor_cerrado";

// Un loro: el animal que aprende idiomas repitiendo, igual que el estudiante
const MENTOR_CUERPO = `
<svg class="mentor-ave" viewBox="0 0 72 72" fill="none" aria-hidden="true">
  <g class="mentor-flota">
    <g class="mentor-cresta" fill="#fbbf24">
      <path d="M30.5 19c-1.5-3.5-.8-6.5 1.5-8 1.3 2.4 1.7 5.3 1 7.7z"/>
      <path d="M36 17.5c-1-4 .3-7 2.8-8.2.8 2.7.6 5.7-.6 7.9z"/>
      <path d="M41.5 19.2c-.3-3.8 1.2-6.4 3.8-7 .1 2.7-.9 5.4-2.6 7.2z"/>
    </g>
    <path class="mentor-ala" d="M18.5 34c-4.5 2.5-6 7.5-4 13 3.5-1.5 6.5-5 7.5-9.5z" fill="#0f766e"/>
    <circle cx="36" cy="38" r="21" fill="#14b8a6"/>
    <path d="M36 17a21 21 0 0 1 0 42z" fill="#0d9488" opacity=".55"/>
    <ellipse cx="36" cy="47" rx="12.5" ry="10" fill="#fde68a"/>
    <g class="mentor-ojos">
      <circle cx="28" cy="33" r="5" fill="#ffffff"/>
      <circle cx="44" cy="33" r="5" fill="#ffffff"/>
      <circle class="mentor-pupila" cx="28.9" cy="33.6" r="2.5" fill="#12232b"/>
      <circle class="mentor-pupila" cx="44.9" cy="33.6" r="2.5" fill="#12232b"/>
      <circle cx="27.2" cy="32" r="1" fill="#ffffff"/>
      <circle cx="43.2" cy="32" r="1" fill="#ffffff"/>
    </g>
    <g class="mentor-parpados">
      <path d="M23.4 33h9.2" stroke="#0d9488" stroke-width="5.4" stroke-linecap="round"/>
      <path d="M39.4 33h9.2" stroke="#0d9488" stroke-width="5.4" stroke-linecap="round"/>
    </g>
    <path class="mentor-pico" d="M31 39.5h10L36 49z" fill="#f59e0b"/>
    <path class="mentor-pico" d="M31 39.5h10l-1.6 3H32.6z" fill="#fbbf24"/>
    <g class="mentor-ceja" stroke="#0d9488" stroke-width="2.2" stroke-linecap="round">
      <path d="M23.5 26.5 32 25"/>
      <path d="M48.5 26.5 40 25"/>
    </g>
    <path class="mentor-nota" d="M55 16v8.5a3 3 0 1 1-1.9-2.8V16z" fill="#fbbf24"/>
  </g>
</svg>`;

const MENTOR_HTML = `
<div id="mentor" class="mentor oculto" data-animo="feliz">
  <div class="mentor-columna">
    <button id="mentor-burbuja" class="mentor-burbuja" type="button" aria-labelledby="mentor-titulo">
      <span class="mentor-cabecera">
        <span class="mentor-nombre">${MENTOR_NOMBRE}</span>
        <span id="mentor-cerrar" class="mentor-cerrar" role="button" tabindex="0"
              aria-label="Hide ${MENTOR_NOMBRE}">&times;</span>
      </span>
      <span id="mentor-titulo" class="mentor-titulo"></span>
      <span id="mentor-texto" class="mentor-texto"></span>
      <span id="mentor-accion" class="mentor-accion"></span>
    </button>

    <button id="mentor-abrir-charla" class="mentor-charlar" type="button">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-4.6A8 8 0 0 1 13 4a8 8 0 0 1 8 8z"
              fill="none" stroke="currentColor" stroke-width="1.8"
              stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="9.5" cy="12" r="1.1" fill="currentColor"/>
        <circle cx="13" cy="12" r="1.1" fill="currentColor"/>
        <circle cx="16.5" cy="12" r="1.1" fill="currentColor"/>
      </svg>
      <span class="mentor-charlar-texto">Hablar con ${MENTOR_NOMBRE}</span>
    </button>
  </div>

  <button id="mentor-avatar" class="mentor-avatar" type="button"
          aria-label="Ask ${MENTOR_NOMBRE} what to do next">
    ${MENTOR_CUERPO}
    <span id="mentor-punto" class="mentor-punto" aria-hidden="true"></span>
  </button>
</div>`;

const CHARLA_HTML = `
<div id="mentor-charla" class="mentor-charla oculto" role="dialog" aria-modal="false"
     aria-labelledby="charla-titulo">
  <header class="charla-barra">
    <span class="charla-ave" aria-hidden="true">${MENTOR_CUERPO}</span>
    <span class="charla-quien">
      <strong id="charla-titulo">${MENTOR_NOMBRE}</strong>
      <span id="charla-estado" class="charla-estado">En línea</span>
    </span>
    <button id="charla-cerrar" class="charla-cerrar" type="button" aria-label="Cerrar la charla">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
  </header>

  <div id="charla-mensajes" class="charla-mensajes" role="log" aria-live="polite"
       aria-label="Conversación con ${MENTOR_NOMBRE}"></div>

  <p id="charla-aviso-mic" class="charla-aviso oculto">
    Tu navegador no deja usar el micrófono aquí. Prueba con Chrome o Edge.
  </p>

  <form id="charla-forma" class="charla-forma">
    <label class="sr-solo" for="charla-entrada">Escríbele a ${MENTOR_NOMBRE}</label>
    <button id="charla-mic" class="charla-mic oculto" type="button"
            aria-label="Hablar en inglés" title="Hablar en inglés">
      <span class="charla-mic-halo" aria-hidden="true"></span>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="currentColor"
              stroke-width="1.8"/>
        <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    </button>
    <input id="charla-entrada" class="charla-entrada" type="text" autocomplete="off"
           maxlength="400" placeholder="Escríbele a ${MENTOR_NOMBRE}...">
    <button id="charla-enviar" class="charla-enviar" type="submit" aria-label="Enviar">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 12 4 4l6 8-6 8z" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linejoin="round"/>
      </svg>
    </button>
  </form>
</div>`;

let mentorConsejo = null;
let mentorAbierto = true;

/** Deja el avatar y su burbuja colgados del body, una sola vez. */
function montarMentor() {
  if (document.getElementById("mentor")) return;
  const caja = document.createElement("div");
  caja.innerHTML = MENTOR_HTML;
  document.body.appendChild(caja.firstElementChild);

  document.getElementById("mentor-avatar").addEventListener("click", alternarMentor);
  vigilarLaVista();
  document.getElementById("mentor-burbuja").addEventListener("click", seguirConsejo);
  document.getElementById("mentor-abrir-charla").addEventListener("click", abrirCharla);
  montarCharla();

  const cerrar = document.getElementById("mentor-cerrar");
  cerrar.addEventListener("click", (e) => {
    e.stopPropagation();
    ocultarBurbuja();
  });
  cerrar.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    e.stopPropagation();
    ocultarBurbuja();
  });
}

/** Pinta el consejo recibido y pone al loro en el ánimo que le corresponde. */
function pintarConsejo(consejo) {
  mentorConsejo = consejo;
  const mentor = document.getElementById("mentor");
  if (!mentor || !consejo) return;

  mentor.dataset.animo = consejo.animo || "feliz";
  document.getElementById("mentor-titulo").textContent = consejo.titulo || "";
  document.getElementById("mentor-texto").textContent = consejo.texto || "";
  document.getElementById("mentor-accion").textContent = consejo.accion || "";
  document.getElementById("mentor-punto").classList.toggle(
    "visible",
    consejo.animo === "preocupado",
  );
  mentor.classList.remove("oculto");
}

/** Lleva al módulo que el consejo propone, cerrando la vista que esté abierta. */
function seguirConsejo() {
  if (!mentorConsejo || !mentorConsejo.boton) return;
  const destino = document.getElementById(mentorConsejo.boton);
  if (!destino) return;

  document.querySelectorAll(".pantalla-principal").forEach((v) => v.classList.add("oculto"));
  document.getElementById("vista-principal").classList.remove("oculto");
  ocultarBurbuja();
  destino.click();
}

function ocultarBurbuja() {
  mentorAbierto = false;
  document.getElementById("mentor").classList.add("encogido");
  try {
    sessionStorage.setItem(MENTOR_MEMORIA, "1");
  } catch (e) {
    // Si el navegador bloquea el almacenamiento, el mentor simplemente no recuerda
  }
}

/**
 * Dentro de un módulo la burbuja se repliega para no taparlo; el loro se queda.
 * Es distinto de cerrarla a mano, así que no pisa lo que el usuario eligió.
 */
function vigilarLaVista() {
  const menu = document.getElementById("vista-principal");
  const mentor = document.getElementById("mentor");
  if (!menu || !mentor) return;

  const ajustar = () =>
    mentor.classList.toggle("fuera-del-menu", menu.classList.contains("oculto"));

  new MutationObserver(ajustar).observe(menu, {
    attributes: true,
    attributeFilter: ["class"],
  });
  ajustar();
}

function alternarMentor() {
  mentorAbierto = !mentorAbierto;
  document.getElementById("mentor").classList.toggle("encogido", !mentorAbierto);
  try {
    if (mentorAbierto) sessionStorage.removeItem(MENTOR_MEMORIA);
    else sessionStorage.setItem(MENTOR_MEMORIA, "1");
  } catch (e) {
    // Sin almacenamiento el estado vive solo mientras la página esté abierta
  }
}

/** Vuelve a preguntar qué toca ahora; se llama tras cada actividad terminada. */
async function refrescarMentor() {
  if (!Sesion.estaAutenticado()) return;
  try {
    const { consejo } = await MentorAPI.obtenerEstado();
    pintarConsejo(consejo);
  } catch (err) {
    // El mentor es compañía, no una función crítica: si falla, no estorba
  }
}

async function iniciarMentor() {
  if (!Sesion.estaAutenticado()) return;
  montarMentor();

  let cerrado = false;
  try {
    cerrado = sessionStorage.getItem(MENTOR_MEMORIA) === "1";
  } catch (e) {
    cerrado = false;
  }
  if (cerrado) {
    mentorAbierto = false;
    document.getElementById("mentor").classList.add("encogido");
  }

  await refrescarMentor();
}

/* ============================================================
   La charla: conversar con Tuti, no responderle un examen
   ============================================================ */

const CHARLA_MEMORIA = "tutorias_charla";
const CHARLA_TURNOS = 8; // lo mismo que recuerda el backend
const CHARLA_LARGO = 400;

let charlaHistorial = [];
let charlaOcupada = false;
let charlaSaludada = false;
let charlaOyendo = false;
let charlaReconocimiento = null;

/** Deja el panel de la charla colgado del body, una sola vez. */
function montarCharla() {
  if (document.getElementById("mentor-charla")) return;
  const caja = document.createElement("div");
  caja.innerHTML = CHARLA_HTML;
  document.body.appendChild(caja.firstElementChild);

  document.getElementById("charla-cerrar").addEventListener("click", cerrarCharla);
  document.getElementById("charla-forma").addEventListener("submit", (e) => enviarCharla(e));
  document.getElementById("charla-mic").addEventListener("click", alternarMicrofono);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !document.getElementById("mentor-charla").classList.contains("oculto")) {
      cerrarCharla();
    }
  });

  prepararMicrofono();

  charlaHistorial = leerCharlaGuardada();
  charlaHistorial.forEach((t) => pintarTurno(t.papel, t.texto));
  charlaSaludada = charlaHistorial.length > 0;
}

function leerCharlaGuardada() {
  try {
    const crudo = JSON.parse(sessionStorage.getItem(CHARLA_MEMORIA) || "[]");
    if (!Array.isArray(crudo)) return [];
    return crudo
      .filter((t) => t && (t.papel === "tu" || t.papel === "tuti") && typeof t.texto === "string")
      .map((t) => ({ papel: t.papel, texto: t.texto.slice(0, CHARLA_LARGO) }))
      .slice(-CHARLA_TURNOS * 3);
  } catch (e) {
    return [];
  }
}

function guardarCharla() {
  try {
    sessionStorage.setItem(
      CHARLA_MEMORIA,
      JSON.stringify(charlaHistorial.slice(-CHARLA_TURNOS * 3)),
    );
  } catch (e) {
    // Sin almacenamiento la charla vive solo mientras la página esté abierta
  }
}

/**
 * Pinta un turno. El texto entra siempre por textContent: lo que escribe el
 * estudiante, y lo que devuelve la IA, nunca se interpreta como HTML.
 */
function pintarTurno(papel, texto) {
  const lista = document.getElementById("charla-mensajes");
  if (!lista) return null;

  const fila = document.createElement("div");
  fila.className = `charla-turno charla-${papel === "tu" ? "mio" : "suyo"}`;
  const globo = document.createElement("p");
  globo.className = "charla-globo";
  globo.textContent = texto;
  fila.appendChild(globo);
  lista.appendChild(fila);
  lista.scrollTop = lista.scrollHeight;
  return fila;
}

/** Los tres puntos mientras Tuti piensa. */
function pintarEscribiendo() {
  const lista = document.getElementById("charla-mensajes");
  const fila = document.createElement("div");
  fila.className = "charla-turno charla-suyo charla-pensando";
  fila.innerHTML =
    '<p class="charla-globo"><span class="charla-punto"></span>' +
    '<span class="charla-punto"></span><span class="charla-punto"></span></p>';
  fila.setAttribute("aria-label", "Tuti está escribiendo");
  lista.appendChild(fila);
  lista.scrollTop = lista.scrollHeight;
  return fila;
}

function anotarTurno(papel, texto) {
  charlaHistorial.push({ papel, texto });
  pintarTurno(papel, texto);
  guardarCharla();
}

async function abrirCharla() {
  montarCharla();
  const panel = document.getElementById("mentor-charla");
  panel.classList.remove("oculto");
  document.getElementById("mentor").classList.add("en-charla");
  document.getElementById("charla-entrada").focus();

  const lista = document.getElementById("charla-mensajes");
  lista.scrollTop = lista.scrollHeight;

  if (charlaSaludada) return;
  charlaSaludada = true;
  const pensando = pintarEscribiendo();
  try {
    const { texto } = await MentorAPI.saludo();
    pensando.remove();
    anotarTurno("tuti", texto);
  } catch (err) {
    pensando.remove();
    anotarTurno("tuti", "¡Hola! Soy Tuti. ¿Cómo va tu inglés hoy?");
  }
}

function cerrarCharla() {
  pararMicrofono();
  document.getElementById("mentor-charla").classList.add("oculto");
  document.getElementById("mentor").classList.remove("en-charla");
  const abrir = document.getElementById("mentor-abrir-charla");
  if (abrir) abrir.focus();
}

async function enviarCharla(evento, voz) {
  if (evento) evento.preventDefault();
  if (charlaOcupada) return;

  const campo = document.getElementById("charla-entrada");
  const mensaje = campo.value.trim().slice(0, CHARLA_LARGO);
  if (!mensaje) return;

  charlaOcupada = true;
  campo.value = "";
  campo.disabled = true;
  document.getElementById("charla-enviar").disabled = true;
  document.getElementById("charla-estado").textContent = "Escribiendo...";

  anotarTurno("tu", mensaje);
  // El historial que se manda no incluye este mensaje: el backend lo añade
  const historial = charlaHistorial.slice(0, -1).slice(-CHARLA_TURNOS);
  const pensando = pintarEscribiendo();

  try {
    const respuesta = await MentorAPI.charlar(mensaje, historial, voz);
    pensando.remove();
    anotarTurno("tuti", respuesta.texto);
  } catch (err) {
    pensando.remove();
    anotarTurno("tuti", "No pude responderte ahora mismo. Inténtalo otra vez en un momento.");
  } finally {
    charlaOcupada = false;
    campo.disabled = false;
    document.getElementById("charla-enviar").disabled = false;
    document.getElementById("charla-estado").textContent = "En línea";
    campo.focus();
  }
}

/* ─────────── hablarle a Tuti por micrófono ─────────── */

/** Arma el reconocimiento de voz, o avisa si el navegador no lo trae. */
function prepararMicrofono() {
  const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
  const boton = document.getElementById("charla-mic");
  const aviso = document.getElementById("charla-aviso-mic");

  if (!Reconocimiento) {
    aviso.classList.remove("oculto");
    return;
  }
  boton.classList.remove("oculto");

  charlaReconocimiento = new Reconocimiento();
  charlaReconocimiento.lang = "en-US"; // se practica la pronunciación en inglés
  charlaReconocimiento.interimResults = false;
  charlaReconocimiento.maxAlternatives = 1;

  charlaReconocimiento.onresult = (evento) => {
    const oido = evento.results[0][0];
    document.getElementById("charla-entrada").value = String(oido.transcript || "")
      .trim()
      .slice(0, CHARLA_LARGO);
    pararMicrofono();
    enviarCharla(null, { hablado: true, claridad: oido.confidence });
  };

  charlaReconocimiento.onerror = (evento) => {
    pararMicrofono();
    document.getElementById("charla-estado").textContent =
      evento.error === "not-allowed" ? "Sin permiso del micrófono" : "No te escuché bien";
  };

  charlaReconocimiento.onend = pararMicrofono;
}

function alternarMicrofono() {
  if (!charlaReconocimiento || charlaOcupada) return;
  if (charlaOyendo) return pararMicrofono();

  try {
    charlaReconocimiento.start();
  } catch (e) {
    return; // ya venía arrancado: el navegador se queja y no pasa nada
  }
  charlaOyendo = true;
  document.getElementById("charla-mic").classList.add("oyendo");
  document.getElementById("charla-mic").setAttribute("aria-pressed", "true");
  document.getElementById("charla-estado").textContent = "Te escucho... habla en inglés";
}

function pararMicrofono() {
  if (charlaReconocimiento && charlaOyendo) {
    try {
      charlaReconocimiento.stop();
    } catch (e) {
      // Si ya se había detenido solo, no hay nada que parar
    }
  }
  charlaOyendo = false;
  const boton = document.getElementById("charla-mic");
  if (boton) {
    boton.classList.remove("oyendo");
    boton.setAttribute("aria-pressed", "false");
  }
  const estado = document.getElementById("charla-estado");
  if (estado && estado.textContent.startsWith("Te escucho")) estado.textContent = "En línea";
}

/** Al cerrar sesión la charla no puede quedar colgada en pantalla. */
function olvidarCharla() {
  pararMicrofono();
  charlaHistorial = [];
  charlaSaludada = false;
  const lista = document.getElementById("charla-mensajes");
  if (lista) lista.textContent = "";
  const panel = document.getElementById("mentor-charla");
  if (panel) panel.classList.add("oculto");
  try {
    sessionStorage.removeItem(CHARLA_MEMORIA);
  } catch (e) {
    // Sin almacenamiento no hay nada guardado que olvidar
  }
}

window.iniciarMentor = iniciarMentor;
window.refrescarMentor = refrescarMentor;
window.olvidarCharla = olvidarCharla;
