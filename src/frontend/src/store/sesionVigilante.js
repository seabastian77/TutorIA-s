// Vigila las respuestas de la API: si el token venció, cierra la sesión y vuelve al login

(function () {
  const URL_API = window.TUTORIAS_API_URL || "http://localhost:3000/api";
  const RUTAS_ABIERTAS = ["/auth/login", "/auth/registro"];
  const fetchOriginal = window.fetch;
  let yaExpiro = false;

  /** Dice si la petición fue a una ruta de la API que exige estar autenticado. */
  function esRutaProtegida(url) {
    const texto = typeof url === "string" ? url : (url && url.url) || "";
    if (!texto.startsWith(URL_API)) return false;
    return !RUTAS_ABIERTAS.some((ruta) => texto.includes(ruta));
  }

  window.fetch = async function (url, opciones) {
    const respuesta = await fetchOriginal.apply(this, arguments);

    if (respuesta.status === 401 && !yaExpiro && esRutaProtegida(url)) {
      yaExpiro = true;
      sessionStorage.setItem("tutorias_aviso", "Your session expired. Please log in again.");
      Sesion.cerrar();
      location.reload();
    }

    return respuesta;
  };
})();
