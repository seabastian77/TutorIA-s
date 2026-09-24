require("dotenv").config();

const Sentry = require("@sentry/node");

// Sentry se inicia antes que nada y solo si hay DSN: sin él el backend corre igual
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "production",
    tracesSampleRate: 0,
  });
}

const express = require("express");
const cors = require("cors");

const authRoutes = require("./src/routes/authRoutes");
const nivelRoutes = require("./src/routes/nivelRoutes");
const practicaRoutes = require("./src/routes/practicaRoutes");
const usuarioRoutes = require("./src/routes/usuarioRoutes");
const vozRoutes = require("./src/routes/vozRoutes");
const escenaRoutes = require("./src/routes/escenaRoutes");
const vocabularioRoutes = require("./src/routes/vocabularioRoutes");
const tiendaRoutes = require("./src/routes/tiendaRoutes");
const ligaRoutes = require("./src/routes/ligaRoutes");
const roleplayRoutes = require("./src/routes/roleplayRoutes");
const bibliotecaRoutes = require("./src/routes/bibliotecaRoutes");
const audioRoutes = require("./src/routes/audioRoutes");
const juegosRoutes = require("./src/routes/juegosRoutes");
const visualRoutes = require("./src/routes/visualRoutes");
const mentorRoutes = require("./src/routes/mentorRoutes");
const historialRoutes = require("./src/routes/historialRoutes");
const metricasRoutes = require("./src/routes/metricasRoutes");
const { ejecutarMigraciones } = require("./src/config/migraciones");
const { limitar } = require("./src/middleware/limitar");
const { spawn } = require("child_process");
const path = require("path");
const { vozDescargada } = require("./src/utils/descargaVoz");
const { precargarVoz } = require("./src/services/vozPiperService");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: "*" }));

// Cabeceras CORS para todas las peticiones
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// Railway pone un proxy delante: sin esto todas las peticiones parecerían venir de la misma IP
app.set("trust proxy", 1);

app.use(express.json({ limit: "64kb" }));

// Límites por minuto: entrar y recuperar la clave por IP y correo, la IA y la voz por sesión
const porIpYCorreo = (req) => `${req.ip}|${String((req.body || {}).correo || "").trim().toLowerCase()}`;
app.use(["/api/auth/login", "/api/auth/olvide"], limitar({ ventanaMs: 15 * 60 * 1000, max: 10, clave: porIpYCorreo,
  mensaje: "Demasiados intentos. Espera unos minutos y vuelve a intentar." }));
app.use(["/api/auth/registro", "/api/auth/restablecer", "/api/auth/google"], limitar({ ventanaMs: 15 * 60 * 1000, max: 60 }));
app.use(["/api/nivel", "/api/practica", "/api/voz/responder", "/api/escena", "/api/roleplay", "/api/visual",
  "/api/mentor", "/api/audio", "/api/biblioteca", "/api/juegos/ahorcado/nueva", "/api/juegos/sopa/nueva",
  "/api/juegos/emparejar/nueva"], limitar({ max: 60 }));
app.use("/api/voz/hablar", limitar({ max: 90 }));

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/nivel", nivelRoutes);
app.use("/api/practica", practicaRoutes);
app.use("/api/usuario", usuarioRoutes);
app.use("/api/voz", vozRoutes);
app.use("/api/escena", escenaRoutes);
app.use("/api/vocabulario", vocabularioRoutes);
app.use("/api/tienda", tiendaRoutes);
app.use("/api/liga", ligaRoutes);
app.use("/api/roleplay", roleplayRoutes);
app.use("/api/biblioteca", bibliotecaRoutes);
app.use("/api/audio", audioRoutes);
app.use("/api/juegos", juegosRoutes);
app.use("/api/visual", visualRoutes);
app.use("/api/mentor", mentorRoutes);
app.use("/api/historial", historialRoutes);
app.use("/api/metricas", metricasRoutes);

app.get("/api/health", (req, res) => {
  res.json({ estado: "ok", mensaje: "TutorIA's backend funcionando" });
});

app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// El manejador de errores de Sentry va de último, después de todas las rutas
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// JSON mal formado o demasiado grande: respuesta corta, sin mostrar el error interno
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const estado = err.status || err.statusCode || 500;
  res.status(estado).json({ error: estado === 413 ? "El mensaje es demasiado largo" : estado < 500 ? "Solicitud inválida" : "Error en el servidor" });
});

/** Pone la base al día y solo entonces empieza a atender peticiones. */
async function arrancar() {
  try {
    await ejecutarMigraciones();
  } catch (error) {
    console.error("No se pudieron correr las migraciones:", error.message);
  }

  app.listen(PORT, () => {
    console.log(`TutorIA's backend corriendo en el puerto ${PORT}`);
  });

  // Si la voz en inglés no quedó lista en la construcción, se baja en otro proceso para no frenar el servidor
  if (process.env.TUTORIAS_SIN_VOZ !== "1" && !vozDescargada()) {
    spawn(process.execPath, [path.join(__dirname, "scripts", "descargar-voz.js")], { stdio: "inherit" })
      .on("error", (error) => console.error("No se pudo lanzar la descarga de la voz:", error.message));
  }
  precargarVoz();
}

arrancar();
