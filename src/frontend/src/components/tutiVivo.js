// Tuti, el camaleón, con vida: cada ojo gira por su lado, parpadea, mece la cola, saluda, saca la lengua y cambia de color

const TutiVivo = (() => {
  const RUTA = "assets/tuti/vivo/";
  // Capas recortadas del render de ElevenLabs; las medidas van en % del lienzo cuadrado
  const POSES = {
    saludo: {
      partes: [
        {"nombre": "cola", "src": "saludo-cola.webp", "caja": [56.964, 50.357, 32.857, 34.286], "origen": [11.084, 58.118]},
        {"nombre": "ala", "src": "saludo-ala.webp", "caja": [10.179, 16.429, 17.321, 29.464], "origen": [70.802, 86.931]},
        {"nombre": "cuerpo", "src": "saludo-cuerpo.webp", "caja": [10.893, 2.321, 75.893, 95.357]},
        {"nombre": "piel", "src": "saludo-piel.webp", "caja": [10.893, 2.321, 75.893, 95.357]},
      ],
      ojos: [
        {
          caja: [30.179, 12.5, 8.393, 9.107],
          abertura: "polygon(92.2% 50.4%, 92.2% 54.5%, 92.1% 58.6%, 91.8% 62.9%, 90.7% 67.0%, 89.3% 71.2%, 87.3% 75.3%, 84.6% 79.0%, 81.6% 82.5%, 78.0% 85.7%, 73.8% 88.1%, 69.7% 90.7%, 65.2% 92.9%, 60.3% 94.1%, 55.2% 94.1%, 50.2% 93.4%, 45.4% 92.7%, 40.7% 91.6%, 35.9% 90.8%, 31.6% 88.9%, 27.9% 86.0%, 24.1% 83.5%, 20.6% 80.7%, 17.6% 77.4%, 14.8% 74.1%, 12.3% 70.6%, 9.8% 67.0%, 8.0% 63.0%, 6.8% 58.9%, 5.7% 54.7%, 5.2% 50.4%, 5.5% 46.1%, 6.4% 41.8%, 8.0% 37.8%, 10.0% 33.9%, 12.3% 30.2%, 14.8% 26.7%, 17.8% 23.5%, 20.9% 20.4%, 24.4% 17.7%, 28.1% 15.1%, 31.7% 12.1%, 35.9% 9.8%, 40.5% 8.3%, 45.2% 7.1%, 50.2% 5.6%, 55.4% 4.6%, 60.6% 5.3%, 65.5% 7.1%, 70.0% 9.4%, 73.5% 13.1%, 76.8% 16.6%, 79.9% 20.0%, 82.0% 24.0%, 83.9% 27.8%, 86.3% 31.2%, 88.6% 34.6%, 90.0% 38.5%, 90.9% 42.4%, 92.0% 46.3%)",
          centro: [50.191, 50.399],
          esclera: "saludo-esclera-izq.webp",
          iris: {"src": "saludo-iris-izq.webp", "caja": [21.277, 19.608, 87.234, 72.549]},
          mira: [35.589, 17.492],
        },
        {
          caja: [52.857, 16.607, 9.286, 9.286],
          abertura: "polygon(92.9% 50.7%, 92.8% 55.3%, 92.5% 59.8%, 90.6% 64.1%, 88.4% 68.0%, 86.0% 71.8%, 83.2% 75.1%, 80.2% 78.3%, 77.2% 81.3%, 73.8% 84.0%, 70.2% 86.4%, 66.4% 88.3%, 62.4% 90.1%, 58.3% 91.7%, 54.1% 92.9%, 49.6% 93.5%, 45.1% 94.1%, 40.4% 94.1%, 35.9% 93.1%, 31.3% 91.9%, 27.0% 90.0%, 23.0% 87.4%, 19.3% 84.5%, 15.8% 81.2%, 12.9% 77.4%, 10.3% 73.4%, 8.2% 69.2%, 6.3% 64.8%, 5.3% 60.2%, 5.0% 55.4%, 6.0% 50.7%, 7.1% 46.3%, 8.5% 42.0%, 10.2% 37.9%, 12.0% 34.0%, 14.5% 30.4%, 17.2% 27.2%, 19.8% 23.9%, 22.7% 20.8%, 26.0% 18.1%, 29.5% 15.9%, 33.0% 13.5%, 36.7% 10.8%, 40.7% 8.8%, 45.0% 6.8%, 49.6% 6.1%, 54.4% 5.6%, 59.1% 6.4%, 63.6% 7.8%, 67.9% 9.8%, 72.1% 11.9%, 75.9% 14.6%, 79.4% 17.7%, 83.1% 20.6%, 85.9% 24.4%, 88.5% 28.3%, 90.6% 32.5%, 92.0% 37.0%, 92.6% 41.6%, 92.8% 46.2%)",
          centro: [49.642, 50.74],
          esclera: "saludo-esclera-der.webp",
          iris: {"src": "saludo-iris-der.webp", "caja": [1.923, 13.462, 75.0, 75.0]},
          mira: [56.506, 21.313],
        },
      ],
      boca: [57.185, 28.641],
    },
    cara: {
      partes: [
        {"nombre": "cuerpo", "src": "cara-cuerpo.webp", "caja": [0, 0, 100, 100]},
      ],
      ojos: [
        {
          caja: [5.0, 39.375, 23.75, 25.625],
          abertura: "polygon(91.9% 50.4%, 91.9% 54.4%, 91.7% 58.5%, 91.5% 62.8%, 90.4% 66.9%, 89.0% 71.1%, 87.1% 75.2%, 84.4% 78.8%, 81.3% 82.4%, 77.8% 85.5%, 73.7% 88.0%, 69.5% 90.5%, 65.1% 92.7%, 60.2% 93.9%, 55.2% 93.9%, 50.3% 93.2%, 45.5% 92.5%, 40.8% 91.4%, 36.1% 90.6%, 31.8% 88.7%, 28.2% 85.8%, 24.4% 83.3%, 21.0% 80.5%, 18.0% 77.3%, 15.2% 74.0%, 12.7% 70.5%, 10.3% 66.9%, 8.5% 63.0%, 7.3% 58.8%, 6.2% 54.7%, 5.7% 50.4%, 6.0% 46.1%, 6.9% 41.8%, 8.5% 37.8%, 10.5% 33.9%, 12.7% 30.3%, 15.2% 26.7%, 18.2% 23.6%, 21.2% 20.5%, 24.8% 17.8%, 28.4% 15.2%, 31.9% 12.2%, 36.1% 9.9%, 40.6% 8.4%, 45.4% 7.2%, 50.3% 5.7%, 55.4% 4.7%, 60.6% 5.5%, 65.4% 7.2%, 69.9% 9.6%, 73.4% 13.2%, 76.7% 16.7%, 79.7% 20.1%, 81.8% 24.1%, 83.6% 27.9%, 86.0% 31.2%, 88.3% 34.7%, 89.7% 38.5%, 90.6% 42.4%, 91.7% 46.3%)",
          centro: [50.261, 50.37],
          esclera: "cara-esclera-izq.webp",
          iris: {"src": "cara-iris-izq.webp", "caja": [21.053, 17.073, 86.842, 75.61]},
          mira: [20.295, 53.41],
        },
        {
          caja: [68.75, 50.625, 25.625, 26.25],
          abertura: "polygon(94.1% 51.5%, 94.1% 56.0%, 93.7% 60.5%, 91.8% 64.7%, 89.5% 68.6%, 87.2% 72.3%, 84.3% 75.7%, 81.3% 78.8%, 78.2% 81.8%, 74.8% 84.5%, 71.1% 86.8%, 67.2% 88.7%, 63.2% 90.4%, 59.0% 92.1%, 54.7% 93.3%, 50.2% 93.8%, 45.6% 94.5%, 40.8% 94.4%, 36.2% 93.4%, 31.6% 92.2%, 27.2% 90.4%, 23.1% 87.9%, 19.4% 84.9%, 15.8% 81.7%, 12.9% 77.9%, 10.3% 74.0%, 8.1% 69.8%, 6.2% 65.4%, 5.1% 60.8%, 4.9% 56.1%, 5.9% 51.5%, 7.0% 47.0%, 8.4% 42.8%, 10.1% 38.7%, 12.0% 34.9%, 14.5% 31.3%, 17.2% 28.1%, 19.9% 24.9%, 22.8% 21.8%, 26.1% 19.2%, 29.7% 16.9%, 33.3% 14.5%, 37.0% 11.8%, 41.1% 9.8%, 45.5% 7.9%, 50.2% 7.2%, 55.0% 6.7%, 59.8% 7.5%, 64.4% 8.8%, 68.7% 10.8%, 73.0% 13.0%, 76.9% 15.6%, 80.4% 18.7%, 84.2% 21.6%, 87.0% 25.3%, 89.6% 29.2%, 91.8% 33.4%, 93.2% 37.8%, 93.9% 42.4%, 94.1% 47.0%)",
          centro: [50.194, 51.464],
          esclera: "cara-esclera-der.webp",
          iris: {"src": "cara-iris-der.webp", "caja": [0.0, 14.286, 80.488, 76.19]},
          mira: [78.92, 64.12],
        },
      ],
    },
  };
  // Poses de los módulos: la imagen de la pose y, encima, los ojos cerrados que se asoman al parpadear
  const POSES_SIMPLES = {
    tutor: { base: "../tuti-tutor.webp", parpados: { src: "tutor-parpados.webp", caja: [30.893, 19.107, 30.0, 12.857] } },
    habla: { base: "../tuti-habla.webp", parpados: { src: "habla-parpados.webp", caja: [29.107, 16.607, 29.643, 12.321] } },
    lee: { base: "../tuti-lee.webp", parpados: { src: "lee-parpados.webp", caja: [24.464, 22.321, 28.571, 10.0] } },
    piensa: { base: "../tuti-piensa.webp", parpados: { src: "piensa-parpados.webp", caja: [24.107, 15.893, 29.643, 16.429] } },
    vacio: { base: "../tuti-vacio.webp", parpados: { src: "vacio-parpados.webp", caja: [33.214, 15.714, 31.964, 15.893] } },
    normal: { base: "../tuti-normal.webp", parpados: { src: "normal-parpados.webp", caja: [28.75, 15.179, 31.429, 13.75] } },
  };
  Object.entries(POSES_SIMPLES).forEach(([pose, { base, parpados }]) => {
    POSES[pose] = { partes: [{ nombre: "cuerpo", src: base, caja: [0, 0, 100, 100] }], parpados, ojos: [] };
  });
  const CON_SOMBRA = new Set(["cola", "ala", "cuerpo"]);
  const vivos = new Set();
  const movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)");
  const punteroFino = window.matchMedia("(hover: hover) and (pointer: fine)");
  let puntero = null;
  let cuadroPendiente = false;

  /** Ubica un elemento con una caja [x, y, ancho, alto] en porcentajes. */
  function ubicar(el, [x, y, ancho, alto]) {
    el.style.left = `${x}%`;
    el.style.top = `${y}%`;
    el.style.width = `${ancho}%`;
    el.style.height = `${alto}%`;
  }

  function imagen(src, clase) {
    const img = document.createElement("img");
    img.src = RUTA + src;
    img.alt = "";
    img.className = clase;
    img.decoding = "async";
    img.draggable = false;
    return img;
  }

  function elemento(clase) {
    const el = document.createElement("span");
    el.className = clase;
    return el;
  }

  /** Un ojo de torreta: la abertura se cierra al parpadear y el iris se mueve adentro. */
  function armarOjo(ojo, numero) {
    const caja = elemento(`tv-ojo tv-ojo-${numero}`);
    ubicar(caja, ojo.caja);
    const abertura = elemento("tv-abertura");
    abertura.style.clipPath = ojo.abertura;
    abertura.style.transformOrigin = `${ojo.centro[0]}% ${ojo.centro[1]}%`;
    const iris = imagen(ojo.iris.src, "tv-iris");
    ubicar(iris, ojo.iris.caja);
    abertura.append(imagen(ojo.esclera, "tv-esclera"), iris);
    caja.appendChild(abertura);
    return caja;
  }

  /** La lengua sale desde la comisura de la boca hacia un lado. */
  function armarLengua([x, y]) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "tv-lengua");
    svg.setAttribute("viewBox", "0 0 200 40");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML =
      '<path d="M4 22 Q 80 16 160 19" stroke="#d9466f" stroke-width="13" stroke-linecap="round" fill="none"/>' +
      '<path d="M10 19 Q 80 13 156 16" stroke="#f08aac" stroke-width="4" stroke-linecap="round" fill="none"/>' +
      '<circle cx="172" cy="19" r="17" fill="#d9466f"/><circle cx="166" cy="13" r="6" fill="#f6a9c2"/>';
    svg.style.left = `${x - 1.5}%`;
    svg.style.top = `${y - 2.8}%`;
    return svg;
  }

  /** Arma a Tuti por capas con las mismas clases de la imagen que reemplaza. */
  function armar(img, pose) {
    const datos = POSES[pose];
    const clases = [...img.classList].filter((c) => c !== "tuti-saluda" && c !== "tuti-salta");
    const raiz = elemento(["tuti-vivo", `tuti-vivo-${pose}`, ...clases].join(" "));
    if (img.alt) {
      raiz.setAttribute("role", "img");
      raiz.setAttribute("aria-label", img.alt);
    } else {
      raiz.setAttribute("aria-hidden", "true");
    }
    datos.partes.forEach((parte) => {
      const capa = imagen(parte.src, `tv-parte tv-${parte.nombre}${CON_SOMBRA.has(parte.nombre) ? " tv-sombra" : ""}`);
      ubicar(capa, parte.caja);
      if (parte.origen) capa.style.transformOrigin = `${parte.origen[0]}% ${parte.origen[1]}%`;
      raiz.appendChild(capa);
    });
    if (datos.parpados) {
      const parpados = imagen(datos.parpados.src, "tv-parte tv-parpados");
      ubicar(parpados, datos.parpados.caja);
      raiz.appendChild(parpados);
    }
    datos.ojos.forEach((ojo, i) => raiz.appendChild(armarOjo(ojo, i + 1)));
    if (datos.boca) raiz.appendChild(armarLengua(datos.boca));
    raiz.miradas = datos.ojos.map((ojo) => ojo.mira);
    return raiz;
  }

  function azar(min, max) {
    return min + Math.random() * (max - min);
  }

  /** Cada Tuti lleva su propio reloj de parpadeos, miradas, saludos y lengüetazos. */
  function crearControl(raiz) {
    const control = { raiz, visible: false, temporizadores: {}, ultimoMovimiento: 0 };
    const conAlas = !!raiz.querySelector(".tv-ala");

    function programar(nombre, ms, fn) {
      clearTimeout(control.temporizadores[nombre]);
      control.temporizadores[nombre] = setTimeout(fn, ms);
    }

    function claseUnRato(clase, ms) {
      raiz.classList.remove(clase);
      void raiz.offsetWidth;
      raiz.classList.add(clase);
      programar(clase, ms, () => raiz.classList.remove(clase));
    }

    control.parpadear = () => {
      claseUnRato("parpadea", 260);
      // A veces parpadea dos veces seguidas
      if (Math.random() < 0.18) programar("doble", 320, () => claseUnRato("parpadea", 260));
    };

    control.mirarOjo = (n, x, y) => {
      raiz.style.setProperty(`--tv-mx${n}`, x.toFixed(3));
      raiz.style.setProperty(`--tv-my${n}`, y.toFixed(3));
    };

    control.mirar = (x, y) => {
      control.mirarOjo(1, x, y);
      control.mirarOjo(2, x, y);
    };

    control.saludar = () => claseUnRato("saluda", 1500);

    control.sacarLengua = () => {
      if (!movimientoReducido.matches) claseUnRato("lengua", 600);
    };

    control.celebrar = () => {
      claseUnRato("celebra", 2500);
      control.sacarLengua();
    };

    control.alAparecer = () => {
      if (conAlas && !movimientoReducido.matches) control.saludar();
      else control.parpadear();
    };

    function cicloParpadeo() {
      programar("parpadeo", azar(2800, 6000), () => {
        if (control.visible && !raiz.classList.contains("celebra")) control.parpadear();
        cicloParpadeo();
      });
    }

    // Cada ojo mira por su cuenta, como un camaleón de verdad
    function cicloOjo(n) {
      programar(`ojo${n}`, azar(1600, 4200), () => {
        const quieto = performance.now() - control.ultimoMovimiento > 3500;
        if (control.visible && quieto && !movimientoReducido.matches) {
          control.mirarOjo(n, azar(-1, 1), azar(-0.8, 0.7));
          programar(`vuelve${n}`, azar(900, 2200), () => control.mirarOjo(n, 0, 0));
        }
        cicloOjo(n);
      });
    }

    function cicloSaludo() {
      programar("saludo", azar(12000, 19000), () => {
        if (control.visible && conAlas && !movimientoReducido.matches) control.saludar();
        cicloSaludo();
      });
    }

    function cicloLengua() {
      programar("lengua-ciclo", azar(22000, 40000), () => {
        if (control.visible && conAlas) control.sacarLengua();
        cicloLengua();
      });
    }

    control.empezar = () => {
      cicloParpadeo();
      if (raiz.miradas.length) {
        cicloOjo(1);
        cicloOjo(2);
      }
      cicloSaludo();
      cicloLengua();
    };

    raiz.addEventListener("pointerdown", () => {
      control.parpadear();
      if (conAlas) {
        control.saludar();
        control.sacarLengua();
      }
    });
    return control;
  }

  /** Los dos ojos siguen al cursor (o al dedo cuando toca la pantalla). */
  function seguirPuntero() {
    cuadroPendiente = false;
    if (!puntero) return;
    vivos.forEach((control) => {
      if (!control.visible) return;
      const caja = control.raiz.getBoundingClientRect();
      if (!caja.width) return;
      control.raiz.miradas.forEach(([mx, my], i) => {
        const dx = puntero.x - (caja.left + (caja.width * mx) / 100);
        const dy = puntero.y - (caja.top + (caja.height * my) / 100);
        const distancia = Math.hypot(dx, dy) || 1;
        const fuerza = distancia / (distancia + caja.width * 0.6);
        control.mirarOjo(i + 1, (dx / distancia) * fuerza, (dy / distancia) * fuerza);
      });
      control.ultimoMovimiento = performance.now();
      clearTimeout(control.temporizadores.vuelve);
      control.temporizadores.vuelve = setTimeout(() => control.mirar(0, 0), 3500);
    });
  }

  function alMoverPuntero(e) {
    if (movimientoReducido.matches) return;
    if (e.pointerType === "mouse" && !punteroFino.matches) return;
    puntero = { x: e.clientX, y: e.clientY };
    if (!cuadroPendiente) {
      cuadroPendiente = true;
      requestAnimationFrame(seguirPuntero);
    }
  }

  // Al aparecer en pantalla saluda (o parpadea, si es solo la cara); escondido no gasta nada
  const observador = "IntersectionObserver" in window
    ? new IntersectionObserver((entradas) => {
        entradas.forEach((entrada) => {
          vivos.forEach((control) => {
            if (control.raiz !== entrada.target) return;
            const antes = control.visible;
            control.visible = entrada.isIntersecting && !document.hidden;
            if (!antes && control.visible) {
              clearTimeout(control.temporizadores.aparece);
              control.temporizadores.aparece = setTimeout(control.alAparecer, 450);
            }
          });
        });
      })
    : null;

  // Al volver a la pestaña se vuelve a medir si cada Tuti está a la vista
  document.addEventListener("visibilitychange", () => {
    vivos.forEach((control) => {
      if (document.hidden) control.visible = false;
      else if (observador) {
        observador.unobserve(control.raiz);
        observador.observe(control.raiz);
      } else control.visible = true;
    });
  });

  /** Cambia la imagen fija por Tuti animado cuando todas sus capas ya cargaron. */
  function montar(img, pose = "saludo") {
    if (!img || img.tutiVivo || !POSES[pose]) return Promise.resolve(null);
    img.tutiVivo = true;
    const raiz = armar(img, pose);
    const capas = [...raiz.querySelectorAll("img")];
    const listas = capas.map((c) => (c.decode ? c.decode().catch(() => null) : Promise.resolve()));
    return Promise.all(listas).then(() => {
      if (capas.some((c) => !c.naturalWidth) || !img.isConnected) return null;
      img.replaceWith(raiz);
      const control = crearControl(raiz);
      raiz.tuti = control;
      vivos.add(control);
      if (observador) observador.observe(raiz);
      else control.visible = true;
      control.empezar();
      return control;
    });
  }

  /** Busca el Tuti vivo dentro de un contenedor y le pide un gesto. */
  function gesto(selector, nombre) {
    const raiz = document.querySelector(`${selector} .tuti-vivo, ${selector}.tuti-vivo`);
    if (!raiz || !raiz.tuti) return false;
    if (nombre === "celebrar") raiz.tuti.celebrar();
    else raiz.tuti.saludar();
    return true;
  }

  document.addEventListener("pointermove", alMoverPuntero, { passive: true });
  document.addEventListener("pointerdown", alMoverPuntero, { passive: true });

  return { montar, gesto };
})();
