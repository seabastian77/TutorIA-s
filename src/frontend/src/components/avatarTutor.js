// Avatar animado de la tutora: parpadea, mira, gesticula y mueve los labios al ritmo de su voz

const AvatarTutor = (() => {
  const NS = "http://www.w3.org/2000/svg";

  // Salón de clase detrás de Numi, desenfocado como en una videollamada; va en su propia capa porque no se mueve
  const FONDO = `
  <svg class="avatar-fondo" viewBox="-160 0 800 560" preserveAspectRatio="xMidYMax slice" aria-hidden="true" xmlns="${NS}">
    <defs>
      <linearGradient id="avf-pared" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f6ebe0"/><stop offset="1" stop-color="#ead7c6"/>
      </linearGradient>
      <radialGradient id="avf-luz" cx="0.5" cy="0.45" r="0.6">
        <stop offset="0" stop-color="#fff8f0" stop-opacity="0.9"/><stop offset="1" stop-color="#fff8f0" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="avf-mar" cx="0.4" cy="0.35" r="0.7">
        <stop offset="0" stop-color="#7cc0e6"/><stop offset="1" stop-color="#2f6f9e"/>
      </radialGradient>
      <filter id="avf-desenfoque" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="5"/></filter>
    </defs>
    <rect x="-160" y="0" width="800" height="560" fill="url(#avf-pared)"/>
    <g filter="url(#avf-desenfoque)">
      <rect x="-170" y="196" width="250" height="14" rx="3" fill="#d8b48c"/>
      <rect x="-170" y="430" width="250" height="14" rx="3" fill="#d8b48c"/>
      <rect x="-150" y="96" width="30" height="100" rx="3" fill="#7b5a3c"/>
      <rect x="-116" y="110" width="26" height="86" rx="3" fill="#a88a63"/>
      <rect x="-86" y="102" width="32" height="94" rx="3" fill="#6f7f99"/>
      <rect x="-50" y="118" width="24" height="78" rx="3" fill="#c9b08a"/>
      <rect x="-140" y="320" width="34" height="110" rx="3" fill="#c7a77c"/>
      <rect x="-102" y="334" width="30" height="96" rx="3" fill="#9c4a3f"/>
      <rect x="-68" y="326" width="32" height="104" rx="3" fill="#5f7193"/>
      <rect x="-32" y="344" width="22" height="86" rx="3" fill="#b9a079"/>
      <rect x="420" y="190" width="240" height="14" rx="3" fill="#d8b48c"/>
      <rect x="420" y="424" width="240" height="14" rx="3" fill="#d8b48c"/>
      <circle cx="560" cy="122" r="58" fill="url(#avf-mar)"/>
      <path d="M528 92 C546 80 566 88 572 104 C580 122 566 134 552 128 C540 122 522 112 528 92 Z M574 140 C588 136 600 146 596 160 C590 170 576 168 572 158 Z" fill="#9fc48a"/>
      <path d="M560 180 L560 190 M536 190 L584 190" stroke="#a86a3c" stroke-width="6" stroke-linecap="round"/>
      <path d="M498 122 A62 62 0 0 1 616 80" fill="none" stroke="#b07a48" stroke-width="5"/>
      <circle cx="580" cy="354" r="52" fill="url(#avf-mar)"/>
      <path d="M556 330 C572 320 590 330 592 346 C594 362 578 370 566 362 Z" fill="#a9c98e"/>
      <path d="M580 406 L580 424 M556 424 L604 424" stroke="#a86a3c" stroke-width="6" stroke-linecap="round"/>
    </g>
    <rect x="-160" y="0" width="800" height="560" fill="url(#avf-luz)"/>
  </svg>`;

  // Dibujo de la tutora en capas: suéter, pelo de atrás, cuello y cabeza (pelo, cara, ojos, gafas, audífonos, boca)
  const DIBUJO = `
  <svg class="avatar-svg" viewBox="-160 0 800 560" preserveAspectRatio="xMidYMax slice" role="img" aria-label="Numi, tu tutora de inglés" xmlns="${NS}">
    <defs>
      <radialGradient id="av-piel" cx="0.45" cy="0.4" r="0.72">
        <stop offset="0" stop-color="#fbdcc6"/><stop offset="0.62" stop-color="#f1bfa2"/><stop offset="1" stop-color="#dc9c7f"/>
      </radialGradient>
      <linearGradient id="av-cuello" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#cf8d70"/><stop offset="0.4" stop-color="#eab397"/><stop offset="1" stop-color="#f1c0a5"/>
      </linearGradient>
      <linearGradient id="av-pelo" x1="0.2" y1="0" x2="0.8" y2="1">
        <stop offset="0" stop-color="#8a5b3e"/><stop offset="0.55" stop-color="#5e3b27"/><stop offset="1" stop-color="#3e2618"/>
      </linearGradient>
      <linearGradient id="av-pelo-atras" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#5a3826"/><stop offset="1" stop-color="#3a2317"/>
      </linearGradient>
      <linearGradient id="av-sueter" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#6c9896"/><stop offset="1" stop-color="#46716f"/>
      </linearGradient>
      <pattern id="av-punto" width="10" height="9" patternUnits="userSpaceOnUse">
        <path d="M0 0 L5 7 L10 0" fill="none" stroke="#ffffff" stroke-opacity="0.09" stroke-width="2"/>
      </pattern>
      <radialGradient id="av-iris" cx="0.4" cy="0.35" r="0.7">
        <stop offset="0" stop-color="#c68a45"/><stop offset="0.65" stop-color="#7a4b22"/><stop offset="1" stop-color="#3e2410"/>
      </radialGradient>
      <radialGradient id="av-mejilla" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#f08a7a" stop-opacity="0.5"/><stop offset="1" stop-color="#f08a7a" stop-opacity="0"/>
      </radialGradient>
      <filter id="av-sombra" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
      <clipPath id="av-ojo-izq"><ellipse class="av-clip-ojo" cx="201" cy="254" rx="20" ry="15"/></clipPath>
      <clipPath id="av-ojo-der"><ellipse class="av-clip-ojo" cx="279" cy="254" rx="20" ry="15"/></clipPath>
      <clipPath id="av-boca-int"><path class="av-boca-clip"/></clipPath>
    </defs>

    <g class="av-cuerpo">
      <path d="M20 560 C24 484 64 440 138 424 C170 418 194 410 206 400 L274 400 C286 410 310 418 342 424 C416 440 456 484 460 560 Z" fill="url(#av-sueter)"/>
      <path d="M20 560 C24 484 64 440 138 424 C170 418 194 410 206 400 L274 400 C286 410 310 418 342 424 C416 440 456 484 460 560 Z" fill="url(#av-punto)"/>
      <g fill="none" stroke="#3d6462" stroke-opacity="0.45" stroke-width="3">
        <path d="M170 460 C182 472 182 484 170 496 C158 508 158 520 170 532 C182 544 182 552 176 560"/>
        <path d="M184 460 C172 472 172 484 184 496 C196 508 196 520 184 532 C172 544 172 552 178 560"/>
        <path d="M296 460 C308 472 308 484 296 496 C284 508 284 520 296 532 C308 544 308 552 302 560"/>
        <path d="M310 460 C298 472 298 484 310 496 C322 508 322 520 310 532 C298 544 298 552 304 560"/>
        <path d="M108 470 C116 500 118 530 116 560"/><path d="M372 470 C364 500 362 530 364 560"/>
      </g>
    </g>

    <g class="av-pelo-atras">
      <path d="M240 94 C178 94 130 138 124 212 C108 238 96 270 104 300 C90 326 94 354 112 370 C108 394 128 412 150 404 C156 422 178 426 192 412 L288 412 C302 426 324 422 330 404 C352 412 372 394 368 370 C386 354 390 326 376 300 C384 270 372 238 356 212 C350 138 302 94 240 94 Z" fill="url(#av-pelo-atras)"/>
      <g fill="none" stroke="#7a4f35" stroke-opacity="0.55" stroke-width="3" stroke-linecap="round">
        <path d="M114 282 C104 312 124 334 114 362"/><path d="M134 318 C126 346 146 366 138 394"/><path d="M120 236 C112 256 118 270 112 288"/>
        <path d="M366 282 C376 312 356 334 366 362"/><path d="M346 318 C354 346 334 366 342 394"/><path d="M360 236 C368 256 362 270 368 288"/>
      </g>
    </g>

    <g class="av-cuello">
      <path d="M212 322 L268 322 L272 404 C256 416 224 416 208 404 Z" fill="url(#av-cuello)"/>
      <ellipse cx="240" cy="356" rx="36" ry="14" fill="#b86f55" opacity="0.4" filter="url(#av-sombra)"/>
      <path d="M198 400 C212 424 268 424 282 400 C290 406 292 412 290 418 C270 444 210 444 190 418 C188 412 190 406 198 400 Z" fill="#5b8987"/>
      <g stroke="#3f6967" stroke-opacity="0.6" stroke-width="2">
        <path d="M200 410 L196 420"/><path d="M212 418 L210 430"/><path d="M226 422 L225 434"/><path d="M240 423 L240 436"/>
        <path d="M254 422 L255 434"/><path d="M268 418 L270 430"/><path d="M280 410 L284 420"/>
      </g>
      <path d="M210 404 C216 432 226 450 234 458 C244 450 262 432 270 404" fill="none" stroke="#d9b04a" stroke-width="1.6"/>
      <circle cx="234" cy="464" r="6.5" fill="#e2b84f" stroke="#b8902e" stroke-width="1.5"/>
    </g>

    <g class="av-cabeza">
      <path d="M240 154 C306 154 336 200 334 256 C332 310 294 356 240 358 C186 356 148 310 146 256 C144 200 174 154 240 154 Z" fill="url(#av-piel)"/>
      <ellipse cx="184" cy="304" rx="26" ry="15" fill="url(#av-mejilla)"/>
      <ellipse cx="296" cy="304" rx="26" ry="15" fill="url(#av-mejilla)"/>
      <g fill="#c98466" opacity="0.55">
        <circle cx="222" cy="290" r="1.6"/><circle cx="230" cy="296" r="1.4"/><circle cx="216" cy="298" r="1.3"/>
        <circle cx="258" cy="290" r="1.6"/><circle cx="250" cy="296" r="1.4"/><circle cx="264" cy="298" r="1.3"/>
        <circle cx="176" cy="292" r="1.4"/><circle cx="304" cy="292" r="1.4"/>
      </g>

      <path d="M146 252 C128 170 176 100 240 98 C306 100 352 168 334 252 C328 232 320 214 306 200 C302 214 294 222 282 228 C282 212 276 200 266 192 C258 208 244 214 226 214 C232 202 232 190 228 180 C214 200 196 212 174 218 C182 206 184 196 184 186 C166 206 154 228 146 252 Z" fill="url(#av-pelo)"/>
      <path d="M152 236 C140 276 146 322 172 356 C160 320 158 282 166 248 Z" fill="#4e3020"/>
      <path d="M328 236 C340 276 334 322 308 356 C320 320 322 282 314 248 Z" fill="#4e3020"/>
      <g fill="none" stroke="#a87650" stroke-opacity="0.6" stroke-width="3" stroke-linecap="round">
        <path d="M196 128 C220 116 256 114 284 128"/><path d="M228 132 C240 152 240 176 230 200"/>
        <path d="M266 140 C280 160 284 180 278 214"/><path d="M204 150 C196 172 190 190 180 206"/><path d="M300 160 C312 178 318 196 316 214"/>
      </g>

      <g class="av-ceja-izq"><path d="M176 220 Q198 206 222 214" fill="none" stroke="#5a3826" stroke-width="7" stroke-linecap="round"/></g>
      <g class="av-ceja-der"><path d="M258 214 Q282 206 304 220" fill="none" stroke="#5a3826" stroke-width="7" stroke-linecap="round"/></g>

      <g clip-path="url(#av-ojo-izq)">
        <ellipse cx="201" cy="254" rx="20" ry="16" fill="#fdf9f4"/>
        <g class="av-iris"><circle cx="201" cy="256" r="11.5" fill="url(#av-iris)"/><circle cx="201" cy="256" r="5.6" fill="#1f1108"/><circle cx="205" cy="251" r="3.2" fill="#ffffff"/><circle cx="197" cy="260" r="1.4" fill="#ffffff" opacity="0.8"/></g>
      </g>
      <g clip-path="url(#av-ojo-der)">
        <ellipse cx="279" cy="254" rx="20" ry="16" fill="#fdf9f4"/>
        <g class="av-iris"><circle cx="279" cy="256" r="11.5" fill="url(#av-iris)"/><circle cx="279" cy="256" r="5.6" fill="#1f1108"/><circle cx="283" cy="251" r="3.2" fill="#ffffff"/><circle cx="275" cy="260" r="1.4" fill="#ffffff" opacity="0.8"/></g>
      </g>
      <path class="av-pestana av-pestana-izq" fill="none" stroke="#2e1a10" stroke-width="3.6" stroke-linecap="round"/>
      <path class="av-pestana av-pestana-der" fill="none" stroke="#2e1a10" stroke-width="3.6" stroke-linecap="round"/>

      <rect x="168" y="228" width="64" height="50" rx="19" fill="#ffffff" fill-opacity="0.07"/>
      <rect x="248" y="228" width="64" height="50" rx="19" fill="#ffffff" fill-opacity="0.07"/>
      <g fill="none" stroke="#8a5434" stroke-width="4">
        <rect x="168" y="228" width="64" height="50" rx="19"/>
        <rect x="248" y="228" width="64" height="50" rx="19"/>
        <path d="M232 248 Q240 242 248 248"/>
        <path d="M168 244 L150 240"/><path d="M312 244 L330 240"/>
      </g>
      <path d="M178 236 Q186 232 196 234" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M258 236 Q266 232 276 234" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2.5" stroke-linecap="round"/>

      <path d="M247 266 C252 280 254 292 249 299" fill="none" stroke="#c98466" stroke-opacity="0.35" stroke-width="3" stroke-linecap="round"/>
      <path d="M233 300 Q240 306 249 300" fill="none" stroke="#c07b5e" stroke-width="2.6" stroke-linecap="round"/>
      <ellipse cx="242" cy="284" rx="5" ry="7" fill="#ffffff" opacity="0.18"/>

      <g fill="none" stroke-linecap="round">
        <path d="M138 240 C128 158 184 116 240 114 C296 116 352 158 342 240" stroke="#25252a" stroke-width="13"/>
        <path d="M143 236 C134 164 186 124 240 122 C294 124 346 164 337 236" stroke="#b9774a" stroke-width="2.5" stroke-opacity="0.85"/>
      </g>
      <rect x="120" y="226" width="40" height="80" rx="18" fill="#2b2b30"/>
      <rect x="128" y="236" width="24" height="60" rx="12" fill="#3a3a41"/>
      <path d="M124 246 L124 286" stroke="#c4824f" stroke-width="3" stroke-linecap="round"/>
      <rect x="320" y="226" width="40" height="80" rx="18" fill="#2b2b30"/>
      <rect x="328" y="236" width="24" height="60" rx="12" fill="#3a3a41"/>
      <path d="M356 246 L356 286" stroke="#c4824f" stroke-width="3" stroke-linecap="round"/>

      <g class="av-boca" transform="translate(240 330) scale(1.3)">
        <path class="av-boca-interior" fill="#6a1f26"/>
        <g clip-path="url(#av-boca-int)">
          <rect class="av-dientes" x="-17" width="34" rx="2.5" fill="#fffdf9"/>
          <ellipse class="av-lengua" cx="0" rx="10" ry="6" fill="#d0606a"/>
        </g>
        <path class="av-labio-sup" fill="#cf6e72"/>
        <path class="av-labio-inf" fill="#dc8085"/>
      </g>
    </g>
  </svg>`;

  const RY_OJO = 15;
  const OJOS = [
    { cx: 201, cy: 254 },
    { cx: 279, cy: 254 },
  ];

  let contextoAudio = null;

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

  const azar = (a, b) => a + Math.random() * (b - a);
  const mezclar = (a, b, k) => a + (b - a) * k;

  /** Monta el avatar dentro de un contenedor y devuelve los controles de su animación y su voz. */
  function montar(contenedor) {
    contenedor.innerHTML = FONDO + DIBUJO;
    const svg = contenedor.querySelector(".avatar-svg");
    const $ = (sel) => svg.querySelector(sel);
    const partes = {
      cabeza: $(".av-cabeza"),
      cuerpo: $(".av-cuerpo"),
      cuello: $(".av-cuello"),
      peloAtras: $(".av-pelo-atras"),
      cejaIzq: $(".av-ceja-izq"),
      cejaDer: $(".av-ceja-der"),
      clipOjos: [...svg.querySelectorAll(".av-clip-ojo")],
      iris: [...svg.querySelectorAll(".av-iris")],
      pestanas: [$(".av-pestana-izq"), $(".av-pestana-der")],
      interior: $(".av-boca-interior"),
      clipBoca: $(".av-boca-clip"),
      dientes: $(".av-dientes"),
      lengua: $(".av-lengua"),
      labioSup: $(".av-labio-sup"),
      labioInf: $(".av-labio-inf"),
    };

    // Valores actuales y a dónde van; cada cuadro se acercan un poco para que nada salte
    const actual = { giro: 0, x: 0, y: 0, miraX: 0, miraY: 0, cejas: 0, frunce: 0, abierta: 0, ancha: 0.5, sonrisa: 1.6, hombros: 0 };
    const objetivo = { ...actual };
    let estado = "listo";
    let parpadeo = 1;
    let proximoParpadeo = performance.now() + azar(1500, 3500);
    let parpadeando = 0;
    let proximoGesto = performance.now() + azar(1200, 2600);
    let gesto = null;
    let cuadro = 0;
    let vivo = true;

    // Fuente de la boca: audio medido, voz del navegador estimada, o nada
    let analizador = null;
    let datosOnda = null;
    let datosEspectro = null;
    let fuenteActual = null;
    let finActual = null;
    let hablaSintetica = null; // { inicio, semilla, energia }
    let nivelSuave = 0;

    /** Programa un gesto corto: asentir, ladear la cabeza, alzar las cejas o encoger los hombros. */
    function nuevoGesto(ahora) {
      const opciones = estado === "hablando"
        ? ["asentir", "ladear", "cejas", "cejas", "hombros", "girar"]
        : estado === "escuchando" ? ["asentir", "ladear", "cejas"] : ["ladear", "girar", "mirar"];
      const tipo = opciones[Math.floor(Math.random() * opciones.length)];
      gesto = { tipo, inicio: ahora, dura: tipo === "hombros" ? 900 : azar(600, 1000), lado: Math.random() < 0.5 ? -1 : 1 };
      proximoGesto = ahora + (estado === "hablando" ? azar(900, 2000) : azar(1800, 4200));
    }

    /** Decide la pose de fondo según el estado: escuchar inclina, pensar mira arriba, hablar mira al frente. */
    function poseBase(ahora) {
      const t = ahora / 1000;
      objetivo.x = Math.sin(t * 0.6) * 2;
      objetivo.y = Math.sin(t * 0.9) * 1.2;
      objetivo.giro = Math.sin(t * 0.45) * 1.2;
      objetivo.miraX = Math.sin(t * 0.3) * 0.15;
      objetivo.miraY = 0;
      objetivo.cejas = 0;
      objetivo.frunce = 0;
      objetivo.sonrisa = 1.6; // sonríe por defecto, como una profe amable
      objetivo.hombros = 0;

      if (estado === "escuchando") {
        objetivo.giro = 4 + Math.sin(t * 0.8) * 1;
        objetivo.cejas = 0.35;
        objetivo.sonrisa = 1.9;
        objetivo.miraX = -0.1;
      } else if (estado === "pensando") {
        objetivo.giro = -3.5;
        objetivo.miraX = 0.65;
        objetivo.miraY = -0.85;
        objetivo.frunce = 0.55;
        objetivo.sonrisa = 0.5;
        objetivo.y = -2;
      } else if (estado === "hablando") {
        objetivo.giro = Math.sin(t * 1.3) * 2.2;
        objetivo.x = Math.sin(t * 0.9) * 3;
        objetivo.miraX = Math.sin(t * 0.5) * 0.12;
        objetivo.sonrisa = 1.2;
      }
    }

    /** Suma el gesto en curso encima de la pose, con una curva que sube y baja suave. */
    function aplicarGesto(ahora) {
      if (!gesto) return;
      const k = (ahora - gesto.inicio) / gesto.dura;
      if (k >= 1) { gesto = null; return; }
      const curva = Math.sin(k * Math.PI);
      if (gesto.tipo === "asentir") objetivo.y += Math.sin(k * Math.PI * 2) * 5;
      if (gesto.tipo === "ladear") objetivo.giro += gesto.lado * 5 * curva;
      if (gesto.tipo === "cejas") objetivo.cejas += 0.9 * curva;
      if (gesto.tipo === "hombros") { objetivo.hombros += 6 * curva; objetivo.cejas += 0.6 * curva; }
      if (gesto.tipo === "girar") objetivo.x += gesto.lado * 6 * curva;
      if (gesto.tipo === "mirar") { objetivo.miraX += gesto.lado * 0.6 * curva; }
    }

    /** Mide la voz que está sonando y la traduce en apertura y forma de la boca. */
    function medirBoca(ahora) {
      if (analizador) {
        analizador.getFloatTimeDomainData(datosOnda);
        analizador.getByteFrequencyData(datosEspectro);
        const nivel = Labios.nivelDesdeMuestras(datosOnda);
        const salto = nivel - nivelSuave;
        nivelSuave = mezclar(nivelSuave, nivel, 0.2);
        objetivo.abierta = Labios.aperturaDesdeNivel(nivel);
        objetivo.ancha = Labios.anchuraDesdeEspectro(datosEspectro, analizador.context.sampleRate, analizador.fftSize);
        // Un golpe de voz fuerte se acompaña con las cejas, como al enfatizar
        if (salto > 0.06 && !gesto && Math.random() < 0.35) gesto = { tipo: "cejas", inicio: ahora, dura: 500, lado: 1 };
        return;
      }
      if (hablaSintetica) {
        const ms = ahora - hablaSintetica.inicio;
        const energia = Math.max(0.55, hablaSintetica.energia);
        objetivo.abierta = Labios.aperturaSintetica(ms, hablaSintetica.semilla) * energia;
        objetivo.ancha = 0.5 + 0.35 * Math.sin(ms / 230 + hablaSintetica.semilla);
        hablaSintetica.energia = mezclar(hablaSintetica.energia, 0.75, 0.02);
        return;
      }
      // En reposo sonríe con los labios un poco abiertos, salvo cuando piensa
      objetivo.abierta = estado === "pensando" ? 0 : 0.2;
      objetivo.ancha = 0.5;
    }

    /** Pinta un cuadro con los valores actuales. */
    function pintar() {
      const a = actual;
      partes.cabeza.setAttribute("transform", `translate(${a.x.toFixed(2)} ${a.y.toFixed(2)}) rotate(${a.giro.toFixed(2)} 240 350)`);
      partes.peloAtras.setAttribute("transform", partes.cabeza.getAttribute("transform"));
      partes.cuello.setAttribute("transform", `translate(${(a.x * 0.4).toFixed(2)} ${(a.y * 0.3).toFixed(2)})`);
      const respiro = Math.sin(performance.now() / 1000 * 1.6) * 1.6;
      partes.cuerpo.setAttribute("transform", `translate(0 ${(respiro - a.hombros).toFixed(2)})`);

      const sube = -a.cejas * 6;
      partes.cejaIzq.setAttribute("transform", `translate(0 ${sube.toFixed(2)}) rotate(${(a.frunce * 7).toFixed(2)} 220 214)`);
      partes.cejaDer.setAttribute("transform", `translate(0 ${sube.toFixed(2)}) rotate(${(-a.frunce * 7).toFixed(2)} 260 214)`);

      const ry = Math.max(0.6, RY_OJO * parpadeo);
      partes.clipOjos.forEach((o) => o.setAttribute("ry", ry.toFixed(2)));
      partes.iris.forEach((g) => g.setAttribute("transform", `translate(${(a.miraX * 6).toFixed(2)} ${(a.miraY * 4).toFixed(2)})`));
      OJOS.forEach((o, i) => {
        const y = o.cy - ry * 0.95;
        partes.pestanas[i].setAttribute("d", `M${o.cx - 22} ${o.cy - 1} Q${o.cx} ${(y - ry * 0.3).toFixed(2)} ${o.cx + 22} ${o.cy - 3}`);
      });

      const boca = Labios.formaDeBoca({ abierta: a.abierta, ancha: a.ancha, sonrisa: a.sonrisa });
      partes.interior.setAttribute("d", boca.interior);
      partes.clipBoca.setAttribute("d", boca.interior);
      partes.labioSup.setAttribute("d", boca.labioSup);
      partes.labioInf.setAttribute("d", boca.labioInf);
      partes.dientes.setAttribute("y", boca.dientesY);
      partes.dientes.setAttribute("height", Math.max(0, boca.dientesAlto + 1));
      partes.lengua.setAttribute("cy", boca.lenguaY);
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
        const k = (ahora - parpadeando) / 170;
        parpadeo = k < 0.5 ? 1 - k * 2 : Math.min(1, (k - 0.5) * 2);
        if (k >= 1) {
          parpadeando = 0;
          parpadeo = 1;
          proximoParpadeo = ahora + (Math.random() < 0.15 ? 180 : azar(2200, 5200));
        }
      }

      Object.keys(actual).forEach((k) => {
        if (k === "abierta") actual.abierta = Labios.suavizar(actual.abierta, objetivo.abierta, 0.6, 0.3);
        else actual[k] = mezclar(actual[k], objetivo[k], k === "ancha" ? 0.25 : 0.08);
      });
      pintar();
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

    /** Reproduce un audio decodificado y mueve los labios midiéndolo; resuelve al terminar. */
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
      datosEspectro = new Uint8Array(an.frequencyBinCount);
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

    /** Mueve los labios sin audio medible (voz del navegador): ritmo de sílabas hasta que se diga basta. */
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
      svg.dataset.estado = nuevo;
    }

    function destruir() {
      vivo = false;
      cancelAnimationFrame(cuadro);
      callar();
    }

    pintar();
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
