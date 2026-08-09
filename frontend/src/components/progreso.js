// frontend/src/components/progreso.js

const TEXTO_TENDENCIA = {
  mejorando: { texto: "Mejorando", icono: "fa-arrow-trend-up", color: "buena" },
  bajando: { texto: "Bajando", icono: "fa-arrow-trend-down", color: "mala" },
  estable: { texto: "Estable", icono: "fa-minus", color: "neutra" },
  "sin-datos": {
    texto: "Sigue practicando",
    icono: "fa-minus",
    color: "neutra",
  },
};

function renderizarProgreso(datos) {
  const contenedor = document.getElementById("progreso-usuario");
  const puntosEl = document.getElementById("progreso-puntos");
  const rachaEl = document.getElementById("progreso-racha");
  const tendenciaIconoEl = document.getElementById("progreso-tendencia-icono");
  const tendenciaTextoEl = document.getElementById("progreso-tendencia-texto");
  const tendenciaWrap = document.getElementById("progreso-tendencia-wrap");

  if (!contenedor) return;

  puntosEl.textContent = datos.puntos;
  rachaEl.textContent = datos.racha;

  const info = TEXTO_TENDENCIA[datos.tendencia] || TEXTO_TENDENCIA["sin-datos"];
  tendenciaTextoEl.textContent = info.texto;
  tendenciaIconoEl.className = `fa-solid ${info.icono}`;
  tendenciaWrap.classList.remove(
    "tendencia-buena",
    "tendencia-mala",
    "tendencia-neutra",
  );
  tendenciaWrap.classList.add(`tendencia-${info.color}`);

  contenedor.classList.remove("oculto");
}

async function cargarProgreso() {
  try {
    const datos = await UsuarioAPI.obtenerProgreso();
    renderizarProgreso(datos);
  } catch (err) {
    console.error("No se pudo cargar el progreso:", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const vistaPrincipal = document.getElementById("vista-principal");
  if (!vistaPrincipal) return;

  // Se actualiza cada vez que la vista principal vuelve a mostrarse
  // (por ejemplo, después de terminar el diagnóstico o la práctica)
  const observador = new MutationObserver(() => {
    if (!vistaPrincipal.classList.contains("oculto")) {
      cargarProgreso();
    }
  });
  observador.observe(vistaPrincipal, {
    attributes: true,
    attributeFilter: ["class"],
  });

  // Por si ya está visible al cargar la página (sesión ya iniciada)
  if (!vistaPrincipal.classList.contains("oculto")) {
    cargarProgreso();
  }
});
