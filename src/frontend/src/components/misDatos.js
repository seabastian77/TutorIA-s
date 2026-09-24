// "Tus datos": descargar lo que la app guarda de ti y borrar la cuenta (Ley 1581 de 2012)

let cuentaActual = null;

/** Muestra un aviso dentro de la tarjeta que corresponda, con el tono que toque. */
function avisoDatos(id, mensaje, tipo) {
  const caja = document.getElementById(id);
  caja.textContent = mensaje;
  caja.className = tipo === "exito" ? "mensaje-exito" : "mensaje-error visible";
  caja.hidden = !mensaje;
}

/** Abre la pantalla y ajusta el formulario según la persona entre con clave o con Google. */
async function abrirMisDatos() {
  // Primero se cierra el módulo abierto con su propia salida: apaga micrófono, voz y relojes
  if (typeof irAlInicio === "function") irAlInicio();
  // Si el módulo pidió confirmar la salida y la persona dijo que no, se queda donde estaba
  if ([...document.querySelectorAll(".pantalla-principal")].some((v) => v.id !== "vista-principal" && !v.classList.contains("oculto"))) return;
  document.querySelectorAll(".pantalla-principal").forEach((v) => v.classList.add("oculto"));
  document.getElementById("vista-datos").classList.remove("oculto");
  document.getElementById("form-borrar").reset();
  avisoDatos("datos-aviso-descarga", "");
  avisoDatos("datos-aviso-borrar", "");

  try {
    cuentaActual = await MisDatosAPI.cuenta();
    document.getElementById("datos-correo-cuenta").textContent = cuentaActual.correo;
    document.getElementById("campo-borrar-clave").hidden = !cuentaActual.tieneContrasena;
    document.getElementById("borrar-contrasena").required = cuentaActual.tieneContrasena;
    document.getElementById("nota-google").hidden = cuentaActual.tieneContrasena;
  } catch (err) {
    avisoDatos("datos-aviso-borrar", err.message);
  }
}

/** Baja un archivo JSON con todo lo que la app guarda de la persona. */
async function descargarMisDatos(boton) {
  boton.disabled = true;
  avisoDatos("datos-aviso-descarga", "");
  try {
    const datos = await MisDatosAPI.exportar();
    const archivo = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(archivo);
    enlace.download = `tutorias-mis-datos-${datos.exportadoEl.slice(0, 10)}.json`;
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
    avisoDatos("datos-aviso-descarga", "Listo: el archivo quedó en tus descargas.", "exito");
  } catch (err) {
    avisoDatos("datos-aviso-descarga", err.message);
  } finally {
    boton.disabled = false;
  }
}

/** Borra la cuenta, cierra la sesión y vuelve a la entrada con un aviso de despedida. */
async function borrarMiCuenta(e) {
  e.preventDefault();
  const boton = document.getElementById("btn-borrar-cuenta");
  const correo = document.getElementById("borrar-correo").value;
  const contrasena = document.getElementById("borrar-contrasena").value;

  if (cuentaActual && correo.trim().toLowerCase() !== cuentaActual.correo.toLowerCase()) {
    avisoDatos("datos-aviso-borrar", "El correo no coincide con el de tu cuenta.");
    return;
  }

  boton.disabled = true;
  avisoDatos("datos-aviso-borrar", "");
  try {
    await MisDatosAPI.borrar({ correo, contrasena });
    Sesion.cerrar();
    try {
      sessionStorage.setItem("tutorias_despedida", "Tu cuenta y todos tus datos quedaron borrados.");
    } catch (err) {
      // Sin almacenamiento, la entrada simplemente no muestra la despedida
    }
    location.reload();
  } catch (err) {
    avisoDatos("datos-aviso-borrar", err.message);
    boton.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const opcion = document.getElementById("btn-menu-datos");
  if (!opcion) return;

  opcion.addEventListener("click", () => {
    document.getElementById("menu-cuenta").classList.add("oculto");
    document.getElementById("btn-cuenta").setAttribute("aria-expanded", "false");
    abrirMisDatos();
  });
  document.getElementById("btn-descargar-datos").addEventListener("click", (e) => descargarMisDatos(e.currentTarget));
  document.getElementById("form-borrar").addEventListener("submit", borrarMiCuenta);
  document.getElementById("btn-salir-datos").addEventListener("click", () => {
    document.getElementById("vista-datos").classList.add("oculto");
    document.getElementById("vista-principal").classList.remove("oculto");
  });
});

window.abrirMisDatos = abrirMisDatos;
