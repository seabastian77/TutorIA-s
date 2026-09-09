async function iniciarTienda() {
  document.getElementById("vista-principal").classList.add("oculto");
  document.getElementById("vista-tienda").classList.remove("oculto");
  await cargarTienda();
}

async function cargarTienda(mensajeFinal = null) {
  const lista = document.getElementById("tienda-lista");
  const estado = document.getElementById("tienda-estado");

  lista.innerHTML = "";
  estado.textContent = "Loading the shop...";
  estado.className = "tienda-estado";

  try {
    const datos = await TiendaAPI.obtenerCatalogo();

    // Si veníamos de una compra, el mensaje se repone tras recargar
    if (mensajeFinal) {
      estado.textContent = mensajeFinal.texto;
      estado.className = `tienda-estado ${mensajeFinal.clase}`;
    } else {
      estado.textContent = "";
    }
    pintarMonedasTienda(datos);
    pintarInventario(datos);
    pintarArticulos(datos.articulos, datos);
  } catch (err) {
    estado.textContent = "Could not load the shop. Try again in a moment.";
  }
}

function pintarMonedasTienda(datos) {
  document.getElementById("tienda-monedas").textContent = datos.monedas;
  // El chip del panel principal también se mantiene al día
  const chip = document.getElementById("progreso-monedas");
  if (chip) chip.textContent = datos.monedas;
}

function pintarInventario(datos) {
  const contenedor = document.getElementById("tienda-inventario");
  contenedor.innerHTML = "";

  const piezas = [
    { icono: "fa-shield-halved", valor: datos.escudos, etiqueta: "shields" },
    { icono: "fa-lightbulb", valor: datos.pistas, etiqueta: "hints" },
    { icono: "fa-heart", valor: datos.vidas, etiqueta: "lives" },
  ];

  piezas.forEach((p) => {
    const item = document.createElement("div");
    item.className = "inventario-item";
    item.innerHTML = `<i class="fa-solid ${p.icono}"></i>`;

    const valor = document.createElement("strong");
    valor.textContent = p.valor;

    const etiqueta = document.createElement("span");
    etiqueta.textContent = p.etiqueta;

    item.appendChild(valor);
    item.appendChild(etiqueta);
    contenedor.appendChild(item);
  });
}

function pintarArticulos(articulos, cuenta) {
  const lista = document.getElementById("tienda-lista");
  lista.innerHTML = "";

  articulos.forEach((articulo) => {
    const tarjeta = document.createElement("div");
    tarjeta.className = `articulo articulo-${articulo.color || "azul"}`;

    const alcanza = cuenta.monedas >= articulo.precio;

    const icono = document.createElement("div");
    icono.className = "articulo-icono";
    icono.innerHTML = `<i class="fa-solid ${articulo.icono}"></i>`;

    const info = document.createElement("div");
    info.className = "articulo-info";

    const nombre = document.createElement("p");
    nombre.className = "articulo-nombre";
    nombre.textContent = articulo.nombre;

    const descripcion = document.createElement("p");
    descripcion.className = "articulo-descripcion";
    descripcion.textContent = articulo.descripcion;

    info.appendChild(nombre);
    info.appendChild(descripcion);

    const boton = document.createElement("button");
    boton.className = "articulo-precio";
    boton.disabled = !alcanza;
    boton.innerHTML = `<i class="fa-solid fa-coins"></i>`;

    const precio = document.createElement("span");
    precio.textContent = articulo.precio;
    boton.appendChild(precio);

    boton.addEventListener("click", () => comprarArticulo(articulo, boton));

    tarjeta.appendChild(icono);
    tarjeta.appendChild(info);
    tarjeta.appendChild(boton);
    lista.appendChild(tarjeta);
  });
}

async function comprarArticulo(articulo, boton) {
  const estado = document.getElementById("tienda-estado");
  const textoOriginal = boton.innerHTML;

  boton.disabled = true;
  boton.textContent = "...";
  estado.textContent = "";

  try {
    await TiendaAPI.comprar(articulo.id);
    await cargarTienda({
      texto: `${articulo.nombre} purchased.`,
      clase: "tienda-estado-ok",
    });
  } catch (err) {
    boton.innerHTML = textoOriginal;
    boton.disabled = false;
    estado.className = "tienda-estado tienda-estado-error";

    if (err.codigo === "sin_monedas") {
      estado.textContent = err.faltan
        ? `You need ${err.faltan} more coins. Keep practicing!`
        : "You don't have enough coins yet.";
    } else if (err.codigo === "tope_alcanzado") {
      estado.textContent = "You already have the maximum of this item.";
    } else {
      estado.textContent = "Could not complete the purchase.";
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btnTienda = document.getElementById("btn-tienda");
  if (btnTienda) btnTienda.addEventListener("click", iniciarTienda);

  const btnSalir = document.getElementById("btn-salir-tienda");
  if (btnSalir) {
    btnSalir.addEventListener("click", () => {
      document.getElementById("vista-tienda").classList.add("oculto");
      document.getElementById("vista-principal").classList.remove("oculto");
      if (typeof cargarProgreso === "function") cargarProgreso();
    });
  }
});
