// Pinta el crédito de una frase de Tatoeba (lo exige su licencia CC BY): texto y enlace a la frase
function pintarCreditoFrase(elemento, credito) {
  if (!elemento) return;
  elemento.textContent = "";
  if (!credito || !credito.enlace) {
    elemento.classList.add("oculto");
    return;
  }

  const enlace = document.createElement("a");
  enlace.href = credito.enlace;
  enlace.target = "_blank";
  enlace.rel = "noopener";
  enlace.textContent = credito.texto;

  elemento.append("Sentence from ", enlace);
  elemento.classList.remove("oculto");
}
