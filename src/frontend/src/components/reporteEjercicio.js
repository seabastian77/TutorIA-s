// Botón y ventana para que el estudiante avise cuando la IA hizo mal un ejercicio

const ReporteEjercicio = (() => {
  const MOTIVOS = [
    ["respuesta_incorrecta", "The correct answer is wrong"],
    ["pregunta_confusa", "The question is confusing"],
    ["error_ingles", "There's an English mistake"],
    ["traduccion", "The translation is wrong"],
    ["otro", "Something else"],
  ];

  let dialogo = null;
  let pendiente = null;

  /** Arma la ventana una sola vez y la reutiliza en todos los módulos. */
  function crearDialogo() {
    dialogo = document.createElement("dialog");
    dialogo.id = "dialogo-reporte";
    dialogo.className = "dialogo-reporte";
    dialogo.setAttribute("aria-labelledby", "reporte-titulo");
    dialogo.innerHTML = `
      <form method="dialog" class="reporte-form" novalidate>
        <h2 id="reporte-titulo">Report a problem</h2>
        <p class="reporte-intro">Tell us what's wrong with this exercise. The team reviews every report.</p>
        <fieldset class="reporte-motivos">
          <legend>What's wrong?</legend>
          ${MOTIVOS.map(([valor, texto], i) => `
            <label class="reporte-motivo">
              <input type="radio" name="motivo" value="${valor}" ${i === 0 ? "checked" : ""}>
              <span>${texto}</span>
            </label>`).join("")}
        </fieldset>
        <label class="reporte-comentario" for="reporte-comentario">Tell us more (optional)</label>
        <textarea id="reporte-comentario" maxlength="500" rows="3" placeholder="For example: option B is also correct"></textarea>
        <p class="reporte-error mensaje-error" role="alert" hidden></p>
        <div class="reporte-acciones">
          <button type="button" class="btn-secundario" value="cancelar">Cancel</button>
          <button type="submit" class="btn-principal" value="enviar">Send report</button>
        </div>
      </form>`;
    document.body.appendChild(dialogo);

    dialogo.querySelector('[value="cancelar"]').addEventListener("click", () => dialogo.close());
    dialogo.querySelector("form").addEventListener("submit", enviar);
    // Tocar fuera de la ventana también la cierra
    dialogo.addEventListener("click", (e) => {
      if (e.target === dialogo) dialogo.close();
    });
  }

  /** Abre la ventana con el ejercicio que el estudiante está viendo. */
  function abrir(modulo, contenido) {
    if (!dialogo) crearDialogo();
    pendiente = { modulo, contenido };
    dialogo.querySelector("form").reset();
    dialogo.querySelector(".reporte-error").hidden = true;
    const boton = dialogo.querySelector('[value="enviar"]');
    boton.disabled = false;
    boton.textContent = "Send report";
    dialogo.showModal();
  }

  async function enviar(e) {
    e.preventDefault();
    if (!pendiente) return;
    const boton = dialogo.querySelector('[value="enviar"]');
    const error = dialogo.querySelector(".reporte-error");
    boton.disabled = true;
    boton.textContent = "Sending...";
    try {
      await ReportesAPI.enviar({
        modulo: pendiente.modulo,
        motivo: dialogo.querySelector('input[name="motivo"]:checked').value,
        comentario: dialogo.querySelector("#reporte-comentario").value,
        contenido: pendiente.contenido,
      });
      dialogo.close();
      if (pendiente.boton) {
        pendiente.boton.disabled = true;
        pendiente.boton.querySelector("span").textContent = "Reported, thanks";
      }
      if (typeof avisoConTuti === "function") {
        avisoConTuti("Thanks for the report!", "The team will review this exercise.", { pose: "normal", confeti: false });
      }
    } catch (err) {
      error.textContent = err.message || "Could not send the report. Try again.";
      error.hidden = false;
      boton.disabled = false;
      boton.textContent = "Send report";
    }
  }

  /** Pone el botón de reportar en un contenedor; el contenido se lee al tocarlo. */
  function agregarBoton(contenedor, { modulo, contenido }) {
    if (!contenedor) return null;
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "btn-reportar";
    boton.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 22V4"/><path d="M4 4h13l-2 4 2 4H4"/></svg><span>Report a problem</span>`;
    boton.addEventListener("click", () => {
      abrir(modulo, typeof contenido === "function" ? contenido() : contenido);
      pendiente.boton = boton;
    });
    contenedor.appendChild(boton);
    return boton;
  }

  return { agregarBoton, MOTIVOS };
})();
