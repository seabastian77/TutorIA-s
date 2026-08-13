// server.js
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

app.use(cors({ origin: "*" }));

// Manejo de CORS a mano, SIN ningún patrón de ruta (nada de "*" como path),
// para no depender de cómo Express interprete ese símbolo por versión.
// Esto se ejecuta para TODAS las peticiones, a cualquier ruta.
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

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
