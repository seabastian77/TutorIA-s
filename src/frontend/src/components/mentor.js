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

  <button id="mentor-avatar" class="mentor-avatar" type="button"
          aria-label="Ask ${MENTOR_NOMBRE} what to do next">
    ${MENTOR_CUERPO}
    <span id="mentor-punto" class="mentor-punto" aria-hidden="true"></span>
  </button>
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

window.iniciarMentor = iniciarMentor;
window.refrescarMentor = refrescarMentor;
