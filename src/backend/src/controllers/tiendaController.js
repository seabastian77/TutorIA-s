const pool = require("../config/db");

// Catálogo fijo del lado del servidor: el cliente nunca manda el precio.
// `campo` es la columna de `usuarios` que se incrementa al comprar.
const CATALOGO = [
  {
    id: "escudo",
    nombre: "Streak Shield",
    descripcion: "Saves your streak for one missed day. Used automatically.",
    icono: "fa-shield-halved",
    precio: 60,
    campo: "escudos",
    cantidad: 1,
    maximo: 3,
    color: "azul",
  },
  {
    id: "escudo_triple",
    nombre: "Shield Pack",
    descripcion: "Three streak shields at once, cheaper than buying them apart.",
    icono: "fa-shield",
    precio: 150,
    campo: "escudos",
    cantidad: 3,
    maximo: 3,
    color: "lila",
  },
  {
    id: "pistas_5",
    nombre: "5 Hints",
    descripcion: "Reveal a clue in Spanish when an exercise gets tough.",
    icono: "fa-lightbulb",
    precio: 40,
    campo: "pistas",
    cantidad: 5,
    maximo: 30,
    color: "amarillo",
  },
  {
    id: "vidas_llenas",
    nombre: "Refill Lives",
    descripcion: "Back to five lives so you can keep practicing.",
    icono: "fa-heart",
    precio: 50,
    campo: "vidas",
    cantidad: 5,
    maximo: 5,
    color: "naranja",
  },
];

const CAMPOS_INVENTARIO = ["escudos", "pistas", "vidas"];

async function leerCuenta(usuarioId) {
  const { rows } = await pool.query(
    "SELECT monedas, escudos, pistas, vidas FROM usuarios WHERE id = $1",
    [usuarioId],
  );
  const u = rows[0] || {};
  return {
    monedas: u.monedas || 0,
    escudos: u.escudos || 0,
    pistas: u.pistas || 0,
    vidas: u.vidas || 0,
  };
}

function catalogoPublico() {
  // Nunca se expone el nombre de la columna hacia afuera
  return CATALOGO.map(({ campo, ...resto }) => resto);
}

const TiendaController = {
  async catalogo(req, res) {
    try {
      const cuenta = await leerCuenta(req.usuario.id);
      res.json({ articulos: catalogoPublico(), ...cuenta });
    } catch (error) {
      console.error("Error en /tienda/catalogo:", error);
      res.status(500).json({ error: "No se pudo cargar la tienda" });
    }
  },

  async comprar(req, res) {
    try {
      const { articuloId } = req.body;
      const articulo = CATALOGO.find((a) => a.id === articuloId);

      if (!articulo) {
        return res.status(400).json({ error: "Ese artículo no existe" });
      }

      // Doble seguro: el campo siempre sale del catálogo, nunca del cliente
      if (!CAMPOS_INVENTARIO.includes(articulo.campo)) {
        return res.status(400).json({ error: "Artículo mal configurado" });
      }

      const cuenta = await leerCuenta(req.usuario.id);

      if (cuenta.monedas < articulo.precio) {
        return res.status(400).json({
          error: "No tienes monedas suficientes",
          codigo: "sin_monedas",
          faltan: articulo.precio - cuenta.monedas,
        });
      }

      if (cuenta[articulo.campo] >= articulo.maximo) {
        return res.status(400).json({
          error: "Ya tienes el máximo de ese artículo",
          codigo: "tope_alcanzado",
        });
      }

      // Un solo UPDATE condicional: si dos peticiones llegan a la vez,
      // la segunda no encuentra monedas y no descuenta dos veces.
      const nuevoValor = Math.min(
        cuenta[articulo.campo] + articulo.cantidad,
        articulo.maximo,
      );

      const { rows } = await pool.query(
        `UPDATE usuarios
            SET monedas = monedas - $1, ${articulo.campo} = $2
          WHERE id = $3 AND monedas >= $1
      RETURNING monedas, escudos, pistas, vidas`,
        [articulo.precio, nuevoValor, req.usuario.id],
      );

      if (rows.length === 0) {
        return res.status(400).json({
          error: "No tienes monedas suficientes",
          codigo: "sin_monedas",
        });
      }

      await pool.query(
        `INSERT INTO compras_tienda (usuario_id, articulo_id, precio)
         VALUES ($1, $2, $3)`,
        [req.usuario.id, articulo.id, articulo.precio],
      );

      res.json({
        ok: true,
        comprado: articulo.nombre,
        monedas: rows[0].monedas,
        escudos: rows[0].escudos,
        pistas: rows[0].pistas,
        vidas: rows[0].vidas,
      });
    } catch (error) {
      console.error("Error en /tienda/comprar:", error);
      res.status(500).json({ error: "No se pudo completar la compra" });
    }
  },
};

module.exports = TiendaController;
