// Tuti en 3D: un solo modelo con poses, expresiones, accesorios y animaciones
import * as THREE from "../vendor/three.module.min.js";

const COLORES = {
  verde: 0x22b35b,
  verdeOscuro: 0x15803d,
  verdeClaro: 0x4ade80,
  crema: 0xfff0b3,
  mejilla: 0xffd166,
  pico: 0xffb020,
  picoOscuro: 0xf08c00,
  pata: 0xf59e0b,
  ojo: 0xffffff,
  iris: 0x3b2a1a,
  pupila: 0x0b0f14,
  ceja: 0x14532d,
  oro: 0xf5b301,
  tinta: 0x0b3d24,
};

/** Material de vinilo suave: el acabado de un juguete de diseño. */
function vinilo(color, extra = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.42,
    metalness: 0,
    clearcoat: 0.35,
    clearcoatRoughness: 0.35,
    sheen: 0.4,
    sheenRoughness: 0.6,
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

/** Pluma con forma de gota: base ancha y punta redondeada. */
function pluma(largo, ancho, material) {
  const perfil = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    perfil.push(new THREE.Vector2(Math.sin(Math.PI * t) * ancho * (1 - t * 0.55), t * largo));
  }
  return new THREE.Mesh(new THREE.LatheGeometry(perfil, 24), material);
}

/** Un ojo completo: globo, iris, pupila, brillos y párpado que baja al parpadear. */
function crearOjo(mat, lado) {
  const ojo = new THREE.Group();
  const globo = esfera(0.3, mat.ojo);
  globo.scale.set(1, 1.12, 0.85);
  ojo.add(globo);

  const mirada = new THREE.Group();
  const iris = esfera(0.17, mat.iris);
  iris.scale.set(1, 1.1, 0.5);
  iris.position.z = 0.215;
  const pupila = esfera(0.1, mat.pupila);
  pupila.scale.set(1, 1.1, 0.5);
  pupila.position.z = 0.255;
  const brillo = esfera(0.055, mat.brillo, 16);
  brillo.position.set(0.06 * lado, 0.08, 0.3);
  const brilloChico = esfera(0.026, mat.brillo, 12);
  brilloChico.position.set(-0.05 * lado, -0.06, 0.3);
  mirada.add(iris, pupila, brillo, brilloChico);
  ojo.add(mirada);

  // Párpado: casquete del color del plumaje que gira para cerrar el ojo
  const parpado = new THREE.Mesh(
    new THREE.SphereGeometry(0.312, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.5),
    mat.cabeza,
  );
  parpado.scale.set(1, 1.12, 0.87);
  parpado.rotation.x = -1.75;
  ojo.add(parpado);

  // Ojo feliz: un arco que reemplaza el globo cuando Tuti sonríe con los ojos
  const arco = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 12, 32, Math.PI), mat.pupila);
  arco.position.z = 0.24;
  arco.visible = false;
  ojo.add(arco);

  return { ojo, mirada, parpado, globo, arco };
}

/** Accesorios que Tuti usa según la actividad. */
function crearAccesorios(mat) {
  const acc = {};

  const birrete = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.22, 40), mat.tinta);
  const tabla = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.06, 1.15), mat.tinta);
  tabla.position.y = 0.14;
  tabla.rotation.y = Math.PI / 4;
  const boton = esfera(0.05, mat.oro, 16);
  boton.position.y = 0.19;
  const cordon = capsula(0.018, 0.42, mat.oro);
  cordon.position.set(0.38, -0.02, 0.18);
  cordon.rotation.z = 0.15;
  const borla = esfera(0.06, mat.oro, 16);
  borla.position.set(0.41, -0.26, 0.18);
  birrete.add(base, tabla, boton, cordon, borla);
  birrete.position.set(0, 1.0, -0.05);
  birrete.rotation.set(-0.12, 0, 0.1);
  acc.birrete = birrete;

  const audifonos = new THREE.Group();
  const diadema = new THREE.Mesh(new THREE.TorusGeometry(1.14, 0.075, 16, 64, Math.PI), mat.tinta);
  diadema.position.y = 0.05;
  audifonos.add(diadema);
  for (const lado of [-1, 1]) {
    const copa = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.2, 40), mat.tinta);
    copa.rotation.z = Math.PI / 2;
    copa.position.set(1.14 * lado, 0, 0);
    const almohada = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.08, 16, 40), mat.verdeClaro);
    almohada.rotation.y = Math.PI / 2;
    almohada.position.set(1.04 * lado, 0, 0);
    audifonos.add(copa, almohada);
  }
  audifonos.position.set(0, -0.02, -0.05);
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
  libro.position.set(0.05, -1.0, 0.98);
  libro.rotation.set(-0.15, 0.25, 0.08);
  libro.scale.setScalar(0.82);
  acc.libro = libro;

  const microfono = new THREE.Group();
  const mango = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.6, 24), mat.tinta);
  const cabezaMic = esfera(0.17, mat.metal, 32);
  cabezaMic.position.y = 0.36;
  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 12, 32), mat.oro);
  aro.position.y = 0.28;
  aro.rotation.x = Math.PI / 2;
  microfono.add(mango, cabezaMic, aro);
  microfono.position.set(0.74, -0.62, 0.72);
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
  trofeo.position.set(-1.05, -0.62, 0.6);
  trofeo.scale.setScalar(1.15);
  acc.trofeo = trofeo;

  for (const k of Object.keys(acc)) acc[k].visible = false;
  return acc;
}

/** Arma el personaje completo y devuelve sus partes animables. */
function crearTuti() {
  const mat = {
    cabeza: vinilo(COLORES.verde),
    cuerpo: vinilo(COLORES.verde),
    oscuro: vinilo(COLORES.verdeOscuro),
    verdeClaro: vinilo(COLORES.verdeClaro),
    verdeOscuro: vinilo(COLORES.verdeOscuro),
    crema: vinilo(COLORES.crema, { roughness: 0.55, clearcoat: 0.1 }),
    mejilla: vinilo(COLORES.mejilla, { roughness: 0.6, clearcoat: 0 }),
    pico: vinilo(COLORES.pico, { roughness: 0.3, clearcoat: 0.6 }),
    picoOscuro: vinilo(COLORES.picoOscuro, { roughness: 0.35 }),
    pata: vinilo(COLORES.pata, { roughness: 0.4 }),
    ojo: new THREE.MeshPhysicalMaterial({ color: COLORES.ojo, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }),
    iris: new THREE.MeshPhysicalMaterial({ color: COLORES.iris, roughness: 0.25, clearcoat: 1 }),
    pupila: new THREE.MeshStandardMaterial({ color: COLORES.pupila, roughness: 0.2 }),
    brillo: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    ceja: vinilo(COLORES.ceja, { roughness: 0.6 }),
    oro: new THREE.MeshPhysicalMaterial({ color: COLORES.oro, metalness: 0.25, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15 }),
    tinta: vinilo(COLORES.tinta, { roughness: 0.5 }),
    papel: new THREE.MeshStandardMaterial({ color: 0xfffdf5, roughness: 0.9 }),
    metal: new THREE.MeshPhysicalMaterial({ color: 0xb8c2cc, metalness: 0.3, roughness: 0.35, clearcoat: 0.6 }),
  };

  const tuti = new THREE.Group();

  // Cuerpo en forma de huevo con barriga crema
  const cuerpo = new THREE.Group();
  const torso = esfera(0.86, mat.cuerpo, 64);
  torso.scale.set(1, 1.0, 0.92);
  const barriga = esfera(0.66, mat.crema, 48);
  barriga.scale.set(0.95, 1.08, 0.55);
  barriga.position.set(0, -0.02, 0.5);
  cuerpo.add(torso, barriga);
  cuerpo.position.y = -0.98;
  tuti.add(cuerpo);

  // Alas que salen del hombro: el pivote está arriba para poder saludar
  const alas = [];
  for (const lado of [-1, 1]) {
    const pivote = new THREE.Group();
    pivote.position.set(0.76 * lado, -0.66, 0.05);
    const ala = esfera(0.42, mat.oscuro, 40);
    ala.scale.set(0.42, 1, 0.75);
    ala.position.set(0.12 * lado, -0.38, 0);
    ala.rotation.z = 0.25 * lado;
    const punta = pluma(0.38, 0.13, mat.oscuro);
    punta.rotation.z = Math.PI + 0.35 * lado;
    punta.position.set(0.18 * lado, -0.72, -0.02);
    pivote.add(ala, punta);
    pivote.rotation.z = 0.12 * lado;
    alas.push(pivote);
    tuti.add(pivote);
  }

  // Patas
  for (const lado of [-1, 1]) {
    const pata = new THREE.Group();
    for (const dedo of [-0.35, 0, 0.35]) {
      const d = capsula(0.065, 0.18, mat.pata);
      d.rotation.x = Math.PI / 2;
      d.rotation.y = dedo;
      d.position.set(Math.sin(dedo) * 0.12, 0, 0.12);
      pata.add(d);
    }
    pata.position.set(0.32 * lado, -1.82, 0.25);
    tuti.add(pata);
  }

  // Cola
  const cola = new THREE.Group();
  for (const giro of [-0.35, 0, 0.35]) {
    const p = pluma(0.55, 0.16, mat.oscuro);
    p.rotation.set(-2.2, 0, giro);
    cola.add(p);
  }
  cola.position.set(0, -1.35, -0.7);
  tuti.add(cola);

  // Cabeza grande, como un personaje chibi, con su propio pivote para girar
  const cabeza = new THREE.Group();
  cabeza.position.y = 0.26;
  const craneo = esfera(1.05, mat.cabeza, 72);
  craneo.scale.set(1.08, 0.97, 0.97);
  cabeza.add(craneo);

  // Antifaz claro alrededor de los ojos y mejillas
  for (const lado of [-1, 1]) {
    const mejilla = esfera(0.2, mat.mejilla, 32);
    mejilla.scale.set(1, 0.72, 0.35);
    mejilla.position.set(0.66 * lado, -0.3, 0.74);
    mejilla.rotation.y = 0.62 * lado;
    cabeza.add(mejilla);
    const antifaz = esfera(0.42, mat.verdeClaro, 40);
    antifaz.scale.set(0.95, 1.02, 0.42);
    antifaz.position.set(0.36 * lado, 0.12, 0.7);
    antifaz.rotation.y = 0.32 * lado;
    cabeza.add(antifaz);
  }


  // Ojos
  const ojos = [];
  for (const lado of [-1, 1]) {
    const o = crearOjo(mat, lado);
    o.ojo.position.set(0.36 * lado, 0.12, 0.86);
    o.ojo.rotation.y = 0.32 * lado;
    cabeza.add(o.ojo);
    ojos.push(o);
  }

  // Cejas para dar expresión
  const cejas = [];
  for (const lado of [-1, 1]) {
    const c = capsula(0.036, 0.16, mat.ceja);
    c.rotation.z = Math.PI / 2 - 0.12 * lado;
    c.position.set(0.37 * lado, 0.52, 0.98);
    c.rotation.y = 0.3 * lado;
    cabeza.add(c);
    cejas.push(c);
  }

  // Pico de dos partes para poder hablar y sonreír
  const pico = new THREE.Group();
  const picoArriba = esfera(0.31, mat.pico, 40);
  picoArriba.scale.set(1.1, 0.72, 1.0);
  const puntaPico = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.34, 32), mat.pico);
  puntaPico.rotation.x = Math.PI / 2 + 0.9;
  puntaPico.position.set(0, -0.12, 0.2);
  const picoAbajo = esfera(0.2, mat.picoOscuro, 32);
  picoAbajo.scale.set(1.05, 0.5, 0.8);
  picoAbajo.position.set(0, -0.12, 0.02);
  pico.add(picoArriba, puntaPico, picoAbajo);
  pico.position.set(0, -0.2, 1.0);
  cabeza.add(pico);

  // Copete de tres plumas, como el Tuti de siempre
  const copete = new THREE.Group();
  [[-0.2, 0.42, 0.42], [0, 0.55, 0], [0.2, 0.42, -0.42]].forEach(([x, largo, giro]) => {
    const p = pluma(largo, 0.13, x === 0 ? mat.cuerpo : mat.verdeClaro);
    p.position.set(x, 0, 0);
    p.rotation.set(-0.25, 0, giro);
    copete.add(p);
  });
  copete.position.set(0, 0.92, 0.1);
  cabeza.add(copete);

  tuti.add(cabeza);

  const accesorios = crearAccesorios(mat);
  cabeza.add(accesorios.birrete, accesorios.audifonos);
  tuti.add(accesorios.libro, accesorios.microfono, accesorios.trofeo);

  return { tuti, cuerpo, cabeza, alas, ojos, cejas, picoAbajo, copete, cola, accesorios };
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
  renderer.toneMappingExposure = 1.08;
  renderer.domElement.className = "tuti3d-lienzo";
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.setAttribute("aria-label", opciones.etiqueta || "Tuti, your English tutor");
  contenedor.appendChild(renderer.domElement);

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  if (opciones.encuadre === "cara") {
    camara.position.set(0, 0.32, 5.6);
    camara.lookAt(0, 0.22, 0);
  } else {
    camara.position.set(0, 0.05, 9.2);
    camara.lookAt(0, -0.35, 0);
  }

  // Luz de estudio: principal cálida, relleno frío, contraluz que separa del fondo
  escena.add(new THREE.HemisphereLight(0xffffff, 0xd8f5e3, 1.25));
  const principal = new THREE.DirectionalLight(0xfff4e0, 2.4);
  principal.position.set(3, 5, 6);
  const relleno = new THREE.DirectionalLight(0xe0f2ff, 0.8);
  relleno.position.set(-5, 1, 4);
  const contraluz = new THREE.DirectionalLight(0xffffff, 1.6);
  contraluz.position.set(-2, 4, -6);
  escena.add(principal, relleno, contraluz);

  // Sombra de contacto suave bajo las patas
  const lienzoSombra = document.createElement("canvas");
  lienzoSombra.width = lienzoSombra.height = 128;
  const g = lienzoSombra.getContext("2d");
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, "rgba(6,60,32,0.35)");
  grad.addColorStop(1, "rgba(6,60,32,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const sombra = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 0.9),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(lienzoSombra), transparent: true, depthWrite: false }),
  );
  sombra.rotation.x = -Math.PI / 2;
  sombra.position.y = -1.86;
  escena.add(sombra);

  const p = crearTuti();
  escena.add(p.tuti);

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
      o.globo.visible = !feliz;
      o.mirada.visible = !feliz;
      o.parpado.visible = !feliz;
      o.arco.visible = feliz;
    });
    const altura = { atento: 0.56, curioso: 0.6, piensa: 0.58, feliz: 0.54 }[nombre] || 0.52;
    p.cejas.forEach((c, i) => {
      const lado = i === 0 ? -1 : 1;
      c.position.y = altura;
      c.rotation.z = Math.PI / 2 + (nombre === "piensa" ? (lado > 0 ? 0.3 : -0.12) : -0.12 * lado);
    });
    p.picoAbajo.position.y = nombre === "feliz" || nombre === "contento" ? -0.16 : -0.12;
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
    p.tuti.position.y = 0;
    p.tuti.rotation.y = Math.sin(t * 0.6) * 0.08;

    // La cabeza sigue al puntero con suavidad, o hace su propio vaivén
    const objetivoY = estado.mirarX * 0.45 + Math.sin(t * 0.9) * 0.06;
    const objetivoX = -estado.mirarY * 0.25 + Math.sin(t * 1.3) * 0.03;
    p.cabeza.rotation.y += (objetivoY - p.cabeza.rotation.y) * 0.08;
    p.cabeza.rotation.x += (objetivoX - p.cabeza.rotation.x) * 0.08;
    p.cabeza.rotation.z = Math.sin(t * 0.9 + 1) * 0.05 + (estado.expresion === "piensa" ? 0.18 : 0) + (estado.expresion === "curioso" ? -0.14 : 0);
    p.ojos.forEach((o) => {
      o.mirada.position.x = estado.mirarX * 0.05;
      o.mirada.position.y = estado.mirarY * 0.04 + (estado.expresion === "piensa" ? 0.06 : 0);
    });
    p.copete.rotation.z = Math.sin(t * 2.4) * 0.05;
    p.cola.rotation.y = Math.sin(t * 1.8) * 0.12;

    // Parpadeo a intervalos naturales
    if (t > estado.proximoParpadeo && estado.parpadeoDesde < 0) estado.parpadeoDesde = t;
    let cierre = 0;
    if (estado.parpadeoDesde >= 0) {
      const f = (t - estado.parpadeoDesde) / 0.16;
      cierre = f < 1 ? Math.sin(f * Math.PI) : 0;
      if (f >= 1) {
        estado.parpadeoDesde = -1;
        estado.proximoParpadeo = t + 2.2 + Math.random() * 3.2;
      }
    }
    p.ojos.forEach((o) => (o.parpado.rotation.x = -1.75 + cierre * 1.6));

    // Alas en reposo, saludo o celebración
    let alaDer = 0.12;
    let alaIzq = -0.12;
    let salto = 0;
    if (estado.gesto) {
      const d = quieto ? (estado.gesto === "celebrar" ? 0.6 : 0.9) : t - estado.gestoDesde;
      if (estado.gesto === "saludar") {
        if (d < 2.2) {
          const subida = Math.min(1, d / 0.25) * Math.min(1, (2.2 - d) / 0.3);
          alaDer = 0.12 + subida * (2.0 + Math.sin(d * 14) * 0.35);
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
    if (estado.hablando) p.picoAbajo.position.y = -0.12 - Math.abs(Math.sin(t * 16)) * 0.08;

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
