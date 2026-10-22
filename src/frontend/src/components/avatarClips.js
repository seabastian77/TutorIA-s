// Videos cortos de Numi moviéndose (reposo, escucha, piensa, habla): si están en assets/numi, el avatar los alterna según el estado

const AvatarClips = (() => {
  const CARPETA = "assets/numi/";
  const CATALOGO = {
    listo: ["reposo.mp4", "reposo-2.mp4"],
    escuchando: ["escucha.mp4", "escucha-2.mp4"],
    pensando: ["piensa.mp4"],
    hablando: ["habla-1.mp4", "habla-2.mp4", "habla-3.mp4", "habla-4.mp4"],
  };
  const FUNDIDO_MS = 380;

  let disponibles = null; // { estado: [nombres] }, se revisa una sola vez por carga de página

  /** Pregunta al servidor qué videos existen; uno que falta devuelve la página y no cuenta como video. */
  async function existe(nombre) {
    try {
      const resp = await fetch(CARPETA + nombre, { method: "HEAD", cache: "no-store" });
      return resp.ok && /^video\//.test(resp.headers.get("content-type") || "");
    } catch (e) {
      return false;
    }
  }

  /** Arma la lista de videos disponibles por estado. */
  async function revisar() {
    if (disponibles) return disponibles;
    const nombres = [...new Set(Object.values(CATALOGO).flat())];
    const hay = await Promise.all(nombres.map(existe));
    const presentes = new Set(nombres.filter((_, i) => hay[i]));
    disponibles = {};
    Object.entries(CATALOGO).forEach(([estado, lista]) => {
      disponibles[estado] = lista.filter((n) => presentes.has(n));
    });
    return disponibles;
  }

  /** Monta los videos dentro del escenario; `alActivar` avisa cuando ya se pueden mostrar en vez de la foto. */
  function montar(contenedor, { alActivar } = {}) {
    let vivo = true;
    let estado = "listo";
    let actual = null;
    let tipoActual = null;
    const videos = {};

    /** Estado cuyos videos se usan: si no hay propios, los de reposo. */
    function tipoDe(nuevo) {
      return disponibles[nuevo] && disponibles[nuevo].length ? nuevo : "listo";
    }

    /** Escoge el video para un estado y evita repetir el último cuando hay varios. */
    function elegir(tipo) {
      const lista = disponibles[tipo];
      const opciones = lista.length > 1 && actual ? lista.filter((n) => videos[n] !== actual) : lista;
      return videos[opciones[Math.floor(Math.random() * opciones.length)]];
    }

    /** Pone un video con fundido sobre el anterior. */
    function poner(nuevo) {
      if (!vivo) return;
      const tipo = tipoDe(nuevo);
      const el = elegir(tipo);
      el.currentTime = 0;
      const promesa = el.play();
      if (promesa && promesa.catch) promesa.catch(() => { /* sin reproducción automática se queda la foto animada */ });
      el.classList.add("visible");
      if (actual && actual !== el) {
        const viejo = actual;
        viejo.classList.remove("visible");
        setTimeout(() => { if (viejo !== actual) viejo.pause(); }, FUNDIDO_MS + 60);
      }
      actual = el;
      tipoActual = tipo;
    }

    /** Cambia de video cuando cambia lo que hace Numi; si sigue igual, deja terminar el que va. */
    function cambiarEstado(nuevo) {
      estado = nuevo;
      if (!actual) return;
      if (tipoDe(nuevo) !== tipoActual) poner(nuevo);
    }

    revisar().then((lista) => {
      if (!vivo || !lista.listo.length || !lista.hablando.length) return;
      Object.values(lista).flat().forEach((nombre) => {
        if (videos[nombre]) return;
        const el = document.createElement("video");
        el.className = "avatar-clip";
        el.src = CARPETA + nombre;
        el.muted = true;
        el.playsInline = true;
        el.setAttribute("playsinline", "");
        el.setAttribute("aria-hidden", "true");
        el.preload = "auto";
        el.addEventListener("ended", () => { if (el === actual) poner(estado); });
        contenedor.appendChild(el);
        videos[nombre] = el;
      });
      const primero = videos[lista.listo[0]];
      primero.addEventListener("loadeddata", () => {
        if (!vivo || actual) return;
        poner(estado);
        contenedor.classList.add("con-clips");
        if (alActivar) alActivar();
      }, { once: true });
    });

    function destruir() {
      vivo = false;
      Object.values(videos).forEach((el) => { el.pause(); el.remove(); });
      contenedor.classList.remove("con-clips");
    }

    return { estado: cambiarEstado, destruir, get activo() { return Boolean(actual); } };
  }

  return { montar, revisar };
})();

if (typeof window !== "undefined") window.AvatarClips = AvatarClips;
