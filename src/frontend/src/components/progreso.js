const TEXTO_TENDENCIA = {
  mejorando: { texto: "Your English is improving. Keep it up.", icono: "fa-arrow-trend-up", color: "buena" },
  bajando: { texto: "Your scores dipped a little lately. Let's win them back.", icono: "fa-arrow-trend-down", color: "mala" },
  estable: { texto: "You're holding steady. Time for a small push.", icono: "fa-minus", color: "neutra" },
  "sin-datos": { texto: "Let's make today count.", icono: null, color: "neutra" },
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

  const monedasEl = document.getElementById("progreso-monedas");
  if (monedasEl) monedasEl.textContent = datos.monedas ?? 0;

  // El interruptor de español refleja lo que dice el servidor
  if (typeof pintarInterruptorEspanol === "function") {
    pintarInterruptorEspanol(datos.ayudaEspanol !== false);
  }

  const info = TEXTO_TENDENCIA[datos.tendencia] || TEXTO_TENDENCIA["sin-datos"];
  // Sin nivel todavía, el saludo invita a empezar por el diagnóstico
  const medido = datos.nivelMedido === true;
  pintarTextoAdaptable(
    tendenciaTextoEl,
    medido ? info.texto : "Welcome to TutorIA\u2019s. Let\u2019s start by finding your English level.",
    medido ? info.texto : "Let\u2019s find your English level first.",
  );
  tendenciaIconoEl.innerHTML = medido && info.icono ? Icono.svg(info.icono) : "";

  const datoTienda = document.getElementById("dato-tienda");
  if (datoTienda) {
    const monedas = datos.monedas ?? 0;
    datoTienda.textContent = monedas === 1 ? "1 coin to spend" : `${monedas} coins to spend`;
  }
  const datoNivel = document.getElementById("dato-nivel");
  if (datoNivel) datoNivel.textContent = medido ? `Your level: ${datos.nivel}` : "Level not set yet";
  tendenciaWrap.classList.remove("tendencia-buena", "tendencia-mala", "tendencia-neutra");
  tendenciaWrap.classList.add(`tendencia-${info.color}`);

  contenedor.classList.remove("oculto");

  renderizarMetaDiaria(datos.actividadesHoy, datos.metaDiaria);
}

function renderizarMetaDiaria(actividadesHoy, metaDiaria) {
  const contenedor = document.getElementById("meta-diaria");
  const aro = document.getElementById("meta-diaria-aro");
  const texto = document.getElementById("meta-diaria-texto");

  if (!contenedor) return;

  // El aro usa pathLength=100, así que el porcentaje es directamente el trazo
  const porcentaje = Math.min(100, Math.round((actividadesHoy / metaDiaria) * 100));
  aro.style.strokeDasharray = `${porcentaje} 100`;
  document.getElementById("meta-barra-relleno").style.width = `${porcentaje}%`;
  document.getElementById("meta-linea-texto").textContent =
    `Daily goal ${Math.min(actividadesHoy, metaDiaria)}/${metaDiaria}`;
  document.getElementById("meta-diaria-hoy").textContent = Math.min(actividadesHoy, metaDiaria);
  document.getElementById("meta-diaria-total").textContent = metaDiaria;
  contenedor.classList.toggle("cumplida", actividadesHoy >= metaDiaria);
  texto.textContent = actividadesHoy >= metaDiaria ? "Goal completed!" : "Daily goal";

  contenedor.classList.remove("oculto");
}

async function cargarProgreso() {
  try {
    const datos = await UsuarioAPI.obtenerProgreso();
    renderizarProgreso(datos);
  } catch (err) {
    console.error("No se pudo cargar el progreso:", err);
  }

  // Cada regreso al menú es un buen momento para que el mentor revise qué toca
  if (typeof iniciarMentor === "function") iniciarMentor();
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
