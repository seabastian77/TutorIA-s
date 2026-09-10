const pool = require("../config/db");
const { reportarError } = require("../utils/errores");
const { obtenerPerfil } = require("../utils/perfil");
const { registrarActividad } = require("../utils/gamificacion");
const { guardarPalabraSiFalla } = require("../utils/vocabulario");
const { hayMedios, obtenerMedio, obtenerMedioPorId } = require("../services/medios");
const { evaluarDescripcion, evaluarReaccion } = require("../services/iaVision");

const NIVELES = ["A1", "A2", "B1", "B2", "C1", "C2"];

// Escenas cotidianas para el modo describir
const TEMAS_FOTO = [
  { id: "cocina", nombre: "In the kitchen", consulta: "people cooking kitchen home", icono: "fa-utensils" },
  { id: "calle", nombre: "On the street", consulta: "busy city street people walking", icono: "fa-city" },
  { id: "trabajo", nombre: "At work", consulta: "people working office team", icono: "fa-briefcase" },
  { id: "parque", nombre: "At the park", consulta: "family park outdoors playing", icono: "fa-tree" },
  { id: "mercado", nombre: "At the market", consulta: "farmers market vendor buying", icono: "fa-basket-shopping" },
  { id: "transporte", nombre: "Getting around", consulta: "people train station commuting", icono: "fa-train" },
  { id: "deporte", nombre: "Playing sports", consulta: "people playing sport outdoors", icono: "fa-futbol" },
  { id: "clase", nombre: "In class", consulta: "students classroom studying", icono: "fa-chalkboard-user" },
];

// Situaciones para el modo reaccionar, alineadas con los escenarios de roleplay
const SITUACIONES = [
  {
    id: "cafe",
    nombre: "Ordering coffee",
    consulta: "barista coffee shop counter customer",
    situacion: "a customer at the counter of a busy coffee shop",
    icono: "fa-mug-hot",
  },
  {
    id: "aeropuerto",
    nombre: "Airport immigration",
    consulta: "airport passport control queue",
    situacion: "a traveller reaching the immigration desk at an airport",
    icono: "fa-passport",
  },
  {
    id: "entrevista",
    nombre: "Job interview",
    consulta: "job interview office two people",
    situacion: "a candidate sitting down for a job interview",
    icono: "fa-briefcase",
  },
  {
    id: "hotel",
    nombre: "Hotel check-in",
    consulta: "hotel reception desk check in",
    situacion: "a guest arriving at a hotel reception desk",
    icono: "fa-bell-concierge",
  },
  {
    id: "medico",
    nombre: "At the doctor",
    consulta: "doctor patient consultation clinic",
    situacion: "a patient in a doctor's consulting room",
    icono: "fa-stethoscope",
  },
];

/** Busca el tema pedido en el catálogo que corresponde al modo. */
function buscarTema(modo, id) {
  const catalogo = modo === "reaccionar" ? SITUACIONES : TEMAS_FOTO;
  return catalogo.find((t) => t.id === id) || null;
}

/** Quita del catálogo lo que solo le sirve al servidor. */
function catalogoPublico(lista) {
  return lista.map(({ consulta, situacion, ...publico }) => publico);
}

const VisualController = {
  /** Entrega los dos catálogos y avisa si los ejercicios visuales están disponibles. */
  async temas(req, res) {
    try {
      res.json({
        disponible: hayMedios(),
        describir: catalogoPublico(TEMAS_FOTO),
        reaccionar: catalogoPublico(SITUACIONES),
      });
    } catch (error) {
      reportarError("Error en /visual/temas", error);
      res.status(500).json({ error: "No se pudieron cargar los temas" });
    }
  },

  async ejercicio(req, res) {
    try {
      if (!hayMedios()) {
        return res.status(503).json({
          error: "Los ejercicios con imagen no están disponibles",
          codigo: "sin_medios",
        });
      }

      const { modo = "describir", tema } = req.body;
      const elegido = buscarTema(modo, tema);

      if (!elegido) {
        return res.status(400).json({ error: "Ese tema no existe" });
      }

      const medio = await obtenerMedio("foto", elegido.consulta);
      if (!medio) {
        return res
          .status(502)
          .json({ error: "No se encontró una foto para ese tema" });
      }

      const { nivel } = await obtenerPerfil(req.usuario.id);
      const indiceNivel = NIVELES.indexOf(nivel);

      const { rows } = await pool.query(
        `INSERT INTO ejercicios (usuario_id, tipo, nivel_dificultad, contenido)
         VALUES ($1, 'visual', $2, $3) RETURNING id`,
        [
          req.usuario.id,
          indiceNivel >= 0 ? indiceNivel : 0,
          JSON.stringify({ modo, tema: elegido.id, medioId: medio.id }),
        ],
      );

      res.json({
        ejercicioId: rows[0].id,
        modo,
        nivel,
        titulo: elegido.nombre,
        // La atribución a Pexels y al fotógrafo es obligatoria por su licencia
        imagen: medio.url,
        autor: medio.autor,
        autorUrl: medio.autorUrl,
        instruccion:
          modo === "reaccionar"
            ? "What would you say in this moment?"
            : "Describe what is happening in this photo.",
      });
    } catch (error) {
      reportarError("Error en /visual/ejercicio", error);
      res.status(500).json({ error: "No se pudo preparar el ejercicio" });
    }
  },

  /** Evalúa contra la imagen guardada en la base, nunca contra lo que mande el cliente. */
  async responder(req, res) {
    try {
      const { ejercicioId, texto } = req.body;

      if (!ejercicioId || !(texto || "").trim()) {
        return res.status(400).json({ error: "Falta lo que escribiste" });
      }

      const { rows } = await pool.query(
        `SELECT contenido FROM ejercicios
          WHERE id = $1 AND usuario_id = $2 AND tipo = 'visual'`,
        [ejercicioId, req.usuario.id],
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: "Ese ejercicio no existe" });
      }

      const { modo, tema, medioId } = rows[0].contenido;
      const medio = await obtenerMedioPorId(medioId);

      if (!medio) {
        return res.status(404).json({ error: "Esa imagen ya no está disponible" });
      }

      const { nivel, ayudaEs } = await obtenerPerfil(req.usuario.id);
      const elegido = buscarTema(modo, tema);

      let evaluacion;
      try {
        evaluacion =
          modo === "reaccionar"
            ? await evaluarReaccion({
                urlImagen: medio.url,
                reaccion: texto,
                situacion: elegido?.situacion || "an everyday situation",
                nivel,
                ayudaEs,
              })
            : await evaluarDescripcion({
                urlImagen: medio.url,
                descripcion: texto,
                nivel,
                ayudaEs,
              });
      } catch (error) {
        // El plan gratis de Groq limita los tokens por minuto: eso no es un fallo nuestro
        if (error.status === 429) {
          reportarError("Groq rechazó la evaluación por límite de tokens", error);
          return res.status(429).json({
            error: "El tutor está ocupado. Espera unos segundos y vuelve a intentar.",
            codigo: "limite_ia",
          });
        }
        throw error;
      }

      const precision = Math.max(0, Math.min(100, Number(evaluacion.precision) || 0));
      const perfecto = precision >= 90;

      await pool.query("UPDATE ejercicios SET correcto = $1 WHERE id = $2", [
        perfecto,
        ejercicioId,
      ]);

      // Las correcciones alimentan el vocabulario, igual que en los demás módulos
      const falladas = (evaluacion.correcciones || [])
        .map((c) => c.escribio)
        .filter(Boolean)
        .join(", ");

      if (falladas) {
        guardarPalabraSiFalla(req.usuario.id, "visual", {
          escrito: texto,
          falladas,
        });
      }

      const gamificacion = await registrarActividad(
        req.usuario.id,
        Math.round(precision / 10),
        { perfecto },
      );

      res.json({
        ...evaluacion,
        precision,
        perfecto,
        xpGanado: gamificacion.xpGanado,
        puntosTotales: gamificacion.puntos,
        racha: gamificacion.racha,
        monedas: gamificacion.monedas,
        monedasGanadas: gamificacion.monedasGanadas,
        metaCompletada: gamificacion.metaCompletada,
      });
    } catch (error) {
      reportarError("Error en /visual/responder", error);
      res.status(500).json({ error: "No se pudo revisar tu respuesta" });
    }
  },
};

module.exports = VisualController;
