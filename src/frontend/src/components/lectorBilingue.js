// Lector bilingüe de Scene Mode y de los clásicos: líneas en inglés con el español encima, leídas en voz alta palabra por palabra

const LectorBilingue = (() => {
  /** Pone las palabras de una línea, cada una en su elemento para el marcador; las de letras se traducen al tocarlas. */
  function ponerPalabras(contenedor, linea, clase, traducibles) {
    LecturaGuiada.partirEnPiezas(linea).forEach((pieza) => {
      if (!pieza.palabra) {
        contenedor.appendChild(document.createTextNode(pieza.texto));
        return;
      }
      const palabra = document.createElement("span");
      palabra.className = clase;
      palabra.textContent = pieza.texto;
      if (traducibles && /[A-Za-z]/.test(pieza.texto)) {
        palabra.classList.add("palabra");
        palabra.addEventListener("click", () =>
          Traductor.mostrar({ palabra: pieza.texto, contexto: linea, anclaje: palabra }),
        );
      }
      contenedor.appendChild(palabra);
    });
  }

  /** Pinta la página: cada línea con su número para oírla y la traducción encima. */
  function pintarRenglones(lista, { lineas, traducciones, alEscuchar }) {
    lista.innerHTML = "";
    lineas.forEach((linea, i) => {
      const renglon = document.createElement("li");
      renglon.className = "escena-renglon";
      renglon.dataset.linea = String(i);

      const numero = document.createElement("button");
      numero.type = "button";
      numero.className = "escena-numero";
      numero.setAttribute("aria-label", `Listen to line ${i + 1}`);
      numero.innerHTML =
        `<span class="escena-numero-cifra" aria-hidden="true">${i + 1}</span>` +
        Icono.svg("fa-volume-high", "escena-numero-voz") +
        Icono.svg("fa-check", "escena-numero-hecha");
      numero.addEventListener("click", () => alEscuchar(i));

      const textos = document.createElement("div");
      textos.className = "escena-textos";
      if (traducciones) {
        const es = document.createElement("p");
        es.className = "escena-es";
        es.lang = "es";
        es.textContent = traducciones[i];
        textos.appendChild(es);
      }
      const en = document.createElement("p");
      en.className = "escena-en";
      en.lang = "en";
      ponerPalabras(en, linea, "escena-palabra", true);
      textos.appendChild(en);

      renglon.append(numero, textos);
      lista.appendChild(renglon);
    });
  }

  /** Pone una línea en los subtítulos de la pantalla, con el español debajo si lo hay. */
  function pintarSubtitulo(zona, linea, traduccion) {
    zona.innerHTML = "";
    const en = document.createElement("p");
    en.className = "escena-subtitulo-en";
    const caja = document.createElement("span");
    ponerPalabras(caja, linea, "escena-sub-palabra", false);
    en.appendChild(caja);
    zona.appendChild(en);
    if (traduccion) {
      const es = document.createElement("p");
      es.className = "escena-subtitulo-es";
      const texto = document.createElement("span");
      texto.textContent = traduccion;
      es.appendChild(texto);
      zona.appendChild(es);
    }
  }

  /** Lee una línea marcando cada palabra mientras suena; resuelve cuando termina o se corta. */
  function narrar(renglon, linea, { vigente = () => true, subtitulo = null } = {}) {
    return new Promise((listo) => {
      if (!renglon || !vigente()) {
        listo();
        return;
      }
      const palabras = [...renglon.querySelectorAll(".escena-palabra")];
      const subtitulos = subtitulo ? [...subtitulo.querySelectorAll(".escena-sub-palabra")] : [];
      const piezas = LecturaGuiada.partirEnPiezas(linea);
      const marcas = LecturaGuiada.marcasDeTiempo(piezas);
      const estimado = LecturaGuiada.duracionEstimada(piezas, VozIngles.RITMO_INGLES);
      let cuadro = 0;
      let reloj = 0;
      let seguro = 0;
      let ultimoAviso = 0;
      let terminado = false;

      const marcar = (n) => {
        palabras.forEach((p, j) => p.classList.toggle("sonando", j === n));
        subtitulos.forEach((p, j) => p.classList.toggle("sonando", j === n));
      };
      const fin = () => {
        if (terminado) return;
        terminado = true;
        cancelAnimationFrame(cuadro);
        clearInterval(reloj);
        clearTimeout(seguro);
        marcar(-1);
        renglon.classList.remove("narrando");
        listo();
      };
      // Por si la voz nunca avisa que terminó: primero espera que arranque y luego lo que dure
      const vigilar = (ms) => {
        clearTimeout(seguro);
        seguro = setTimeout(fin, ms);
      };

      renglon.classList.add("narrando");
      vigilar(15000);

      VozIngles.leer(linea, {
        idioma: "en",
        eventos: {
          alEmpezar: (info) => {
            if (terminado) return;
            if (info && info.audio) {
              const audio = info.audio;
              vigilar((Number.isFinite(audio.duration) ? audio.duration * 1000 : estimado * 2) + 3000);
              const seguir = () => {
                marcar(LecturaGuiada.palabraEnFraccion(marcas, LecturaGuiada.fraccionDeAudio(audio.currentTime, audio.duration)));
                cuadro = requestAnimationFrame(seguir);
              };
              seguir();
              return;
            }
            // La voz del navegador avisa cada palabra; si no lo hace, se marca con el reloj
            vigilar(estimado * 2 + 3000);
            const inicio = performance.now();
            reloj = setInterval(() => {
              if (performance.now() - ultimoAviso < 1200) return;
              marcar(LecturaGuiada.palabraEnFraccion(marcas, (performance.now() - inicio) / estimado));
            }, 90);
          },
          alPalabra: (evento) => {
            if (terminado || (evento.name && evento.name !== "word")) return;
            ultimoAviso = performance.now();
            marcar(LecturaGuiada.palabraEnCaracter(piezas, evento.charIndex));
          },
          alTerminar: fin,
        },
      })
        .then((sono) => {
          if (!sono) fin();
        })
        .catch(fin);
    });
  }

  /** Lleva la línea a la vista cuando quedó fuera de la pantalla. */
  function mostrar(renglon) {
    if (!renglon) return;
    const caja = renglon.getBoundingClientRect();
    if (caja.top < 80 || caja.bottom > window.innerHeight - 96) {
      const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      renglon.scrollIntoView({ block: "center", behavior: suave ? "smooth" : "auto" });
    }
  }

  return { pintarRenglones, pintarSubtitulo, narrar, mostrar };
})();
