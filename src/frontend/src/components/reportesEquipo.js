// Lista para el equipo de los ejercicios que los estudiantes reportaron como mal hechos

const NOMBRE_MODULO_REPORTE = {
  practica: "Daily Practice",
  lectura: "Library",
  dictado: "Dictation",
  comprension: "Listening",
  visual: "Describe a photo",
  escena: "Scene Mode",
  roleplay: "Real Situations",
};

let estadoReportes = "nuevo";

/** Pide los reportes del estado elegido y los pinta; solo funciona para cuentas del equipo. */
async function cargarReportes(estado = estadoReportes) {
  estadoReportes = estado;
  const lista = document.getElementById("reportes-lista");
  const aviso = document.getElementById("reportes-estado");
  if (!lista) return;
  document.querySelectorAll("#metricas-reportes .filtro").forEach((b) => {
    const activo = b.dataset.estado === estado;
    b.classList.toggle("activo", activo);
    b.setAttribute("aria-pressed", String(activo));
  });
  aviso.textContent = "Loading the reports…";
  try {
    const datos = await ReportesAPI.listar(estado);
    document.getElementById("reportes-nuevos").textContent = datos.nuevos;
    document.getElementById("reportes-revisados").textContent = datos.revisados;
    pintarReportes(datos.reportes);
    aviso.textContent = datos.reportes.length ? "" : estado === "nuevo" ? "No new reports. Nice!" : "No reviewed reports yet.";
  } catch (err) {
    lista.innerHTML = "";
    aviso.textContent = err.message || "Could not load the reports.";
  }
}

/** Cada reporte muestra el módulo, el motivo, el comentario y el ejercicio tal como lo vio el estudiante. */
function pintarReportes(reportes) {
  const lista = document.getElementById("reportes-lista");
  const motivos = Object.fromEntries((typeof ReporteEjercicio !== "undefined" ? ReporteEjercicio.MOTIVOS : []));
  lista.innerHTML = "";
  reportes.forEach((r) => {
    const item = document.createElement("article");
    item.className = "reporte-item";

    const cabeza = document.createElement("p");
    cabeza.className = "reporte-item-cabeza";
    const modulo = document.createElement("strong");
    modulo.textContent = NOMBRE_MODULO_REPORTE[r.modulo] || r.modulo;
    const motivo = document.createElement("span");
    motivo.textContent = motivos[r.motivo] || r.motivo;
    const fecha = document.createElement("time");
    fecha.dateTime = r.fecha;
    fecha.textContent = new Date(r.fecha).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    cabeza.append(modulo, motivo, fecha);
    item.appendChild(cabeza);

    if (r.comentario) {
      const comentario = document.createElement("blockquote");
      comentario.className = "reporte-item-comentario";
      comentario.textContent = r.comentario;
      item.appendChild(comentario);
    }

    const detalle = document.createElement("details");
    const resumen = document.createElement("summary");
    resumen.textContent = "See the exercise";
    const contenido = document.createElement("pre");
    contenido.textContent = JSON.stringify(r.contenido, null, 2);
    detalle.append(resumen, contenido);
    item.appendChild(detalle);

    if (r.estado === "nuevo") {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "btn-secundario";
      boton.textContent = "Mark as reviewed";
      boton.addEventListener("click", async () => {
        boton.disabled = true;
        try {
          await ReportesAPI.marcarRevisado(r.id);
          cargarReportes();
        } catch (err) {
          boton.disabled = false;
          boton.textContent = "Try again";
        }
      });
      item.appendChild(boton);
    }
    lista.appendChild(item);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("#metricas-reportes .filtro").forEach((b) => {
    b.addEventListener("click", () => cargarReportes(b.dataset.estado));
  });
});
