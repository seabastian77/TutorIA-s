const pool = require("../config/db");
const { obtenerPerfil } = require("../utils/perfil");
const { registrarActividad } = require("../utils/gamificacion");
const {
  barajar,
  limpiarPalabra,
  estadoAhorcado,
  letraParaRevelar,
  crearSopa,
  leerSegmento,
  coincideColocada,
  casillasDe,
} = require("../utils/juegosLogica");
const {
  FORMATO_VALIDO,
  palabrasDeRespaldo,
  generarPalabras,
} = require("../services/juegosContenido");

const MAX_ERRORES = 6;
const TAMANO_SOPA = 10;
const PALABRAS_SOPA = 6;
const PARES_EMPAREJAR = 6;
const SEGUNDOS_SOPA = 120;
const VIDA_PARTIDA = 30 * 60 * 1000;

// Las partidas viven en memoria: son cortas y así el juego no toca la base de datos
const partidas = new Map();

/** Borra las partidas que quedaron abandonadas hace más de media hora. */
function limpiarViejas() {
  const limite = Date.now() - VIDA_PARTIDA;
  partidas.forEach((partida, id) => {
    if (partida.creada < limite) partidas.delete(id);
  });
}

function guardarPartida(usuarioId, datos) {
  limpiarViejas();
  const id = `${usuarioId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  partidas.set(id, { ...datos, usuarioId, creada: Date.now() });
  return id;
}

/** Recupera una partida comprobando que sea de ese usuario y de ese juego. */
function leerPartida(id, usuarioId, juego) {
  const partida = partidas.get(id);
  if (!partida || partida.usuarioId !== usuarioId || partida.juego !== juego) {
    return null;
  }
  return partida;
}

/** Saca palabras del vocabulario que el propio usuario ha ido fallando. */
async function palabrasDelUsuario(usuarioId, cantidad) {
  const { rows } = await pool.query(
    `SELECT palabra, traduccion
       FROM vocabulario_usuario
      WHERE usuario_id = $1
        AND traduccion IS NOT NULL AND traduccion <> ''
        AND palabra ~ '^[A-Za-z]{3,10}$'
      ORDER BY RANDOM()
      LIMIT $2`,
    [usuarioId, cantidad],
  );
  return rows;
}

/** Reúne palabras únicas: primero las del usuario, luego la IA y al final el respaldo. */
async function reunirPalabras(usuarioId, nivel, cantidad) {
  const vistas = new Set();
  const lista = [];

  const agregar = (candidata) => {
    if (lista.length >= cantidad) return;
    const palabra = (candidata?.palabra || "").trim();
    const traduccion = (candidata?.traduccion || "").trim();
    if (!FORMATO_VALIDO.test(palabra) || !traduccion) return;

    const clave = palabra.toLowerCase();
    if (vistas.has(clave)) return;

    vistas.add(clave);
    lista.push({ palabra: clave, traduccion });
  };

  try {
    (await palabrasDelUsuario(usuarioId, cantidad)).forEach(agregar);
  } catch (error) {
    console.error("No se pudo leer el vocabulario del usuario:", error);
  }

  if (lista.length < cantidad) {
    try {
      // Se piden de más y se barajan para que el ahorcado no repita palabra
      const generadas = await generarPalabras({
        nivel,
        cantidad: Math.max(cantidad - lista.length, 6),
      });
      barajar(generadas).forEach(agregar);
    } catch (error) {
      console.error("La IA no pudo generar palabras para el juego:", error);
    }
  }

  palabrasDeRespaldo(nivel).forEach(agregar);
  return lista;
}

/** Estado del ahorcado tal como lo ve el jugador: nunca incluye la palabra. */
function vistaAhorcado(partida) {
  const estado = estadoAhorcado(partida.palabra, partida.letras, MAX_ERRORES);
  return {
    mascara: estado.mascara,
    letras: partida.letras,
    errores: estado.errores,
    restantes: estado.restantes,
    maxErrores: MAX_ERRORES,
    estado: estado.estado,
  };
}

/** Cierra la partida de ahorcado, reparte XP y revela la palabra. */
async function cerrarAhorcado(partida) {
  const estado = estadoAhorcado(partida.palabra, partida.letras, MAX_ERRORES);
  partida.terminada = true;

  const gano = estado.estado === "ganada";
  const puntos = gano ? 3 + estado.restantes : 1;
  const perfecto = gano && estado.errores === 0 && partida.pistasUsadas === 0;

  const gamificacion = await registrarActividad(partida.usuarioId, puntos, {
    perfecto,
  });

  return {
    palabra: partida.palabra,
    traduccion: partida.traduccion,
    xpGanado: gamificacion.xpGanado,
    puntosTotales: gamificacion.puntos,
    racha: gamificacion.racha,
    monedas: gamificacion.monedas,
    monedasGanadas: gamificacion.monedasGanadas,
    metaCompletada: gamificacion.metaCompletada,
  };
}

const JuegosController = {
  async nuevoAhorcado(req, res) {
    try {
      const { nivel } = await obtenerPerfil(req.usuario.id);
      const [elegida] = await reunirPalabras(req.usuario.id, nivel, 1);

      if (!elegida) {
        return res
          .status(502)
          .json({ error: "No se pudo elegir una palabra para el ahorcado" });
      }

      const { rows } = await pool.query(
        "SELECT pistas FROM usuarios WHERE id = $1",
        [req.usuario.id],
      );

      const partidaId = guardarPartida(req.usuario.id, {
        juego: "ahorcado",
        palabra: limpiarPalabra(elegida.palabra),
        traduccion: elegida.traduccion,
        letras: [],
        pistasUsadas: 0,
        terminada: false,
      });

      const partida = partidas.get(partidaId);

      res.json({
        partidaId,
        nivel,
        pista: elegida.traduccion,
        longitud: partida.palabra.length,
        pistasDisponibles: rows[0]?.pistas || 0,
        ...vistaAhorcado(partida),
      });
    } catch (error) {
      console.error("Error en /juegos/ahorcado/nueva:", error);
      res.status(500).json({ error: "No se pudo empezar el ahorcado" });
    }
  },

  async letraAhorcado(req, res) {
    try {
      const { partidaId, letra } = req.body;
      const partida = leerPartida(partidaId, req.usuario.id, "ahorcado");

      if (!partida) {
        return res.status(404).json({ error: "Esa partida ya no existe" });
      }
      if (partida.terminada) {
        return res.status(400).json({ error: "Esa partida ya terminó" });
      }

      const elegida = (letra || "").toUpperCase();
      if (!/^[A-Z]$/.test(elegida)) {
        return res.status(400).json({ error: "Eso no es una letra" });
      }

      if (partida.letras.includes(elegida)) {
        return res.json({ repetida: true, ...vistaAhorcado(partida) });
      }

      partida.letras.push(elegida);
      const vista = vistaAhorcado(partida);

      if (vista.estado === "jugando") {
        return res.json({ acerto: partida.palabra.includes(elegida), ...vista });
      }

      const cierre = await cerrarAhorcado(partida);
      res.json({ acerto: partida.palabra.includes(elegida), ...vista, ...cierre });
    } catch (error) {
      console.error("Error en /juegos/ahorcado/letra:", error);
      res.status(500).json({ error: "No se pudo revisar la letra" });
    }
  },

  /** Gasta una pista de la tienda para descubrir una letra sin penalización. */
  async pistaAhorcado(req, res) {
    try {
      const { partidaId } = req.body;
      const partida = leerPartida(partidaId, req.usuario.id, "ahorcado");

      if (!partida) {
        return res.status(404).json({ error: "Esa partida ya no existe" });
      }
      if (partida.terminada) {
        return res.status(400).json({ error: "Esa partida ya terminó" });
      }

      const revelada = letraParaRevelar(partida.palabra, partida.letras);
      if (!revelada) {
        return res.status(400).json({ error: "Ya no quedan letras por revelar" });
      }

      // El descuento va condicionado para que dos toques seguidos no dejen pistas en negativo
      const { rows } = await pool.query(
        `UPDATE usuarios SET pistas = pistas - 1
          WHERE id = $1 AND pistas > 0
      RETURNING pistas`,
        [req.usuario.id],
      );

      if (rows.length === 0) {
        return res.status(400).json({
          error: "No te quedan pistas",
          codigo: "sin_pistas",
        });
      }

      partida.letras.push(revelada);
      partida.pistasUsadas += 1;

      const vista = vistaAhorcado(partida);
      const respuesta = {
        revelada,
        pistasDisponibles: rows[0].pistas,
        ...vista,
      };

      if (vista.estado === "jugando") {
        return res.json(respuesta);
      }

      const cierre = await cerrarAhorcado(partida);
      res.json({ ...respuesta, ...cierre });
    } catch (error) {
      console.error("Error en /juegos/ahorcado/pista:", error);
      res.status(500).json({ error: "No se pudo usar la pista" });
    }
  },

  async nuevaSopa(req, res) {
    try {
      const { nivel } = await obtenerPerfil(req.usuario.id);
      const palabras = await reunirPalabras(
        req.usuario.id,
        nivel,
        PALABRAS_SOPA,
      );

      const traducciones = new Map(
        palabras.map((p) => [limpiarPalabra(p.palabra), p.traduccion]),
      );

      const { letras, colocadas } = crearSopa(
        palabras.map((p) => p.palabra),
        TAMANO_SOPA,
      );

      if (colocadas.length === 0) {
        return res
          .status(502)
          .json({ error: "No se pudo armar la sopa de letras" });
      }

      const partidaId = guardarPartida(req.usuario.id, {
        juego: "sopa",
        letras,
        colocadas,
        encontradas: [],
        terminada: false,
      });

      res.json({
        partidaId,
        nivel,
        letras,
        segundos: SEGUNDOS_SOPA,
        palabras: colocadas.map((c) => ({
          palabra: c.palabra,
          traduccion: traducciones.get(c.palabra) || "",
        })),
      });
    } catch (error) {
      console.error("Error en /juegos/sopa/nueva:", error);
      res.status(500).json({ error: "No se pudo empezar la sopa de letras" });
    }
  },

  async hallazgoSopa(req, res) {
    try {
      const { partidaId, fila, columna, filaFin, columnaFin } = req.body;
      const partida = leerPartida(partidaId, req.usuario.id, "sopa");

      if (!partida) {
        return res.status(404).json({ error: "Esa partida ya no existe" });
      }
      if (partida.terminada) {
        return res.status(400).json({ error: "Esa partida ya terminó" });
      }

      const coordenadas = [fila, columna, filaFin, columnaFin];
      const validas = coordenadas.every(
        (n) => Number.isInteger(n) && n >= 0 && n < TAMANO_SOPA,
      );
      if (!validas) {
        return res.status(400).json({ error: "Selección fuera del tablero" });
      }

      const segmento = leerSegmento(
        partida.letras,
        fila,
        columna,
        filaFin,
        columnaFin,
      );
      if (segmento === null) {
        return res.json({ correcto: false });
      }

      const acertada = partida.colocadas.find(
        (c) =>
          !partida.encontradas.includes(c.palabra) &&
          coincideColocada(c, fila, columna, filaFin, columnaFin),
      );

      if (!acertada) {
        return res.json({ correcto: false });
      }

      partida.encontradas.push(acertada.palabra);

      res.json({
        correcto: true,
        palabra: acertada.palabra,
        casillas: casillasDe(acertada),
        encontradas: partida.encontradas.length,
        total: partida.colocadas.length,
      });
    } catch (error) {
      console.error("Error en /juegos/sopa/hallazgo:", error);
      res.status(500).json({ error: "No se pudo revisar la selección" });
    }
  },

  /** Cierra la sopa, reparte XP y muestra dónde estaban las palabras que faltaron. */
  async terminarSopa(req, res) {
    try {
      const { partidaId } = req.body;
      const partida = leerPartida(partidaId, req.usuario.id, "sopa");

      if (!partida) {
        return res.status(404).json({ error: "Esa partida ya no existe" });
      }
      if (partida.terminada) {
        return res.status(400).json({ error: "Esa partida ya terminó" });
      }

      partida.terminada = true;

      const total = partida.colocadas.length;
      const encontradas = partida.encontradas.length;
      const perfecto = encontradas === total;

      const gamificacion = await registrarActividad(
        req.usuario.id,
        encontradas * 2,
        { perfecto },
      );

      const faltantes = partida.colocadas
        .filter((c) => !partida.encontradas.includes(c.palabra))
        .map((c) => ({ palabra: c.palabra, casillas: casillasDe(c) }));

      res.json({
        encontradas,
        total,
        perfecto,
        faltantes,
        xpGanado: gamificacion.xpGanado,
        puntosTotales: gamificacion.puntos,
        racha: gamificacion.racha,
        monedas: gamificacion.monedas,
        monedasGanadas: gamificacion.monedasGanadas,
        metaCompletada: gamificacion.metaCompletada,
      });
    } catch (error) {
      console.error("Error en /juegos/sopa/terminar:", error);
      res.status(500).json({ error: "No se pudo cerrar la sopa de letras" });
    }
  },

  async nuevoEmparejar(req, res) {
    try {
      const { nivel } = await obtenerPerfil(req.usuario.id);
      const palabras = await reunirPalabras(
        req.usuario.id,
        nivel,
        PARES_EMPAREJAR,
      );

      if (palabras.length < 2) {
        return res
          .status(502)
          .json({ error: "No hay palabras suficientes para emparejar" });
      }

      // Cada lado lleva su propia ficha al azar para que el id no delate la pareja
      const ficha = () => Math.random().toString(36).slice(2, 10);
      const pares = palabras.map((p) => ({
        izquierda: ficha(),
        derecha: ficha(),
        palabra: p.palabra,
        traduccion: p.traduccion,
      }));

      const mapa = {};
      pares.forEach((p) => {
        mapa[p.izquierda] = p.derecha;
      });

      const partidaId = guardarPartida(req.usuario.id, {
        juego: "emparejar",
        mapa,
        total: pares.length,
        aciertos: [],
        errores: 0,
        terminada: false,
      });

      res.json({
        partidaId,
        nivel,
        izquierda: barajar(
          pares.map((p) => ({ id: p.izquierda, texto: p.palabra })),
        ),
        derecha: barajar(
          pares.map((p) => ({ id: p.derecha, texto: p.traduccion })),
        ),
      });
    } catch (error) {
      console.error("Error en /juegos/emparejar/nueva:", error);
      res.status(500).json({ error: "No se pudo empezar el emparejamiento" });
    }
  },

  async parEmparejar(req, res) {
    try {
      const { partidaId, izquierdaId, derechaId } = req.body;
      const partida = leerPartida(partidaId, req.usuario.id, "emparejar");

      if (!partida) {
        return res.status(404).json({ error: "Esa partida ya no existe" });
      }
      if (partida.terminada) {
        return res.status(400).json({ error: "Esa partida ya terminó" });
      }

      const esperada = partida.mapa[izquierdaId];
      if (!esperada) {
        return res.status(400).json({ error: "Esa carta no es de la partida" });
      }
      if (partida.aciertos.includes(izquierdaId)) {
        return res.status(400).json({ error: "Esa pareja ya estaba hecha" });
      }

      const correcto = esperada === derechaId;

      if (correcto) {
        partida.aciertos.push(izquierdaId);
      } else {
        partida.errores += 1;
      }

      const completado = partida.aciertos.length === partida.total;
      const respuesta = {
        correcto,
        aciertos: partida.aciertos.length,
        total: partida.total,
        errores: partida.errores,
        completado,
      };

      if (!completado) {
        return res.json(respuesta);
      }

      partida.terminada = true;
      const gamificacion = await registrarActividad(
        req.usuario.id,
        partida.total,
        { perfecto: partida.errores === 0 },
      );

      res.json({
        ...respuesta,
        xpGanado: gamificacion.xpGanado,
        puntosTotales: gamificacion.puntos,
        racha: gamificacion.racha,
        monedas: gamificacion.monedas,
        monedasGanadas: gamificacion.monedasGanadas,
        metaCompletada: gamificacion.metaCompletada,
      });
    } catch (error) {
      console.error("Error en /juegos/emparejar/par:", error);
      res.status(500).json({ error: "No se pudo revisar la pareja" });
    }
  },
};

module.exports = JuegosController;
