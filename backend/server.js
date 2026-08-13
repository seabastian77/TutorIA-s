require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./src/routes/authRoutes");
const nivelRoutes = require("./src/routes/nivelRoutes");
const practicaRoutes = require("./src/routes/practicaRoutes");
const usuarioRoutes = require("./src/routes/usuarioRoutes");
const vozRoutes = require("./src/routes/vozRoutes");
const escenaRoutes = require("./src/routes/escenaRoutes");
const vocabularioRoutes = require("./src/routes/vocabularioRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

const opcionesCors = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(opcionesCors));
// Responde explícitamente a las peticiones "preflight" (OPTIONS) en cualquier ruta
app.options("*", cors(opcionesCors));

app.use(express.json());

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/nivel", nivelRoutes);
app.use("/api/practica", practicaRoutes);
app.use("/api/usuario", usuarioRoutes);
app.use("/api/voz", vozRoutes);
app.use("/api/escena", escenaRoutes);
app.use("/api/vocabulario", vocabularioRoutes);
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./src/routes/authRoutes");
const nivelRoutes = require("./src/routes/nivelRoutes");
const practicaRoutes = require("./src/routes/practicaRoutes");
const usuarioRoutes = require("./src/routes/usuarioRoutes");
const vozRoutes = require("./src/routes/vozRoutes");
const escenaRoutes = require("./src/routes/escenaRoutes");
const vocabularioRoutes = require("./src/routes/vocabularioRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

const opcionesCors = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(opcionesCors));
// Responde explícitamente a las peticiones "preflight" (OPTIONS) en cualquier ruta
app.options("*", cors(opcionesCors));

app.use(express.json());

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/nivel", nivelRoutes);
app.use("/api/practica", practicaRoutes);
app.use("/api/usuario", usuarioRoutes);
app.use("/api/voz", vozRoutes);
app.use("/api/escena", escenaRoutes);
app.use("/api/vocabulario", vocabularioRoutes);

// Ruta de prueba temporal (para diagnóstico)
app.get("/api/prueba-diagnostico", (req, res) => {
  res.json({ ok: true, mensaje: "Esta versión del código SÍ está corriendo" });
});

app.get("/api/health", (req, res) => {
  res.json({ estado: "ok", mensaje: "TutorIA's backend funcionando" });
});

app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

app.listen(PORT, () => {
  console.log(`🚀 TutorIA's backend corriendo en el puerto ${PORT}`);
});

app.get("/api/verificacion-zz9k", (req, res) => {
  res.json({ ok: true, mensaje: "Ruta jamás solicitada antes" });
});

// Ruta de prueba temporal (para diagnóstico)
app.get("/api/prueba-diagnostico", (req, res) => {
  res.json({ ok: true, mensaje: "Esta versión del código SÍ está corriendo" });
});

app.get("/api/health", (req, res) => {
  res.json({ estado: "ok", mensaje: "TutorIA's backend funcionando" });
});

app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

app.listen(PORT, () => {
  console.log(`🚀 TutorIA's backend corriendo en el puerto ${PORT}`);
});

app.get("/api/verificacion-zz9k", (req, res) => {
  res.json({ ok: true, mensaje: "Ruta jamás solicitada antes" });
});
