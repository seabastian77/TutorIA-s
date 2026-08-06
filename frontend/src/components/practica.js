let ejercicioActual = null;

function iniciarPractica() {
  document.getElementById("vista-principal").classList.add("oculto");
  document.getElementById("vista-practica").classList.remove("oculto");
  cargarSiguienteEjercicio();
}

async function cargarSiguienteEjercicio() {
  const cuerpo = document.getElementById("practica-cuerpo");
  const tag = document.getElementById("practica-nivel-tag");
  cuerpo.innerHTML = "<p>Cargando ejercicio...</p>";

  try {
    const data = await PracticaAPI.obtenerPregunta();
    ejercicioActual = data;
    tag.textContent = `Nivel ${data.nivel}`;

    if (data.tipo === "opcion_multiple") {
      renderizarOpcionMultiple(data.contenido);
    } else {
      renderizarEscrita(data.contenido);
    }
  } catch (err) {
    cuerpo.innerHTML =
      '<p>Hubo un error generando el ejercicio.</p><button id="btn-reintentar-practica" class="btn-principal">Reintentar</button>';
    document
      .getElementById("btn-reintentar-practica")
      .addEventListener("click", cargarSiguienteEjercicio);
  }
}

function renderizarOpcionMultiple(contenido) {
  const cuerpo = document.getElementById("practica-cuerpo");
  cuerpo.innerHTML = `<h3 style="margin-bottom:20px;">${contenido.pregunta}</h3><div class="nivel-opciones" id="practica-opciones"></div>`;
  const contenedor = document.getElementById("practica-opciones");
  contenido.opciones.forEach((opcion, idx) => {
    const btn = document.createElement("button");
    btn.className = "opcion-nivel";
    btn.textContent = opcion;
    btn.addEventListener("click", () => enviarRespuesta(idx));
    contenedor.appendChild(btn);
  });
}

function renderizarEscrita(contenido) {
  const cuerpo = document.getElementById("practica-cuerpo");
  cuerpo.innerHTML = `
    <h3 style="margin-bottom:20px;">${contenido.frase}</h3>
    <input type="text" id="practica-respuesta-input" style="width:100%; padding:12px; background:var(--negro); border:1px solid var(--gris-oscuro); border-radius:8px; color:var(--blanco); font-size:14px; margin-bottom:14px;" placeholder="Escribe tu respuesta" />
    <button id="btn-enviar-escrita" class="btn-principal">Enviar respuesta</button>
  `;
  document
    .getElementById("btn-enviar-escrita")
    .addEventListener("click", () => {
      const valor = document
        .getElementById("practica-respuesta-input")
        .value.trim();
      if (valor) enviarRespuesta(valor);
    });
}

async function enviarRespuesta(respuestaUsuario) {
  const cuerpo = document.getElementById("practica-cuerpo");
  cuerpo.innerHTML = "<p>Revisando...</p>";

  try {
    const resultado = await PracticaAPI.enviarRespuesta({
      tipo: ejercicioActual.tipo,
      nivel: ejercicioActual.nivel,
      contenido: ejercicioActual.contenido,
      respuestaUsuario,
    });

    const icono = resultado.correcto ? "✓ ¡Correcto!" : "✗ No era esa";
    const explicacion = resultado.explicacion
      ? `<p style="color:var(--gris); margin-top:10px; font-size:14px;">${resultado.explicacion}</p>`
      : "";

    cuerpo.innerHTML = `<h3>${icono}</h3>${explicacion}<button id="btn-siguiente-ejercicio" class="btn-principal" style="margin-top:20px;">Siguiente ejercicio →</button>`;
    document
      .getElementById("btn-siguiente-ejercicio")
      .addEventListener("click", cargarSiguienteEjercicio);
  } catch (err) {
    cuerpo.innerHTML = "<p>Hubo un error revisando tu respuesta.</p>";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btnPracticar = document.getElementById("btn-practicar");
  if (btnPracticar) btnPracticar.addEventListener("click", iniciarPractica);

  const btnSalir = document.getElementById("btn-salir-practica");
  if (btnSalir) {
    btnSalir.addEventListener("click", () => {
      document.getElementById("vista-practica").classList.add("oculto");
      document.getElementById("vista-principal").classList.remove("oculto");
    });
  }
});
