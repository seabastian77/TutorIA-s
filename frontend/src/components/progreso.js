const TEXTO_TENDENCIA = {
  mejorando: { texto: "Improving", icono: "fa-arrow-trend-up", color: "buena" },
  bajando: { texto: "Declining", icono: "fa-arrow-trend-down", color: "mala" },
  estable: { texto: "Stable", icono: "fa-minus", color: "neutra" },
  "sin-datos": { texto: "Keep Practicing", icono: "fa-minus", color: "neutra" },
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
  tendenciaWrap.classList.remove("tendencia-buena", "tendencia-mala", "tendencia-neutra");
  tendenciaWrap.classList.add(`tendencia-${info.color}`);

  contenedor.classList.remove("oculto");

  renderizarMetaDiaria(datos.actividadesHoy, datos.metaDiaria);
}

function renderizarMetaDiaria(actividadesHoy, metaDiaria) {
  const contenedor = document.getElementById("meta-diaria");
  const relleno = document.getElementById("meta-diaria-relleno");
  const texto = document.getElementById("meta-diaria-texto");

  if (!contenedor) return;

  const porcentaje = Math.min(100, Math.round((actividadesHoy / metaDiaria) * 100));
  relleno.style.width = `${porcentaje}%`;
  texto.textContent =
    actividadesHoy >= metaDiaria
      ? "🎯 Daily goal completed!"
      : `Daily goal: ${actividadesHoy} / ${metaDiaria}`;

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

  const observador = new MutationObserver(() => {
    if (!vistaPrincipal.classList.contains("oculto")) {
      cargarProgreso();
    }
  });
  observador.observe(vistaPrincipal, { attributes: true, attributeFilter: ["class"] });

  if (!vistaPrincipal.classList.contains("oculto")) {
    cargarProgreso();
  }
});
