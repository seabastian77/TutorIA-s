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

  // Mismo patrón usado en ConectaProfe: páginas con clase .pagina,
  // solo la que tiene .activa se muestra. La búsqueda queda acotada
  // al contenedor de auth con querySelector, igual que calEl() allá.
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
}

function mostrarPantallaPrincipal(usuario) {
  document.getElementById("vista-auth").classList.add("oculto");
  const principal = document.getElementById("vista-principal");
  principal.classList.remove("oculto");
  document.getElementById("saludo-usuario").textContent =
    `¡Hola, ${usuario.nombre}!`;
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
