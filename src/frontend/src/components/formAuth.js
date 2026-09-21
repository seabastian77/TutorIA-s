function inicializarFormAuth() {
  const tabLogin = document.getElementById("tab-login");
  const tabRegistro = document.getElementById("tab-registro");
  const formLogin = document.getElementById("form-login");
  const formRegistro = document.getElementById("form-registro");
  const errorBox = document.getElementById("mensaje-error");
  const contenedorAuth = document.querySelector(".tarjeta-auth");

  function mostrarError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.add("visible");
  }

  function limpiarError() {
    errorBox.textContent = "";
    errorBox.classList.remove("visible");
  }

  // Solo la página con clase .activa se muestra
  function cambiarPestana(id) {
    limpiarError();

    contenedorAuth.querySelectorAll(".pagina").forEach((pagina) => {
      pagina.classList.remove("activa");
    });
    contenedorAuth.querySelector(`#${id}`).classList.add("activa");

    tabLogin.classList.toggle("activa", id === "pagina-login");
    tabRegistro.classList.toggle("activa", id === "pagina-registro");
  }

  tabLogin.addEventListener("click", () => cambiarPestana("pagina-login"));
  tabRegistro.addEventListener("click", () =>
    cambiarPestana("pagina-registro"),
  );

  // El vigilante deja aquí el motivo cuando la sesión venció a mitad de camino
  const aviso = sessionStorage.getItem("tutorias_aviso");
  if (aviso) {
    sessionStorage.removeItem("tutorias_aviso");
    mostrarError(aviso);
  }

  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    limpiarError();

    const correo = document.getElementById("login-correo").value.trim();
    const contrasena = document.getElementById("login-contrasena").value;
    const boton = formLogin.querySelector('button[type="submit"]');

    if (!Validaciones.correoValido(correo)) {
      return mostrarError("Ingresa un correo válido");
    }

    boton.disabled = true;
    boton.textContent = "Ingresando...";

    try {
      const datos = await AuthAPI.login({ correo, contrasena });
      Sesion.guardar(datos);
      mostrarPantallaPrincipal(datos.usuario);
    } catch (err) {
      mostrarError(err.message);
    } finally {
      boton.disabled = false;
      boton.textContent = "Ingresar";
    }
  });

  formRegistro.addEventListener("submit", async (e) => {
    e.preventDefault();
    limpiarError();

    const nombre = document.getElementById("registro-nombre").value.trim();
    const correo = document.getElementById("registro-correo").value.trim();
    const contrasena = document.getElementById("registro-contrasena").value;
    const boton = formRegistro.querySelector('button[type="submit"]');

    if (!nombre) return mostrarError("Ingresa tu nombre");
    if (!Validaciones.correoValido(correo))
      return mostrarError("Ingresa un correo válido");
    if (!Validaciones.contrasenaValida(contrasena)) {
      return mostrarError("La contraseña debe tener al menos 6 caracteres");
    }

    boton.disabled = true;
    boton.textContent = "Creando cuenta...";

    try {
      const datos = await AuthAPI.registrar({ nombre, correo, contrasena });
      Sesion.guardar(datos);
      mostrarPantallaPrincipal(datos.usuario);
    } catch (err) {
      mostrarError(err.message);
    } finally {
      boton.disabled = false;
      boton.textContent = "Crear cuenta";
    }
  });

  /* ─────────── recuperar la contraseña ─────────── */

  const formOlvide = document.getElementById("form-olvide");
  const formRestablecer = document.getElementById("form-restablecer");
  const avisoOlvide = document.getElementById("olvide-aviso");
  const avisoRestablecer = document.getElementById("restablecer-aviso");

  document.getElementById("btn-olvide").addEventListener("click", () => {
    avisoOlvide.classList.add("oculto");
    formOlvide.classList.remove("oculto");
    document.getElementById("olvide-correo").value =
      document.getElementById("login-correo").value.trim();
    cambiarPestana("pagina-olvide");
    document.getElementById("olvide-correo").focus();
  });

  document.getElementById("btn-volver-login").addEventListener("click", () =>
    cambiarPestana("pagina-login"),
  );

  document.getElementById("btn-cancelar-restablecer").addEventListener("click", () => {
    limpiarEnlaceDeLaUrl();
    cambiarPestana("pagina-login");
  });

  formOlvide.addEventListener("submit", async (e) => {
    e.preventDefault();
    limpiarError();

    const correo = document.getElementById("olvide-correo").value.trim();
    const boton = formOlvide.querySelector('button[type="submit"]');
    if (!Validaciones.correoValido(correo)) return mostrarError("Ingresa un correo válido");

    boton.disabled = true;
    boton.textContent = "Enviando...";

    try {
      const { mensaje } = await AuthAPI.pedirEnlace(correo);
      // La respuesta es la misma exista o no la cuenta, a propósito
      avisoOlvide.textContent = mensaje;
      avisoOlvide.classList.remove("oculto");
      formOlvide.classList.add("oculto");
    } catch (err) {
      mostrarError(err.message);
    } finally {
      boton.disabled = false;
      boton.textContent = "Enviar el enlace";
    }
  });

  formRestablecer.addEventListener("submit", async (e) => {
    e.preventDefault();
    limpiarError();

    const contrasena = document.getElementById("restablecer-contrasena").value;
    const repetida = document.getElementById("restablecer-repetir").value;
    const boton = formRestablecer.querySelector('button[type="submit"]');

    if (!Validaciones.contrasenaValida(contrasena)) {
      return mostrarError("La contraseña debe tener al menos 6 caracteres");
    }
    if (contrasena !== repetida) return mostrarError("Las dos contraseñas no coinciden");

    boton.disabled = true;
    boton.textContent = "Guardando...";

    try {
      const { mensaje } = await AuthAPI.restablecer({ token: tokenDelEnlace(), contrasena });
      avisoRestablecer.textContent = mensaje;
      avisoRestablecer.classList.remove("oculto");
      formRestablecer.classList.add("oculto");
      limpiarEnlaceDeLaUrl();
    } catch (err) {
      mostrarError(err.message);
    } finally {
      boton.disabled = false;
      boton.textContent = "Guardar mi contraseña";
    }
  });

  // Si llegó por el enlace del correo, se abre directo la pantalla de clave nueva
  if (tokenDelEnlace()) {
    Sesion.cerrar(); // cambiar la clave no puede dejarlo dentro con la sesión vieja
    cambiarPestana("pagina-restablecer");
    document.getElementById("restablecer-contrasena").focus();
  }
}

/** Saca el token de la dirección, sin creerle nada de lo que traiga. */
function tokenDelEnlace() {
  try {
    const valor = new URLSearchParams(location.search).get("recuperar");
    return /^[0-9a-f]{64}$/.test(valor || "") ? valor : null;
  } catch (e) {
    return null;
  }
}

/** Borra el token de la barra de direcciones para que no quede en el historial. */
function limpiarEnlaceDeLaUrl() {
  try {
    history.replaceState(null, "", location.pathname);
  } catch (e) {
    // Si el navegador no deja, el token vence en una hora de todos modos
  }
}

function mostrarPantallaPrincipal(usuario) {
  document.getElementById("vista-auth").classList.add("oculto");
  const principal = document.getElementById("vista-principal");
  principal.classList.remove("oculto");
  document.getElementById("saludo-usuario").textContent =
    `Hi, ${usuario.nombre}!`;
}

document.addEventListener("DOMContentLoaded", () => {
  inicializarFormAuth();

  // Si ya hay sesión guardada, saltar directo a la pantalla principal
  if (Sesion.estaAutenticado()) {
    mostrarPantallaPrincipal(Sesion.obtenerUsuario());
  }

  document.getElementById("btn-cerrar-sesion").addEventListener("click", () => {
    Sesion.cerrar();
    location.reload();
  });
});
