// Revisa la gramática y la ortografía de lo que escribe el estudiante con LanguageTool, desde su propio navegador

const API_LANGUAGETOOL = "https://api.languagetool.org/v2/check";
const LARGO_MAXIMO_REVISION = 5000; // la API pública acepta hasta 20 KB; aquí nadie escribe tanto
const MAX_SUGERENCIAS = 3;

// Tipo de error según LanguageTool, con su nombre en inglés y la ayuda en español
const TIPOS_ERROR = {
  ortografia: { en: "Spelling", es: "Ortografía" },
  gramatica: { en: "Grammar", es: "Gramática" },
  mayusculas: { en: "Capital letters", es: "Mayúsculas" },
  puntuacion: { en: "Punctuation", es: "Puntuación" },
  estilo: { en: "Style", es: "Estilo" },
};

/** Clasifica un hallazgo de LanguageTool en uno de los tipos que muestra la app. */
function tipoDeHallazgo(m) {
  const categoria = String((m.rule && m.rule.category && m.rule.category.id) || "").toUpperCase();
  const problema = String((m.rule && m.rule.issueType) || "").toLowerCase();
  if (problema === "misspelling" || categoria === "TYPOS") return "ortografia";
  if (categoria === "CASING") return "mayusculas";
  if (problema === "typographical" || categoria === "PUNCTUATION" || categoria === "TYPOGRAPHY") return "puntuacion";
  if (problema === "grammar" || categoria === "GRAMMAR") return "gramatica";
  return "estilo";
}

/** Deja los hallazgos listos para pintar, en el orden en que aparecen en el texto. */
function resumirHallazgos(texto, matches) {
  return (Array.isArray(matches) ? matches : [])
    .filter((m) => Number.isInteger(m.offset) && Number.isInteger(m.length) && m.offset + m.length <= texto.length)
    .map((m) => ({
      inicio: m.offset,
      largo: m.length,
      fragmento: texto.slice(m.offset, m.offset + m.length),
      mensaje: m.message || m.shortMessage || "",
      tipo: tipoDeHallazgo(m),
      sugerencias: (m.replacements || [])
        .map((r) => r.value)
        .filter((v) => typeof v === "string")
        .slice(0, MAX_SUGERENCIAS),
    }))
    .sort((a, b) => a.inicio - b.inicio);
}

/** Cambia el fragmento por la sugerencia y corre los demás hallazgos para que sigan apuntando bien. */
function aplicarSugerencia(texto, hallazgos, indice, reemplazo) {
  const h = hallazgos[indice];
  if (!h) return { texto, hallazgos };
  const nuevo = texto.slice(0, h.inicio) + reemplazo + texto.slice(h.inicio + h.largo);
  const corrimiento = reemplazo.length - h.largo;
  const restantes = hallazgos
    .filter((_, i) => i !== indice)
    .filter((o) => o.inicio + o.largo <= h.inicio || o.inicio >= h.inicio + h.largo)
    .map((o) => (o.inicio >= h.inicio + h.largo ? { ...o, inicio: o.inicio + corrimiento } : o));
  return { texto: nuevo, hallazgos: restantes };
}

/** Pide la revisión a la API pública; cada estudiante la llama desde su navegador, con su propio cupo. */
async function revisarTexto(texto) {
  const cuerpo = new URLSearchParams({
    text: texto.slice(0, LARGO_MAXIMO_REVISION),
    language: "en-US",
    motherTongue: "es",
  });
  const resp = await fetch(API_LANGUAGETOOL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: cuerpo,
  });
  if (resp.status === 429) throw new Error("demasiadas");
  if (!resp.ok) throw new Error(`LanguageTool respondió ${resp.status}`);
  const datos = await resp.json();
  return resumirHallazgos(texto, datos.matches);
}

/** Dice si el estudiante tiene encendidas las explicaciones en español. */
function ayudaEnEspanol() {
  const casilla = typeof document !== "undefined" && document.getElementById("ayuda-espanol-check");
  return Boolean(casilla && casilla.checked);
}

/** Pone el botón "Check my English" debajo de un campo y pinta los errores que encuentre. */
function conectarRevisor(entrada, { despuesDe = entrada } = {}) {
  if (!entrada || entrada.dataset.revisor) return;
  entrada.dataset.revisor = "1";

  const caja = document.createElement("div");
  caja.className = "revisor";
  caja.innerHTML = `
    <button type="button" class="btn-secundario revisor-boton">${Icono.svg("fa-spell-check")}<span>Check my English</span></button>
    <div class="revisor-resultado oculto" aria-live="polite"></div>`;
  despuesDe.insertAdjacentElement("afterend", caja);

  const boton = caja.querySelector(".revisor-boton");
  const etiqueta = boton.querySelector("span");
  const zona = caja.querySelector(".revisor-resultado");
  let hallazgos = [];
  let turno = 0; // cada limpieza o revisión nueva deja sin efecto las respuestas que lleguen tarde

  const limpiar = () => {
    turno += 1;
    hallazgos = [];
    zona.classList.add("oculto");
    zona.innerHTML = "";
  };

  const pie = () => {
    const p = document.createElement("p");
    p.className = "revisor-pie";
    const enlace = document.createElement("a");
    enlace.href = "https://languagetool.org";
    enlace.target = "_blank";
    enlace.rel = "noopener";
    enlace.textContent = "LanguageTool";
    p.append("Checked by ", enlace);
    return p;
  };

  const pintar = () => {
    zona.innerHTML = "";
    zona.classList.remove("oculto");
    const espanol = ayudaEnEspanol();

    if (!hallazgos.length) {
      const bien = document.createElement("p");
      bien.className = "revisor-bien";
      bien.innerHTML = Icono.svg("fa-check");
      bien.append(espanol ? " No mistakes found. ¡Bien escrito!" : " No mistakes found. Well written!");
      zona.append(bien, pie());
      return;
    }

    const titulo = document.createElement("p");
    titulo.className = "revisor-titulo";
    titulo.textContent = hallazgos.length === 1 ? "1 thing to check" : `${hallazgos.length} things to check`;
    zona.appendChild(titulo);

    const texto = entrada.value;
    hallazgos.forEach((h, i) => {
      const item = document.createElement("div");
      item.className = `revisor-item revisor-${h.tipo}`;

      const cabeza = document.createElement("div");
      cabeza.className = "revisor-cabeza";
      const tipo = document.createElement("span");
      tipo.className = "revisor-tipo";
      tipo.textContent = TIPOS_ERROR[h.tipo][espanol ? "es" : "en"];
      const frag = document.createElement("span");
      frag.className = "revisor-fragmento";
      // Se muestra la palabra con un poco de contexto para que se ubique en su texto
      const antes = texto.slice(Math.max(0, h.inicio - 18), h.inicio).replace(/^\S*\s/, "");
      const despues = texto.slice(h.inicio + h.largo, h.inicio + h.largo + 18).replace(/\s\S*$/, "");
      const marca = document.createElement("mark");
      marca.textContent = h.fragmento;
      frag.append(antes ? `…${antes}` : "", marca, despues ? `${despues}…` : "");
      cabeza.append(tipo, frag);

      const mensaje = document.createElement("p");
      mensaje.className = "revisor-mensaje";
      mensaje.lang = "en";
      mensaje.textContent = h.mensaje;

      item.append(cabeza, mensaje);

      if (h.sugerencias.length) {
        const fila = document.createElement("div");
        fila.className = "revisor-sugerencias";
        h.sugerencias.forEach((s) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "revisor-sugerencia";
          b.textContent = s === "" ? "(delete)" : s;
          b.title = "Use this";
          b.addEventListener("click", () => {
            if (entrada.disabled) return;
            const r = aplicarSugerencia(entrada.value, hallazgos, i, s);
            entrada.value = r.texto;
            hallazgos = r.hallazgos;
            entrada.dispatchEvent(new Event("input", { bubbles: true }));
            pintar();
            entrada.focus();
          });
          fila.appendChild(b);
        });
        item.appendChild(fila);
      }
      zona.appendChild(item);
    });
    zona.appendChild(pie());
  };

  boton.addEventListener("click", async () => {
    const texto = entrada.value.trim();
    if (entrada.disabled) return;
    if (!texto) {
      entrada.focus();
      return;
    }
    const enviado = entrada.value;
    const mio = ++turno;
    boton.disabled = true;
    etiqueta.textContent = "Checking...";
    try {
      const encontrados = await revisarTexto(enviado);
      // Si el texto cambió mientras tanto, las posiciones ya no sirven
      if (mio !== turno || entrada.value !== enviado) return;
      hallazgos = encontrados;
      pintar();
    } catch (error) {
      if (mio !== turno) return;
      zona.classList.remove("oculto");
      zona.innerHTML = "";
      const aviso = document.createElement("p");
      aviso.className = "revisor-aviso";
      aviso.textContent = error.message === "demasiadas"
        ? "Too many checks in a minute. Wait a moment and try again."
        : "Could not check your English right now. You can still send your answer.";
      zona.appendChild(aviso);
    } finally {
      boton.disabled = false;
      etiqueta.textContent = "Check my English";
    }
  });

  // Si el texto cambia a mano, los errores marcados ya no coinciden
  entrada.addEventListener("input", (e) => {
    if (e.isTrusted) limpiar();
  });

  entrada.revisor = { limpiar };
  return entrada.revisor;
}

const RevisorEscritura = { tipoDeHallazgo, resumirHallazgos, aplicarSugerencia, revisarTexto, conectarRevisor, TIPOS_ERROR };

if (typeof window !== "undefined") window.RevisorEscritura = RevisorEscritura;
if (typeof module !== "undefined" && module.exports) module.exports = RevisorEscritura;
