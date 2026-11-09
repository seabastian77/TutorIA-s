// Tuti en 3D: un solo modelo tierno con poses, expresiones, accesorios y animaciones
import * as THREE from "../vendor/three.module.min.js";

const COLORES = {
  cuerpo: 0x34b866,
  ala: 0x23964f,
  copete: 0x6fd690,
  barriga: 0xffe8b5,
  pico: 0xffb52e,
  picoBajo: 0xf39a12,
  pata: 0xffa928,
  mejilla: 0xff92a5,
  ojo: 0x1c1512,
  oro: 0xf5b301,
  tinta: 0x0b3d24,
  verdeOscuro: 0x15803d,
  verdeClaro: 0x4ade80,
};

/** Material de vinilo suave: el acabado de un juguete de diseño. */
function vinilo(color, extra = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.38,
    metalness: 0,
    clearcoat: 0.5,
    clearcoatRoughness: 0.28,
    sheen: 0.35,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color(0xffffff),
    ...extra,
  });
}

function esfera(radio, material, seg = 48) {
  return new THREE.Mesh(new THREE.SphereGeometry(radio, seg, Math.round(seg * 0.75)), material);
}

function capsula(radio, largo, material) {
  return new THREE.Mesh(new THREE.CapsuleGeometry(radio, largo, 12, 24), material);
}

/** Pluma redondeada: base ancha y punta suave. */
function pluma(largo, ancho, material) {
  const perfil = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    perfil.push(new THREE.Vector2(Math.sin(Math.PI * t) * ancho * (1 - t * 0.35), t * largo));
  }
  return new THREE.Mesh(new THREE.LatheGeometry(perfil, 28), material);
}

/** Perfil de huevo para el torno: la cabeza sale de girarlo una vez. */
function perfilHuevo({ radio, abajo, arriba }) {
  const puntos = [];
  for (let i = 0; i <= 64; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / 64;
    puntos.push(new THREE.Vector2(Math.max(radio * Math.cos(a), 0.0001), (a < 0 ? abajo : arriba) * Math.sin(a)));
  }
  return puntos;
}

/** Radio de la cabeza a cierta altura, para pegar las piezas a la superficie. */
function radioEn(y, f) {
  const s = Math.max(-1, Math.min(1, y / (y < 0 ? f.abajo : f.arriba)));
  return f.radio * Math.cos(Math.asin(s));
}

/** Pone una pieza sobre la cara, mirando hacia afuera. */
function sobreCara(pieza, f, { y, giro, hundir = 0.04 }) {
  const r = radioEn(y, f) - hundir;
  pieza.position.set(Math.sin(giro) * r * f.ancho, y, Math.cos(giro) * r * f.fondo);
  pieza.rotation.y = giro;
  return pieza;
}

/** Ojo tierno: brillante y oscuro, sin blanco alrededor, con dos brillos. */
function crearOjo(mat, tam) {
  const ojo = new THREE.Group();
  const forma = new THREE.Group();
  const globo = esfera(0.2 * tam, mat.ojo, 40);
  globo.scale.set(1, 1.2, 0.5);
  forma.add(globo);

  // Los brillos se corren un poco hacia donde mira
  const mirada = new THREE.Group();
  const brillo = esfera(0.07 * tam, mat.brillo, 20);
  brillo.scale.set(1, 1, 0.4);
  brillo.position.set(0.065 * tam, 0.095 * tam, 0.085 * tam);
  const brilloChico = esfera(0.032 * tam, mat.brillo, 14);
  brilloChico.scale.set(1, 1, 0.4);
  brilloChico.position.set(-0.06 * tam, -0.085 * tam, 0.09 * tam);
  mirada.add(brillo, brilloChico);
  forma.add(mirada);
  ojo.add(forma);

  // Ojo feliz: un arco que reemplaza al ojo cuando Tuti sonríe
  const arco = new THREE.Mesh(new THREE.TorusGeometry(0.14 * tam, 0.035 * tam, 12, 32, Math.PI), mat.ojo);
  arco.position.z = 0.06 * tam;
  arco.visible = false;
  ojo.add(arco);
  return { ojo, forma, mirada, arco };
}

/** Accesorios que Tuti usa según la actividad. */
function crearAccesorios(mat) {
  const acc = {};

  const birrete = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.44, 0.2, 40), mat.tinta);
  const tabla = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.06, 1.05), mat.tinta);
  tabla.position.y = 0.13;
  tabla.rotation.y = Math.PI / 4;
  const boton = esfera(0.05, mat.oro, 16);
  boton.position.y = 0.18;
  const cordon = capsula(0.018, 0.38, mat.oro);
  cordon.position.set(0.36, -0.02, 0.16);
  cordon.rotation.z = 0.15;
  const borla = esfera(0.065, mat.oro, 16);
  borla.position.set(0.39, -0.25, 0.16);
  birrete.add(base, tabla, boton, cordon, borla);
  birrete.position.set(0, 0.98, -0.05);
  birrete.rotation.set(-0.1, 0, 0.12);
  acc.birrete = birrete;

  const audifonos = new THREE.Group();
  const radio = 1.24;
  const diadema = new THREE.Mesh(new THREE.TorusGeometry(radio, 0.075, 16, 64, Math.PI), mat.tinta);
  diadema.scale.y = 0.95;
  audifonos.add(diadema);
  for (const lado of [-1, 1]) {
    const copa = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.2, 40), mat.tinta);
    copa.rotation.z = Math.PI / 2;
    copa.position.set(radio * lado, 0, 0);
    const almohada = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.08, 16, 40), mat.verdeClaro);
    almohada.rotation.y = Math.PI / 2;
    almohada.position.set((radio - 0.1) * lado, 0, 0);
    audifonos.add(copa, almohada);
  }
  acc.audifonos = audifonos;

  const libro = new THREE.Group();
  const tapa = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.68, 0.1), mat.verdeOscuro);
  const hojas = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.62, 0.12), mat.papel);
  hojas.position.set(0.02, 0, -0.04);
  const lomo = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.68, 16), mat.verdeOscuro);
  lomo.position.set(-0.47, 0, 0);
  const franja = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.07, 0.02), mat.oro);
  franja.position.set(0.04, 0.12, 0.06);
  const franja2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.02), mat.oro);
  franja2.position.set(0.04, -0.02, 0.06);
  libro.add(tapa, hojas, lomo, franja, franja2);
  libro.position.set(0, -1.05, 1.1);
  libro.rotation.set(-0.15, 0.2, 0.06);
  libro.scale.setScalar(0.85);
  acc.libro = libro;

  const microfono = new THREE.Group();
  const mango = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.6, 24), mat.tinta);
  const cabezaMic = esfera(0.17, mat.metal, 32);
  cabezaMic.position.y = 0.36;
  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 12, 32), mat.oro);
  aro.position.y = 0.28;
  aro.rotation.x = Math.PI / 2;
  microfono.add(mango, cabezaMic, aro);
  microfono.position.set(0.85, -0.7, 0.85);
  microfono.rotation.set(0.35, 0, -0.42);
  acc.microfono = microfono;

  const trofeo = new THREE.Group();
  const copaTrofeo = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.12, 0.42, 40, 1, true), mat.oro);
  const fondo = esfera(0.12, mat.oro, 24);
  fondo.position.y = -0.2;
  const pie = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.2, 20), mat.oro);
  pie.position.y = -0.33;
  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.3), mat.tinta);
  pedestal.position.y = -0.47;
  const estrella = esfera(0.07, mat.brillo, 12);
  estrella.position.set(0, 0.0, 0.28);
  for (const lado of [-1, 1]) {
    const asa = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.03, 12, 24, Math.PI), mat.oro);
    asa.position.set(0.3 * lado, 0.05, 0);
    asa.rotation.z = lado > 0 ? -Math.PI / 2 : Math.PI / 2;
    trofeo.add(asa);
  }
  trofeo.add(copaTrofeo, fondo, pie, pedestal, estrella);
  trofeo.position.set(-1.12, -0.7, 0.7);
  trofeo.scale.setScalar(1.1);
  acc.trofeo = trofeo;

  for (const k of Object.keys(acc)) acc[k].visible = false;
  return acc;
}

/** Arma el personaje completo y devuelve sus partes animables. */
function crearTuti() {
  const mat = {
    cuerpo: vinilo(COLORES.cuerpo),
    ala: vinilo(COLORES.ala),
    copete: vinilo(COLORES.copete),
    // Un toque de emisión compensa el tono fílmico, que apaga los cremas
    barriga: vinilo(COLORES.barriga, { roughness: 0.55, clearcoat: 0.2, emissive: COLORES.barriga, emissiveIntensity: 0.14 }),
    pico: vinilo(COLORES.pico, { roughness: 0.3, clearcoat: 0.7 }),
    picoBajo: vinilo(COLORES.picoBajo, { roughness: 0.35 }),
    pata: vinilo(COLORES.pata, { roughness: 0.4 }),
    mejilla: new THREE.MeshStandardMaterial({ color: COLORES.mejilla, roughness: 0.7 }),
    ojo: new THREE.MeshPhysicalMaterial({ color: COLORES.ojo, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.04 }),
    brillo: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    oro: new THREE.MeshPhysicalMaterial({ color: COLORES.oro, metalness: 0.25, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15 }),
    tinta: vinilo(COLORES.tinta, { roughness: 0.5 }),
    verdeOscuro: vinilo(COLORES.verdeOscuro),
    verdeClaro: vinilo(COLORES.verdeClaro),
    papel: new THREE.MeshStandardMaterial({ color: 0xfffdf5, roughness: 0.9 }),
    metal: new THREE.MeshPhysicalMaterial({ color: 0xb8c2cc, metalness: 0.3, roughness: 0.35, clearcoat: 0.6 }),
  };

  const tuti = new THREE.Group();

  // Cuerpo chico con barriga crema
  const cuerpo = new THREE.Group();
  const torso = esfera(0.92, mat.cuerpo, 64);
  torso.scale.set(1.02, 0.98, 0.94);
  const barriga = esfera(0.7, mat.barriga, 48);
  barriga.scale.set(0.95, 1.05, 0.4);
  barriga.position.set(0, -0.08, 0.6);
  cuerpo.add(torso, barriga);
  cuerpo.position.y = -1.0;
  tuti.add(cuerpo);

  // Cabeza grande hecha en torno, con su propio pivote para girar
  const cabeza = new THREE.Group();
  cabeza.position.y = 0.32;
  const f = { radio: 1.14, abajo: 1.06, arriba: 1.1, ancho: 1.04, fondo: 0.94 };
  const craneo = new THREE.Mesh(new THREE.LatheGeometry(perfilHuevo(f), 96), mat.cuerpo);
  craneo.scale.set(f.ancho, 1, f.fondo);
  cabeza.add(craneo);

  const ojos = [];
  for (const lado of [-1, 1]) {
    const o = crearOjo(mat, 1.05);
    cabeza.add(sobreCara(o.ojo, f, { y: 0.06, giro: 0.4 * lado, hundir: 0.03 }));
    ojos.push(o);
  }

  for (const lado of [-1, 1]) {
    const mejilla = esfera(0.16, mat.mejilla, 28);
    mejilla.scale.set(1.25, 0.72, 0.28);
    cabeza.add(sobreCara(mejilla, f, { y: -0.27, giro: 0.7 * lado, hundir: 0.025 }));
  }

  // Pico chiquito de dos partes, para hablar y sonreír
  const pico = new THREE.Group();
  const picoArriba = esfera(0.16, mat.pico, 32);
  picoArriba.scale.set(1.25, 0.72, 1.05);
  const picoAbajo = esfera(0.105, mat.picoBajo, 24);
  picoAbajo.scale.set(1.15, 0.6, 0.9);
  picoAbajo.position.set(0, -0.09, -0.02);
  pico.add(picoAbajo, picoArriba);
  cabeza.add(sobreCara(pico, f, { y: -0.18, giro: 0, hundir: -0.06 }));

  // Copete de hojitas
  const copete = new THREE.Group();
  [[-0.14, 0.38, 0.5, mat.copete], [0.02, 0.5, -0.05, mat.cuerpo], [0.16, 0.34, -0.55, mat.copete]].forEach(([x, largo, giro, m]) => {
    const p = pluma(largo, 0.15, m);
    p.position.set(x, 0, 0);
    p.rotation.set(-0.3, 0, giro);
    copete.add(p);
  });
  copete.position.set(0, 1.0, 0.05);
  cabeza.add(copete);
  tuti.add(cabeza);

  // Alitas con el pivote arriba para poder saludar
  const alas = [];
  for (const lado of [-1, 1]) {
    const pivote = new THREE.Group();
    pivote.position.set(0.8 * lado, -0.72, 0.05);
    const ala = esfera(0.4, mat.ala, 40);
    ala.scale.set(0.36, 0.95, 0.68);
    ala.position.set(0.06 * lado, -0.32, 0);
    ala.rotation.z = 0.2 * lado;
    pivote.add(ala);
    pivote.rotation.z = 0.1 * lado;
    alas.push(pivote);
    tuti.add(pivote);
  }

  // Patitas redondas que asoman al frente
  for (const lado of [-1, 1]) {
    const pata = capsula(0.11, 0.18, mat.pata);
    pata.rotation.x = Math.PI / 2;
    pata.scale.set(1.15, 1, 0.75);
    pata.position.set(0.36 * lado, -1.86, 0.32);
    tuti.add(pata);
  }

  // Colita
  const cola = new THREE.Group();
  for (const giro of [-0.4, 0, 0.4]) {
    const p = pluma(0.42, 0.13, mat.ala);
    p.rotation.set(-2.1, 0, giro);
    cola.add(p);
  }
  cola.position.set(0, -1.35, -0.7);
  tuti.add(cola);

  const accesorios = crearAccesorios(mat);
  cabeza.add(accesorios.birrete, accesorios.audifonos);
  tuti.add(accesorios.libro, accesorios.microfono, accesorios.trofeo);

  return { tuti, cuerpo, cabeza, alas, ojos, picoAbajo, copete, cola, accesorios, piso: -1.95 };
}

const POSES = {
  saludo: { accesorio: "birrete", gesto: "saludar", expresion: "feliz" },
  tutor: { accesorio: "birrete", gesto: null, expresion: "normal" },
  escucha: { accesorio: "audifonos", gesto: null, expresion: "atento" },
  habla: { accesorio: "microfono", gesto: null, expresion: "feliz" },
  lee: { accesorio: "libro", gesto: null, expresion: "atento" },
  celebra: { accesorio: "trofeo", gesto: "celebrar", expresion: "contento" },
  piensa: { accesorio: null, gesto: null, expresion: "piensa" },
  vacio: { accesorio: null, gesto: null, expresion: "curioso" },
  normal: { accesorio: null, gesto: null, expresion: "normal" },
};

/**
 * Monta a Tuti en un contenedor. Devuelve controles para cambiar de pose,
 * reaccionar y liberar la memoria cuando la vista se cierra.
 */
export function montarTuti(contenedor, opciones = {}) {
  const quieto = opciones.quieto || matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Sin una GPU de verdad el navegador se niega y queda la imagen fija del mismo modelo
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: !!opciones.captura,
    powerPreference: "low-power",
    failIfMajorPerformanceCaveat: !opciones.captura,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, opciones.dpr || 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.className = "tuti3d-lienzo";
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.setAttribute("aria-label", opciones.etiqueta || "Tuti, your English tutor");
  contenedor.appendChild(renderer.domElement);

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  if (opciones.encuadre === "cara") {
    camara.position.set(0, 0.42, 5.5);
    camara.lookAt(0, 0.36, 0);
  } else {
    camara.position.set(0, 0.1, 9.6);
    camara.lookAt(0, -0.3, 0);
  }

  // Luz de estudio: principal cálida, relleno frío, contraluz que separa del fondo
  escena.add(new THREE.HemisphereLight(0xffffff, 0xd8f5e3, 1.3));
  const principal = new THREE.DirectionalLight(0xfff4e0, 2.3);
  principal.position.set(3, 5, 6);
  const relleno = new THREE.DirectionalLight(0xe0f2ff, 0.85);
  relleno.position.set(-5, 1, 4);
  const contraluz = new THREE.DirectionalLight(0xffffff, 1.5);
  contraluz.position.set(-2, 4, -6);
  escena.add(principal, relleno, contraluz);

  const p = crearTuti();
  escena.add(p.tuti);

  // Sombra de contacto suave bajo las patas
  const lienzoSombra = document.createElement("canvas");
  lienzoSombra.width = lienzoSombra.height = 128;
  const g = lienzoSombra.getContext("2d");
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, "rgba(6,60,32,0.32)");
  grad.addColorStop(1, "rgba(6,60,32,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const sombra = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 0.9),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(lienzoSombra), transparent: true, depthWrite: false }),
  );
  sombra.rotation.x = -Math.PI / 2;
  sombra.position.y = p.piso + 0.02;
  escena.add(sombra);

  const estado = {
    pose: "normal",
    gesto: null,
    gestoDesde: 0,
    expresion: "normal",
    proximoParpadeo: 1.2,
    parpadeoDesde: -1,
    mirarX: 0,
    mirarY: 0,
    hablando: false,
  };

  function ponerExpresion(nombre) {
    estado.expresion = nombre;
    const feliz = nombre === "contento";
    p.ojos.forEach((o) => {
      o.forma.visible = !feliz;
      o.arco.visible = feliz;
      // Atento abre un poco más los ojos
      o.ojo.scale.setScalar(nombre === "atento" ? 1.06 : 1);
    });
    p.picoAbajo.position.y = nombre === "feliz" || nombre === "contento" ? -0.11 : -0.09;
  }

  function ponerPose(nombre) {
    const pose = POSES[nombre] || POSES.normal;
    estado.pose = nombre;
    for (const [k, a] of Object.entries(p.accesorios)) a.visible = k === pose.accesorio;
    ponerExpresion(pose.expresion);
    if (pose.gesto) gesto(pose.gesto);
  }

  function gesto(nombre) {
    estado.gesto = nombre;
    estado.gestoDesde = reloj.getElapsedTime();
  }

  function medir() {
    const w = contenedor.clientWidth || 300;
    const h = contenedor.clientHeight || w;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
  }

  const reloj = new THREE.Clock();
  let visible = true;
  let cuadro = 0;

  function animar() {
    const t = reloj.getElapsedTime();

    // Respiración y balanceo de reposo
    const resp = Math.sin(t * 2.1);
    p.cuerpo.scale.set(1 + resp * 0.012, 1 - resp * 0.018, 1);
    p.tuti.rotation.y = (quieto ? -0.12 : 0) + Math.sin(t * 0.6) * 0.08;

    // La cabeza sigue al puntero con suavidad, o hace su propio vaivén
    const objetivoY = estado.mirarX * 0.45 + Math.sin(t * 0.9) * 0.06;
    const objetivoX = -estado.mirarY * 0.25 + Math.sin(t * 1.3) * 0.03;
    p.cabeza.rotation.y += (objetivoY - p.cabeza.rotation.y) * (quieto ? 1 : 0.08);
    p.cabeza.rotation.x += (objetivoX - p.cabeza.rotation.x) * (quieto ? 1 : 0.08);
    p.cabeza.rotation.z = Math.sin(t * 0.9 + 1) * 0.05 + (estado.expresion === "piensa" ? 0.14 : 0) + (estado.expresion === "curioso" ? -0.14 : 0);
    p.ojos.forEach((o) => {
      o.mirada.position.x = estado.mirarX * 0.03 + (estado.expresion === "piensa" ? 0.02 : 0);
      o.mirada.position.y = estado.mirarY * 0.025 + (estado.expresion === "piensa" ? 0.03 : 0);
    });
    p.copete.rotation.z = Math.sin(t * 2.4) * 0.05;
    p.cola.rotation.y = Math.sin(t * 1.8) * 0.12;

    // Parpadeo a intervalos naturales: el ojo se aplana y vuelve
    if (t > estado.proximoParpadeo && estado.parpadeoDesde < 0) estado.parpadeoDesde = t;
    let cierre = 0;
    if (estado.parpadeoDesde >= 0) {
      const fase = (t - estado.parpadeoDesde) / 0.16;
      cierre = fase < 1 ? Math.sin(fase * Math.PI) : 0;
      if (fase >= 1) {
        estado.parpadeoDesde = -1;
        estado.proximoParpadeo = t + 2.2 + Math.random() * 3.2;
      }
    }
    p.ojos.forEach((o) => (o.forma.scale.y = 1 - cierre * 0.9));

    // Alas en reposo, saludo o celebración
    let alaDer = 0.1;
    let alaIzq = -0.1;
    let salto = 0;
    if (estado.gesto) {
      const d = quieto ? (estado.gesto === "celebrar" ? 0.6 : 0.9) : t - estado.gestoDesde;
      if (estado.gesto === "saludar") {
        if (d < 2.2) {
          const subida = Math.min(1, d / 0.25) * Math.min(1, (2.2 - d) / 0.3);
          alaDer = 0.1 + subida * (2.0 + Math.sin(d * 14) * 0.35);
        } else estado.gesto = null;
      } else if (estado.gesto === "celebrar") {
        if (d < 1.8) {
          const fase = (d % 0.6) / 0.6;
          salto = Math.max(0, Math.sin(fase * Math.PI)) * 0.45;
          const aleteo = 1.6 + Math.sin(d * 22) * 0.5;
          alaDer = aleteo;
          alaIzq = -aleteo;
        } else estado.gesto = null;
      } else if (estado.gesto === "asentir") {
        if (d < 0.9) p.cabeza.rotation.x += Math.sin(d * 14) * 0.08;
        else estado.gesto = null;
      }
    }
    const suave = quieto ? 1 : 0.35;
    p.alas[1].rotation.z += (alaDer - p.alas[1].rotation.z) * suave;
    p.alas[0].rotation.z += (alaIzq - p.alas[0].rotation.z) * suave;
    p.tuti.position.y = salto;
    const squash = salto > 0 ? 1 + salto * 0.08 : 1;
    p.tuti.scale.set(2 - squash, squash, 2 - squash);
    sombra.scale.setScalar(1 - salto * 0.6);

    // Pico que se mueve mientras habla
    if (estado.hablando) p.picoAbajo.position.y = -0.09 - Math.abs(Math.sin(t * 16)) * 0.05;

    renderer.render(escena, camara);
  }

  // En reposo bastan 30 cuadros por segundo; los gestos se dibujan a 60
  let ultimoCuadro = 0;
  function bucle(ahora = 0) {
    cuadro = requestAnimationFrame(bucle);
    if (!visible || document.hidden) return;
    if (!estado.gesto && ahora - ultimoCuadro < 32) return;
    ultimoCuadro = ahora;
    animar();
  }

  medir();
  ponerPose(opciones.pose || "normal");
  if (quieto) {
    animar();
  } else {
    bucle();
  }

  // Ahorra batería: no dibuja mientras no se ve en pantalla
  const observador = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
  observador.observe(contenedor);
  const alRedimensionar = new ResizeObserver(() => {
    medir();
    if (quieto) animar();
  });
  alRedimensionar.observe(contenedor);

  const alMover = (e) => {
    const r = contenedor.getBoundingClientRect();
    estado.mirarX = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (innerWidth / 2)));
    estado.mirarY = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (innerHeight / 2)));
  };
  if (!quieto) addEventListener("pointermove", alMover, { passive: true });

  return {
    pose: (nombre) => {
      ponerPose(nombre);
      if (quieto) animar();
    },
    saludar: () => gesto("saludar"),
    celebrar: () => {
      ponerExpresion("contento");
      gesto("celebrar");
      setTimeout(() => ponerPose(estado.pose), 1900);
    },
    asentir: () => gesto("asentir"),
    hablar: (si) => {
      estado.hablando = !!si;
      if (!si) ponerExpresion(estado.expresion);
    },
    mirar: (x, y) => {
      estado.mirarX = x;
      estado.mirarY = y;
      if (quieto) animar();
    },
    dibujar: () => animar(),
    lienzo: renderer.domElement,
    destruir: () => {
      cancelAnimationFrame(cuadro);
      observador.disconnect();
      alRedimensionar.disconnect();
      removeEventListener("pointermove", alMover);
      escena.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
