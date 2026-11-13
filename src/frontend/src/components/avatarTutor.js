// Avatar animado de Numi: su foto respira, mueve la cabeza, parpadea, cambia de gesto y mueve la boca al ritmo de su voz

const AvatarTutor = (() => {
  const FOTO = "assets/numi.webp";
  const GESTOS = "assets/numi/gestos.webp";
  const PESOS = "assets/numi/pesos.webp";
  const TAM = [1200, 768];
  const ATLAS = [1024, 806];

  // Zonas de la foto que cambian con cada gesto y dónde está cada gesto dentro del atlas
  const ZONA_OJOS = [513, 160, 196, 102];
  const ZONA_BOCA = [523, 266, 185, 171];
  const CELDAS = {
    "ojos/parpado1": [2, 2], "ojos/parpado2": [202, 2], "ojos/parpado3": [402, 2], "ojos/cejas": [602, 2],
    "ojos/piensa": [802, 2], "ojos/izquierda": [2, 108], "ojos/derecha": [202, 108], "ojos/feliz": [402, 108],
    "boca/a1": [602, 108], "boca/a2": [791, 108], "boca/a3": [2, 283], "boca/a4": [191, 283], "boca/a5": [380, 283],
    "boca/o1": [569, 283], "boca/o2": [758, 283], "boca/e1": [2, 458], "boca/e2": [191, 458],
    "boca/sonrisa": [380, 458], "boca/risa": [569, 458], "boca/aprieta": [758, 458],
    "ojos/duda": [2, 633], "boca/duda": [202, 633], "ojos/guino": [391, 633],
  };
  const PIVOTE = [617, 429]; // base del cuello: la cabeza gira alrededor de aquí
  const CARA = [611, 279];
  const FOCO = [611, 292]; // punto de la foto que queda centrado en el escenario

  let contextoAudio = null;
  let recursos = null;

  /** Un solo AudioContext para toda la app; el navegador lo limita y exige crearlo tras un toque. */
  function obtenerContexto() {
    if (!contextoAudio) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      contextoAudio = new C();
    }
    return contextoAudio;
  }

  /** Despierta el audio dentro de un toque del usuario; si no, iPhone y Chrome no dejan sonar nada. */
  async function activarAudio() {
    const c = obtenerContexto();
    if (c && c.state === "suspended") {
      try { await c.resume(); } catch (e) { /* sin audio se sigue con la voz del navegador */ }
    }
    return Boolean(c);
  }

  /** Decodifica un MP3 o WAV en un AudioBuffer listo para sonar o para enviar al proveedor de video. */
  async function decodificar(bytes) {
    const c = obtenerContexto();
    if (!c) throw new Error("Este navegador no reproduce audio con Web Audio");
    return c.decodeAudioData(bytes.slice(0));
  }

  function cargarImagen(src) {
    return new Promise((listo, falla) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => listo(img);
      img.onerror = () => falla(new Error(`No cargó ${src}`));
      img.src = src;
    });
  }

  /** Carga una sola vez la foto, el atlas de gestos y el mapa de pesos, y los comparte entre sesiones. */
  function cargarRecursos() {
    if (!recursos) {
      recursos = Promise.all([FOTO, GESTOS, PESOS].map(cargarImagen));
      recursos.catch(() => { recursos = null; });
    }
    return recursos;
  }

  const azar = (a, b) => a + Math.random() * (b - a);
  const mezclar = (a, b, k) => a + (b - a) * k;

  /** Ruido suave hecho con senos de periodos distintos: se mueve sin que se note un ciclo. */
  function ondas(t, semilla) {
    return Math.sin(t * 0.73 + semilla) * 0.5 + Math.sin(t * 1.31 + semilla * 2.1) * 0.3 + Math.sin(t * 0.37 + semilla * 3.7) * 0.2;
  }

  const VERTICES = "attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }";
  const FRAGMENTOS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uFoto;
uniform sampler2D uGestos;
uniform sampler2D uPesos;
uniform vec2 uTam;
uniform vec2 uAtlas;
uniform vec3 uVista;
uniform float uAlto;
uniform mat3 uCabeza;
uniform float uRespiro;
uniform vec4 uOjos;
uniform vec4 uOjosAB;
uniform float uOjosMezcla;
uniform vec4 uBoca;
uniform vec4 uBocaAB;
uniform float uBocaMezcla;
uniform float uTiempo;
uniform float uGrano;

vec4 parche(vec2 q, vec4 zona, vec2 celda) {
  vec2 l = q - zona.xy;
  if (celda.x < 0.0 || l.x < 0.0 || l.y < 0.0 || l.x > zona.z || l.y > zona.w) return vec4(0.0);
  vec4 c = texture2D(uGestos, (celda + l) / uAtlas);
  return vec4(c.rgb * c.a, c.a);
}

void main() {
  vec2 p = uVista.xy + vec2(gl_FragCoord.x, uAlto - gl_FragCoord.y) * uVista.z;
  vec2 w = texture2D(uPesos, p / uTam).rg;
  vec2 adelante = (uCabeza * vec3(p, 1.0)).xy;
  vec2 q = p - w.r * (adelante - p);
  q.y += w.g * uRespiro;
  vec3 c = texture2D(uFoto, q / uTam).rgb;
  vec4 o = mix(parche(q, uOjos, uOjosAB.xy), parche(q, uOjos, uOjosAB.zw), uOjosMezcla);
  c = c * (1.0 - o.a) + o.rgb;
  vec4 b = mix(parche(q, uBoca, uBocaAB.xy), parche(q, uBoca, uBocaAB.zw), uBocaMezcla);
  c = c * (1.0 - b.a) + b.rgb;
  float n = fract(sin(dot(gl_FragCoord.xy + uTiempo, vec2(12.9898, 78.233))) * 43758.5453);
  gl_FragColor = vec4(c + (n - 0.5) * uGrano, 1.0);
}`;

  /** Pinta con WebGL: deforma la foto según los pesos y pone encima los gestos de ojos y boca. */
  function pintorWebGL(lienzo, [foto, gestos, pesos]) {
    let gl = null;
    try {
      gl = lienzo.getContext("webgl", { alpha: false, antialias: false, premultipliedAlpha: false, powerPreference: "low-power" });
    } catch (e) {
      return null;
    }
    if (!gl) return null;

    const compilar = (tipo, fuente) => {
      const s = gl.createShader(tipo);
      gl.shaderSource(s, fuente);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
      return s;
    };
    const programa = gl.createProgram();
    try {
      gl.attachShader(programa, compilar(gl.VERTEX_SHADER, VERTICES));
      gl.attachShader(programa, compilar(gl.FRAGMENT_SHADER, FRAGMENTOS));
      gl.linkProgram(programa);
      if (!gl.getProgramParameter(programa, gl.LINK_STATUS)) throw new Error("No se enlazó el programa");
    } catch (e) {
      return null;
    }
    gl.useProgram(programa);

    const cuadrado = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cuadrado);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const atributo = gl.getAttribLocation(programa, "a");
    gl.enableVertexAttribArray(atributo);
    gl.vertexAttribPointer(atributo, 2, gl.FLOAT, false, 0, 0);

    const u = {};
    ["uFoto", "uGestos", "uPesos", "uTam", "uAtlas", "uVista", "uAlto", "uCabeza", "uRespiro", "uOjos", "uOjosAB",
      "uOjosMezcla", "uBoca", "uBocaAB", "uBocaMezcla", "uTiempo", "uGrano"].forEach((n) => { u[n] = gl.getUniformLocation(programa, n); });

    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    const texturas = [foto, gestos, pesos].map((img, i) => {
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      return t;
    });
    gl.uniform1i(u.uFoto, 0);
    gl.uniform1i(u.uGestos, 1);
    gl.uniform1i(u.uPesos, 2);
    gl.uniform2f(u.uTam, TAM[0], TAM[1]);
    gl.uniform2f(u.uAtlas, ATLAS[0], ATLAS[1]);
    gl.uniform4f(u.uOjos, ...ZONA_OJOS);
    gl.uniform4f(u.uBoca, ...ZONA_BOCA);

    const celda = (nombre) => (nombre && CELDAS[nombre]) || [-1, -1];

    return {
      pintar(c) {
        gl.viewport(0, 0, lienzo.width, lienzo.height);
        gl.uniform3f(u.uVista, c.vista[0], c.vista[1], c.vista[2]);
        gl.uniform1f(u.uAlto, lienzo.height);
        gl.uniformMatrix3fv(u.uCabeza, false, c.cabeza);
        gl.uniform1f(u.uRespiro, c.respiro);
        gl.uniform4f(u.uOjosAB, ...celda(c.ojos.a), ...celda(c.ojos.b));
        gl.uniform1f(u.uOjosMezcla, c.ojos.mezcla);
        gl.uniform4f(u.uBocaAB, ...celda(c.boca.a), ...celda(c.boca.b));
        gl.uniform1f(u.uBocaMezcla, c.boca.mezcla);
        gl.uniform1f(u.uTiempo, c.tiempo % 1000);
        gl.uniform1f(u.uGrano, c.grano);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      },
      destruir() {
        texturas.forEach((t) => gl.deleteTexture(t));
        gl.deleteBuffer(cuadrado);
        gl.deleteProgram(programa);
      },
    };
  }

  /** Pinta sin WebGL: la foto encuadrada y los gestos encima, sin mover la cabeza. */
  function pintor2D(lienzo, [foto, gestos]) {
    const ctx = lienzo.getContext("2d");
    if (!ctx) return null;
    const ponerGesto = (zona, { a, b, mezcla }) => {
      [[a, 1 - mezcla], [b, mezcla]].forEach(([nombre, alfa]) => {
        if (!nombre || alfa < 0.02) return;
        const [cx, cy] = CELDAS[nombre];
        ctx.globalAlpha = alfa;
        ctx.drawImage(gestos, cx, cy, zona[2], zona[3], zona[0], zona[1], zona[2], zona[3]);
      });
      ctx.globalAlpha = 1;
    };
    return {
      pintar(c) {
        const k = 1 / c.vista[2];
        ctx.setTransform(k, 0, 0, k, -c.vista[0] * k, -c.vista[1] * k);
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(foto, 0, 0);
        ponerGesto(ZONA_OJOS, c.ojos);
        ponerGesto(ZONA_BOCA, c.boca);
      },
      destruir() {},
    };
  }

  /** Fundido corto entre el gesto que se ve y el nuevo; si cambia a mitad, parte del que más se ve. */
  function fundir(f, nombre, ahora, ms) {
    if (nombre === f.b) return;
    const k = f.dura ? Math.min(1, (ahora - f.desde) / f.dura) : 1;
    f.a = k > 0.5 ? f.b : f.a;
    f.b = nombre;
    f.desde = ahora;
    f.dura = ms;
  }

  function estadoFundido(f, ahora) {
    if (f.fija !== undefined) return { a: f.a, b: f.b, mezcla: f.fija };
    return { a: f.a, b: f.b, mezcla: f.dura ? Math.min(1, (ahora - f.desde) / f.dura) : 1 };
  }

  /** Monta el avatar dentro de un contenedor y devuelve los controles de su animación y su voz. */
  function montar(contenedor) {
    contenedor.innerHTML = '<canvas class="avatar-lienzo" role="img" aria-label="Numi, your English tutor"></canvas>';
    let lienzo = contenedor.querySelector("canvas");
    let pintor = null;
    let imagenes = null;
    const calmado = Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const amplitud = calmado ? 0.3 : 1;

    // Valores actuales y a dónde van; cada cuadro se acercan un poco para que nada salte
    const actual = { giro: 0, x: 0, y: 0, acerca: 0, abierta: 0, ancha: 0.5 };
    const objetivo = { ...actual };
    let estado = "listo";
    let animo = "neutro";
    let gesto = null;
    let proximoGesto = performance.now() + azar(1200, 2600);
    let parpadeo = null;
    let proximoParpadeo = performance.now() + azar(1500, 3500);
    let mirada = null;
    let proximaMirada = performance.now() + azar(3500, 6500);
    let cejasHasta = 0;
    let sonrisaHasta = 0;
    let dudaHasta = 0; // al corregir, frunce un momento el ceño y aprieta los labios a un lado
    let guinoHasta = 0; // a veces cierra un ojo después de felicitar
    let proximaSonrisa = performance.now() + azar(4000, 8000);
    const ojos = { a: null, b: null, desde: 0, dura: 0 };
    const boca = { a: null, b: null, desde: 0, dura: 0 };
    let cuadro = 0;
    let vivo = true;
    let ancho = 0;
    let alto = 0;
    let conClips = false; // con videos de Numi la foto animada deja de pintarse

    // Fuente de la boca: audio medido, voz del navegador estimada, o nada
    let analizador = null;
    let datosOnda = null;
    let datosFrecuencia = null;
    let fuenteActual = null;
    let finActual = null;
    let hablaSintetica = null; // { inicio, semilla, energia }
    let nivelSuave = 0;
    let picoVoz = 0.1; // volumen más alto reciente: cada voz abre la boca según su propio rango
    let anchaMedia = null; // timbre promedio de la voz: la boca se estira o se redondea según cuánto se aleje de él

    /** Ajusta el lienzo al tamaño del escenario y a la densidad de la pantalla. */
    function medir() {
      const caja = contenedor.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ancho = Math.max(1, Math.round(caja.width * dpr));
      alto = Math.max(1, Math.round(caja.height * dpr));
      if (lienzo.width !== ancho) lienzo.width = ancho;
      if (lienzo.height !== alto) lienzo.height = alto;
    }
    const observador = typeof ResizeObserver !== "undefined" ? new ResizeObserver(medir) : null;
    if (observador) observador.observe(contenedor);
    else window.addEventListener("resize", medir);
    medir();

    /** Si el navegador pierde WebGL, cambia el lienzo por uno nuevo que pinta en 2D. */
    function pasarA2D(evento) {
      if (evento) evento.preventDefault();
      if (pintor) pintor.destruir();
      const nuevo = document.createElement("canvas");
      nuevo.className = "avatar-lienzo";
      nuevo.setAttribute("role", "img");
      nuevo.setAttribute("aria-label", "Numi, your English tutor");
      lienzo.replaceWith(nuevo);
      lienzo = nuevo;
      lienzo.width = ancho;
      lienzo.height = alto;
      pintor = imagenes ? pintor2D(lienzo, imagenes) : null;
    }

    cargarRecursos()
      .then((imgs) => {
        if (!vivo) return;
        imagenes = imgs;
        pintor = pintorWebGL(lienzo, imgs);
        if (pintor) lienzo.addEventListener("webglcontextlost", pasarA2D, { once: true });
        else pasarA2D();
      })
      .catch(() => { /* sin la foto queda el fondo del escenario */ });

    /** Programa un gesto corto: asentir, ladear la cabeza o girarla un poco. */
    function nuevoGesto(ahora) {
      const opciones = estado === "hablando"
        ? ["asentir", "ladear", "asentir", "girar"]
        : estado === "escuchando" ? ["asentir", "asentir", "ladear"] : ["ladear", "girar"];
      const tipo = opciones[Math.floor(Math.random() * opciones.length)];
      gesto = { tipo, inicio: ahora, dura: tipo === "asentir" ? azar(650, 900) : azar(900, 1400), lado: Math.random() < 0.5 ? -1 : 1 };
      proximoGesto = ahora + (estado === "hablando" ? azar(1300, 2600) : estado === "escuchando" ? azar(1800, 3200) : azar(3500, 6500));
    }

    /** Pose de fondo según el estado: escuchar ladea y se acerca, pensar mira hacia arriba, hablar se mueve más. */
    function poseBase(ahora) {
      const t = ahora / 1000;
      objetivo.x = ondas(t * 0.6, 1) * 1.0 * amplitud;
      objetivo.y = ondas(t * 0.5, 2) * 0.6 * amplitud;
      objetivo.giro = ondas(t * 0.45, 3) * 0.35 * amplitud;
      objetivo.acerca = 0;
      if (estado === "escuchando") {
        objetivo.giro += 0.8 * amplitud;
        objetivo.x -= 0.8 * amplitud;
        objetivo.acerca = 0.6;
      } else if (estado === "pensando") {
        objetivo.giro -= 0.9 * amplitud;
        objetivo.y -= 0.9 * amplitud;
        objetivo.x += 1.1 * amplitud;
      } else if (estado === "hablando") {
        objetivo.giro = ondas(t * 0.8, 4) * 0.55 * amplitud;
        objetivo.x = ondas(t * 0.7, 5) * 1.2 * amplitud;
      }
    }

    /** Suma el gesto en curso encima de la pose, con una curva que sube y baja suave. */
    function aplicarGesto(ahora) {
      if (!gesto) return;
      const k = (ahora - gesto.inicio) / gesto.dura;
      if (k >= 1) { gesto = null; return; }
      const curva = Math.sin(k * Math.PI);
      if (gesto.tipo === "asentir") objetivo.y += Math.sin(k * Math.PI * 2) * 1.6 * amplitud * (k < 0.5 ? 1 : 0.6);
      if (gesto.tipo === "ladear") objetivo.giro += gesto.lado * 0.9 * curva * amplitud;
      if (gesto.tipo === "girar") objetivo.x += gesto.lado * 1.8 * curva * amplitud;
    }

    /** Parpadeos, miradas de reojo, cejas y sonrisas que aparecen solas, como en una persona. */
    function microgestos(ahora) {
      if (!parpadeo && ahora > proximoParpadeo) {
        parpadeo = { inicio: ahora, dura: azar(150, 200) };
        proximoParpadeo = ahora + (Math.random() < 0.18 ? azar(260, 420) : azar(2400, 5600));
      }
      if (!mirada && ahora > proximaMirada && estado !== "pensando" && estado !== "escuchando") {
        const larga = estado === "listo";
        mirada = { lado: Math.random() < 0.5 ? "ojos/izquierda" : "ojos/derecha", hasta: ahora + (larga ? azar(600, 1200) : azar(350, 600)) };
        proximaMirada = ahora + (larga ? azar(4000, 9000) : azar(5000, 10000));
      }
      if (mirada && ahora > mirada.hasta) mirada = null;
      if (estado === "escuchando" && ahora > cejasHasta + 3000 && Math.random() < 0.004) cejasHasta = ahora + azar(450, 700);
      if (estado !== "hablando" && estado !== "pensando" && ahora > proximaSonrisa) {
        sonrisaHasta = ahora + azar(1200, 2200);
        proximaSonrisa = ahora + azar(6000, 12000);
      }
    }

    /** Mide la voz que está sonando: qué tanto abre la boca y si va estirada (i, e) o redonda (o, u). */
    function medirBoca(ahora) {
      if (analizador) {
        analizador.getFloatTimeDomainData(datosOnda);
        const nivel = Labios.nivelDesdeMuestras(datosOnda);
        const salto = nivel - nivelSuave;
        nivelSuave = mezclar(nivelSuave, nivel, 0.2);
        picoVoz = Math.max(nivel, picoVoz * 0.996);
        objetivo.abierta = Labios.aperturaDesdeNivel(nivel, { ruido: 0.012, techo: Math.max(0.06, picoVoz * 0.9) });
        analizador.getByteFrequencyData(datosFrecuencia);
        const ancha = Labios.anchuraDesdeEspectro(datosFrecuencia, contextoAudio.sampleRate, analizador.fftSize);
        if (nivel > 0.02) anchaMedia = anchaMedia === null ? ancha : mezclar(anchaMedia, ancha, 0.03);
        objetivo.ancha = Math.max(0, Math.min(1, 0.5 + (ancha - (anchaMedia === null ? ancha : anchaMedia)) * 2.5));
        // Un golpe de voz fuerte se acompaña con la cabeza o las cejas, como al enfatizar
        if (salto > 0.06 && !gesto && Math.random() < 0.3) gesto = { tipo: "asentir", inicio: ahora, dura: 600, lado: 1 };
        if (animo === "pregunta" && salto > 0.08 && ahora > cejasHasta + 1500 && Math.random() < 0.3) cejasHasta = ahora + azar(500, 800);
        return;
      }
      if (hablaSintetica) {
        const ms = ahora - hablaSintetica.inicio;
        const energia = Math.max(0.55, hablaSintetica.energia);
        objetivo.abierta = Labios.aperturaSintetica(ms, hablaSintetica.semilla) * energia;
        objetivo.ancha = 0.5 + 0.35 * Math.sin((ms / 190) * 1.7 + hablaSintetica.semilla);
        hablaSintetica.energia = mezclar(hablaSintetica.energia, 0.75, 0.02);
        return;
      }
      objetivo.abierta = 0;
      objetivo.ancha = 0.5;
    }

    /** Los ojos de este cuadro: el parpadeo va encima de todo y después lo que pide el estado o el ánimo. */
    function elegirOjos(ahora) {
      if (parpadeo) {
        const k = (ahora - parpadeo.inicio) / parpadeo.dura;
        if (k >= 1) {
          parpadeo = null;
        } else {
          const cierre = k < 0.4 ? k / 0.4 : k < 0.55 ? 1 : (1 - k) / 0.45;
          const nombre = cierre > 0.78 ? "ojos/parpado3" : cierre > 0.5 ? "ojos/parpado2" : cierre > 0.2 ? "ojos/parpado1" : null;
          fundir(ojos, nombre, ahora, 22);
          return;
        }
      }
      let nombre = null;
      if (estado === "pensando") nombre = "ojos/piensa";
      else if (ahora < guinoHasta) nombre = "ojos/guino";
      else if (ahora < dudaHasta) nombre = "ojos/duda";
      else if (mirada) nombre = mirada.lado;
      else if (ahora < cejasHasta) nombre = "ojos/cejas";
      else if ((animo === "feliz" && estado === "hablando") || ahora < sonrisaHasta) nombre = "ojos/feliz";
      fundir(ojos, nombre, ahora, 260);
    }

    /** La boca cerrada según el estado y el ánimo: apretada al pensar, de lado al corregir, sonriente al felicitar. */
    function bocaCerrada(ahora) {
      if (estado === "pensando") return "boca/aprieta";
      if (ahora < dudaHasta) return "boca/duda";
      if ((animo === "feliz" && estado === "hablando") || ahora < sonrisaHasta) return "boca/sonrisa";
      return null;
    }

    /**
     * La boca de este cuadro. Al hablar se mezclan dos aperturas vecinas de la misma foto según el volumen,
     * así la boca se abre y se cierra de corrido; callada, cambia de gesto con un fundido lento.
     */
    function elegirBoca(ahora) {
      const a = actual.abierta;
      if (estado === "hablando" && a >= 0.05) {
        const nivel = Math.min(3.6, a * 4.2);
        const piso = Math.floor(nivel);
        boca.a = piso ? `boca/a${piso}` : bocaCerrada(ahora);
        boca.b = `boca/a${piso + 1}`;
        boca.fija = nivel - piso;
        return;
      }
      if (boca.fija !== undefined) {
        // Al callarse sigue desde la apertura que se veía, sin saltos
        boca.b = boca.fija > 0.5 ? boca.b : boca.a;
        boca.fija = undefined;
        boca.dura = 0;
      }
      fundir(boca, bocaCerrada(ahora), ahora, 140);
    }

    /** Matriz de la cabeza: gira en el cuello, se corre y se acerca un poco hacia la cámara. */
    function matrizCabeza() {
      const th = (actual.giro * Math.PI) / 180;
      const s = 1 + actual.acerca * 0.012;
      const cos = Math.cos(th);
      const sin = Math.sin(th);
      const rx = cos * PIVOTE[0] - sin * PIVOTE[1];
      const ry = sin * PIVOTE[0] + cos * PIVOTE[1];
      const tx = CARA[0] + s * (-rx + PIVOTE[0] + actual.x - CARA[0]);
      const ty = CARA[1] + s * (-ry + PIVOTE[1] + actual.y - CARA[1]);
      return [s * cos, s * sin, 0, -s * sin, s * cos, 0, tx, ty, 1];
    }

    /** Encuadre de la foto: cubre el escenario con la cara centrada y un leve acercamiento. */
    function vista() {
      const k = Math.max(ancho / TAM[0], alto / TAM[1]) * 1.04;
      const ox = Math.min(TAM[0] - ancho / k, Math.max(0, FOCO[0] - ancho / 2 / k));
      const oy = Math.min(TAM[1] - alto / k, Math.max(0, FOCO[1] - (alto * 0.44) / k));
      return [ox, oy, 1 / k];
    }

    /** Cuadro de animación: decide pose y gestos, mide la voz, suaviza y pinta. */
    function cuadroAnimacion(ahora) {
      if (!vivo) return;
      poseBase(ahora);
      if (ahora > proximoGesto && !gesto) nuevoGesto(ahora);
      aplicarGesto(ahora);
      microgestos(ahora);
      medirBoca(ahora);

      actual.abierta = Labios.suavizar(actual.abierta, objetivo.abierta, 0.6, 0.3);
      actual.ancha = mezclar(actual.ancha, objetivo.ancha, 0.25);
      ["giro", "x", "y", "acerca"].forEach((k) => { actual[k] = mezclar(actual[k], objetivo[k], 0.07); });
      elegirOjos(ahora);
      elegirBoca(ahora);

      if (pintor && !conClips && contenedor.offsetParent !== null) {
        pintor.pintar({
          vista: vista(),
          cabeza: matrizCabeza(),
          respiro: (0.5 - 0.5 * Math.cos(((ahora / 1000) * Math.PI * 2) / 4.6)) * 1.2 * amplitud,
          ojos: estadoFundido(ojos, ahora),
          boca: estadoFundido(boca, ahora),
          tiempo: ahora / 1000,
          grano: 0.012,
        });
      }
      cuadro = requestAnimationFrame(cuadroAnimacion);
    }

    /** Detiene la voz que esté sonando y deja la boca en reposo. */
    function callar() {
      if (fuenteActual) {
        try { fuenteActual.onended = null; fuenteActual.stop(); } catch (e) { /* ya había terminado */ }
      }
      fuenteActual = null;
      analizador = null;
      hablaSintetica = null;
      if (finActual) { const fin = finActual; finActual = null; fin(false); }
    }

    /** Reproduce un audio decodificado y mueve la boca midiéndolo; resuelve al terminar. */
    function reproducir(buffer) {
      callar();
      const c = obtenerContexto();
      const fuente = c.createBufferSource();
      fuente.buffer = buffer;
      const an = c.createAnalyser();
      an.fftSize = 1024;
      an.smoothingTimeConstant = 0.3;
      fuente.connect(an);
      an.connect(c.destination);
      datosOnda = new Float32Array(an.fftSize);
      datosFrecuencia = new Uint8Array(an.frequencyBinCount);
      picoVoz = 0.1;
      anchaMedia = null;
      analizador = an;
      fuenteActual = fuente;
      return new Promise((listo) => {
        finActual = listo;
        fuente.onended = () => {
          if (fuenteActual !== fuente) return;
          fuenteActual = null;
          analizador = null;
          finActual = null;
          listo(true);
        };
        fuente.start();
      });
    }

    /** Mueve la boca sin audio medible (voz del navegador): ritmo de sílabas hasta que se diga basta. */
    function empezarHablaSintetica() {
      analizador = null;
      hablaSintetica = { inicio: performance.now(), semilla: Math.random() * 10, energia: 1 };
    }

    /** Cada palabra que anuncia el navegador da un pequeño impulso a la boca. */
    function pulsoPalabra() {
      if (hablaSintetica) hablaSintetica.energia = 1;
    }

    function terminarHablaSintetica() {
      hablaSintetica = null;
    }

    /** El tono de lo que va a decir cambia sus gestos: felicita sonriendo, corrige dudando y pregunta alzando las cejas. */
    function ponerAnimo(texto) {
      animo = Labios.tonoDeFrase(texto);
      dudaHasta = animo === "corrige" ? performance.now() + 1600 : 0;
    }

    /** Cambia el estado visible: listo, escuchando, pensando o hablando. */
    function cambiarEstado(nuevo) {
      if (estado === nuevo) return;
      if (estado === "hablando" && animo === "feliz") {
        sonrisaHasta = performance.now() + azar(1200, 1800);
        if (Math.random() < 0.5) guinoHasta = performance.now() + 450;
      }
      if (nuevo !== "hablando") animo = "neutro";
      estado = nuevo;
      gesto = null;
      proximoGesto = performance.now() + azar(400, 1200);
      lienzo.dataset.estado = nuevo;
      if (clips) clips.estado(nuevo);
    }

    function destruir() {
      vivo = false;
      cancelAnimationFrame(cuadro);
      callar();
      if (pintor) pintor.destruir();
      if (clips) clips.destruir();
      if (observador) observador.disconnect();
      else window.removeEventListener("resize", medir);
    }

    const clips = window.AvatarClips ? AvatarClips.montar(contenedor, { alActivar: () => { conClips = true; } }) : null;
    cuadro = requestAnimationFrame(cuadroAnimacion);

    return {
      estado: cambiarEstado,
      animo: ponerAnimo,
      reproducir,
      empezarHablaSintetica,
      pulsoPalabra,
      terminarHablaSintetica,
      callar,
      destruir,
      get hablandoConAudio() { return Boolean(fuenteActual); },
    };
  }

  return { montar, activarAudio, decodificar };
})();

if (typeof window !== "undefined") window.AvatarTutor = AvatarTutor;
