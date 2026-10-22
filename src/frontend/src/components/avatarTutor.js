// Avatar animado de Numi: usa sus videos si existen y, si no, anima su retrato (parpadeo, cabeza y boca al ritmo de su voz)

const AvatarTutor = (() => {
  const RETRATO = "assets/numi.webp";
  const LADO = 1024; // el retrato es cuadrado

  // Puntos del retrato medidos sobre la imagen: borde de los dientes de arriba, ojos y punto de giro del cuello
  const LINEA_BOCA = [
    [426, 436], [432, 439], [438, 442], [444, 444], [450, 448], [456, 452], [462, 454], [470, 455], [480, 456], [490, 455],
    [498, 454], [504, 449], [510, 447], [516, 444], [522, 442], [528, 439], [534, 434], [540, 428], [548, 422], [556, 416],
  ];
  const BOCA = { izquierda: 426, derecha: 556, fondo: 600, maxima: 15 };
  const OJOS = [
    { cx: 416, cy: 343, rx: 33, ry: 20, giro: -4, piel: [176, 112, 94] },
    { cx: 551, cy: 322, rx: 37, ry: 20, giro: -8, piel: [214, 148, 120] },
  ];
  const PIVOTE = { x: 490, y: 720 };
  const FOCO = { x: 490, y: 400 }; // la cara queda centrada en cualquier tamaño de pantalla

  let contextoAudio = null;
  let retrato = null;

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

  /** Carga el retrato una sola vez y lo comparte entre sesiones. */
  function cargarRetrato() {
    if (!retrato) {
      retrato = new Image();
      retrato.decoding = "async";
      retrato.src = RETRATO;
    }
    return retrato;
  }

  const azar = (a, b) => a + Math.random() * (b - a);
  const mezclar = (a, b, k) => a + (b - a) * k;

  /** Altura del borde de los dientes en una columna del retrato. */
  function lineaBoca(x) {
    const p = LINEA_BOCA;
    if (x <= p[0][0]) return p[0][1];
    for (let i = 1; i < p.length; i += 1) {
      if (x <= p[i][0]) {
        const k = (x - p[i - 1][0]) / (p[i][0] - p[i - 1][0]);
        return p[i - 1][1] + (p[i][1] - p[i - 1][1]) * k;
      }
    }
    return p[p.length - 1][1];
  }

  /** Cuánto baja la mandíbula en cada columna: todo en el centro y nada en las comisuras. */
  function perfilMandibula(x) {
    const t = (x - BOCA.izquierda) / (BOCA.derecha - BOCA.izquierda);
    return t <= 0 || t >= 1 ? 0 : Math.pow(Math.sin(t * Math.PI), 1.3);
  }

  /** Monta el avatar dentro de un contenedor y devuelve los controles de su animación y su voz. */
  function montar(contenedor) {
    contenedor.innerHTML = '<canvas class="avatar-lienzo" role="img" aria-label="Numi, tu tutora de inglés"></canvas>';
    const lienzo = contenedor.querySelector("canvas");
    const ctx = lienzo.getContext("2d");
    const img = cargarRetrato();

    // Valores actuales y a dónde van; cada cuadro se acercan un poco para que nada salte
    const actual = { giro: 0, x: 0, y: 0, abierta: 0, acerca: 0 };
    const objetivo = { ...actual };
    let estado = "listo";
    let parpadeo = 1;
    let proximoParpadeo = performance.now() + azar(1500, 3500);
    let parpadeando = 0;
    let proximoGesto = performance.now() + azar(1200, 2600);
    let gesto = null;
    let cuadro = 0;
    let vivo = true;
    let ancho = 0;
    let alto = 0;
    let conClips = false; // con videos de Numi la foto animada deja de pintarse

    // Fuente de la boca: audio medido, voz del navegador estimada, o nada
    let analizador = null;
    let datosOnda = null;
    let fuenteActual = null;
    let finActual = null;
    let hablaSintetica = null; // { inicio, semilla, energia }
    let nivelSuave = 0;

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

    /** Programa un gesto corto: asentir, ladear la cabeza o acercarse un poco a la cámara. */
    function nuevoGesto(ahora) {
      const opciones = estado === "hablando"
        ? ["asentir", "ladear", "acercar", "asentir", "girar"]
        : estado === "escuchando" ? ["asentir", "ladear"] : ["ladear", "girar"];
      const tipo = opciones[Math.floor(Math.random() * opciones.length)];
      gesto = { tipo, inicio: ahora, dura: azar(700, 1200), lado: Math.random() < 0.5 ? -1 : 1 };
      proximoGesto = ahora + (estado === "hablando" ? azar(1000, 2200) : azar(2000, 4500));
    }

    /** Decide la pose de fondo según el estado: escuchar inclina, pensar ladea, hablar se mueve más. */
    function poseBase(ahora) {
      const t = ahora / 1000;
      objetivo.x = Math.sin(t * 0.6) * 3;
      objetivo.y = Math.sin(t * 0.9) * 2;
      objetivo.giro = Math.sin(t * 0.45) * 0.6;
      objetivo.acerca = 0;
      if (estado === "escuchando") {
        objetivo.giro = 1.6 + Math.sin(t * 0.8) * 0.4;
        objetivo.acerca = 0.5;
      } else if (estado === "pensando") {
        objetivo.giro = -1.8;
        objetivo.y = -4;
        objetivo.x = 6;
      } else if (estado === "hablando") {
        objetivo.giro = Math.sin(t * 1.3) * 1.1;
        objetivo.x = Math.sin(t * 0.9) * 5;
      }
    }

    /** Suma el gesto en curso encima de la pose, con una curva que sube y baja suave. */
    function aplicarGesto(ahora) {
      if (!gesto) return;
      const k = (ahora - gesto.inicio) / gesto.dura;
      if (k >= 1) { gesto = null; return; }
      const curva = Math.sin(k * Math.PI);
      if (gesto.tipo === "asentir") objetivo.y += Math.sin(k * Math.PI * 2) * 7;
      if (gesto.tipo === "ladear") objetivo.giro += gesto.lado * 2.2 * curva;
      if (gesto.tipo === "girar") objetivo.x += gesto.lado * 9 * curva;
      if (gesto.tipo === "acercar") objetivo.acerca += 1 * curva;
    }

    /** Mide la voz que está sonando y la traduce en qué tanto abre la boca. */
    function medirBoca(ahora) {
      if (analizador) {
        analizador.getFloatTimeDomainData(datosOnda);
        const nivel = Labios.nivelDesdeMuestras(datosOnda);
        const salto = nivel - nivelSuave;
        nivelSuave = mezclar(nivelSuave, nivel, 0.2);
        objetivo.abierta = Labios.aperturaDesdeNivel(nivel);
        // Un golpe de voz fuerte se acompaña con la cabeza, como al enfatizar
        if (salto > 0.06 && !gesto && Math.random() < 0.3) gesto = { tipo: "asentir", inicio: ahora, dura: 600, lado: 1 };
        return;
      }
      if (hablaSintetica) {
        const ms = ahora - hablaSintetica.inicio;
        const energia = Math.max(0.55, hablaSintetica.energia);
        objetivo.abierta = Labios.aperturaSintetica(ms, hablaSintetica.semilla) * energia;
        hablaSintetica.energia = mezclar(hablaSintetica.energia, 0.75, 0.02);
        return;
      }
      objetivo.abierta = 0;
    }

    /** Pinta la boca abierta: el hueco oscuro detrás y la mandíbula bajada por columnas. */
    function pintarBoca(abierta) {
      const baja = abierta * BOCA.maxima;
      if (baja < 0.4) return;
      const desde = BOCA.izquierda;
      const hasta = BOCA.derecha;
      const centro = (desde + hasta) / 2;

      ctx.beginPath();
      for (let x = desde; x <= hasta; x += 2) ctx.lineTo(x, lineaBoca(x) - perfilMandibula(x));
      for (let x = hasta; x >= desde; x -= 2) ctx.lineTo(x, lineaBoca(x) + (baja + 1) * perfilMandibula(x));
      ctx.closePath();
      ctx.fillStyle = "#4a1a20";
      ctx.fill();

      ctx.save();
      ctx.globalAlpha = Math.min(1, abierta * 1.4);
      ctx.fillStyle = "#b34a52";
      ctx.beginPath();
      ctx.ellipse(centro, lineaBoca(centro) + baja * 0.92, 30, Math.max(1, baja * 0.38), -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Cada columna de la cara bajo los dientes se corre hacia abajo y se comprime hasta el cuello
      for (let x = desde; x < hasta; x += 2) {
        const d = baja * perfilMandibula(x);
        if (d < 0.25) continue;
        const y0 = lineaBoca(x);
        const h = BOCA.fondo - y0;
        ctx.drawImage(img, x, y0, 3, h, x, y0 + d, 3, h - d);
      }
    }

    /** Pinta el parpadeo: la piel de debajo del ojo sube como párpado y deja la línea de pestañas al borde. */
    function pintarOjos(cerrado) {
      if (cerrado < 0.04) return;
      OJOS.forEach((o) => {
        const giro = (o.giro * Math.PI) / 180;
        const borde = -o.ry - 2 + cerrado * (o.ry * 2 + 5);
        const curva = 7 * cerrado;
        ctx.save();
        ctx.translate(o.cx, o.cy);
        ctx.rotate(giro);
        ctx.beginPath();
        ctx.ellipse(0, 0, o.rx + 0.5, o.ry + 1, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.beginPath();
        ctx.moveTo(-o.rx - 4, -o.ry - 8);
        ctx.lineTo(o.rx + 4, -o.ry - 8);
        ctx.lineTo(o.rx + 4, borde - curva);
        ctx.quadraticCurveTo(0, borde + curva, -o.rx - 4, borde - curva);
        ctx.closePath();
        ctx.clip();
        ctx.rotate(-giro);
        ctx.translate(-o.cx, -o.cy);
        const alto = o.ry * 2 + 10;
        ctx.drawImage(img, o.cx - o.rx - 6, o.cy + o.ry + 3, o.rx * 2 + 12, 12, o.cx - o.rx - 6, o.cy - o.ry - 8, o.rx * 2 + 12, alto * cerrado + 8);
        ctx.fillStyle = `rgba(${o.piel.join(", ")}, 0.35)`;
        ctx.fillRect(o.cx - o.rx - 6, o.cy - o.ry - 8, o.rx * 2 + 12, alto + 8);
        ctx.restore();

        ctx.save();
        ctx.translate(o.cx, o.cy);
        ctx.rotate(giro);
        ctx.strokeStyle = "rgba(48, 26, 16, 0.8)";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(o.rx, borde - curva);
        ctx.quadraticCurveTo(0, borde + curva, -o.rx, borde - curva);
        ctx.stroke();
        ctx.restore();
      });
    }

    /** Pinta un cuadro: encuadra el retrato, mueve la cabeza y dibuja ojos y boca. */
    function pintar() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (!img.complete || !img.naturalWidth) {
        ctx.clearRect(0, 0, ancho, alto);
        return;
      }
      const a = actual;
      const respiro = Math.sin((performance.now() / 1000) * 1.6) * 0.003;
      const zoom = 1.08 + a.acerca * 0.025 + respiro;
      const escala = Math.max(ancho / LADO, alto / LADO) * zoom;
      let ox = ancho / 2 - FOCO.x * escala;
      let oy = alto * 0.46 - FOCO.y * escala;
      ox = Math.min(0, Math.max(ancho - LADO * escala, ox));
      oy = Math.min(0, Math.max(alto - LADO * escala, oy));

      ctx.fillStyle = "#ead7c6";
      ctx.fillRect(0, 0, ancho, alto);
      ctx.setTransform(escala, 0, 0, escala, ox, oy);
      ctx.translate(PIVOTE.x + a.x, PIVOTE.y + a.y);
      ctx.rotate((a.giro * Math.PI) / 180);
      ctx.translate(-PIVOTE.x, -PIVOTE.y);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0);
      pintarBoca(a.abierta);
      pintarOjos(1 - parpadeo);
    }

    /** Cuadro de animación: decide la pose, mide la voz, suaviza y pinta. */
    function cuadroAnimacion(ahora) {
      if (!vivo) return;
      poseBase(ahora);
      if (ahora > proximoGesto && !gesto) nuevoGesto(ahora);
      aplicarGesto(ahora);
      medirBoca(ahora);

      // Parpadeo natural: rápido, cada pocos segundos y a veces doble
      if (!parpadeando && ahora > proximoParpadeo) parpadeando = ahora;
      if (parpadeando) {
        const k = (ahora - parpadeando) / 180;
        parpadeo = k < 0.5 ? 1 - k * 2 : Math.min(1, (k - 0.5) * 2);
        if (k >= 1) {
          parpadeando = 0;
          parpadeo = 1;
          proximoParpadeo = ahora + (Math.random() < 0.15 ? 200 : azar(2200, 5200));
        }
      }

      Object.keys(actual).forEach((k) => {
        if (k === "abierta") actual.abierta = Labios.suavizar(actual.abierta, objetivo.abierta, 0.6, 0.3);
        else actual[k] = mezclar(actual[k], objetivo[k], 0.07);
      });
      if (!conClips) pintar();
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

    /** Cambia el estado visible: listo, escuchando, pensando o hablando. */
    function cambiarEstado(nuevo) {
      if (estado === nuevo) return;
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
      if (clips) clips.destruir();
      if (observador) observador.disconnect();
      else window.removeEventListener("resize", medir);
    }

    const clips = window.AvatarClips ? AvatarClips.montar(contenedor, { alActivar: () => { conClips = true; } }) : null;
    cuadro = requestAnimationFrame(cuadroAnimacion);

    return {
      estado: cambiarEstado,
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
