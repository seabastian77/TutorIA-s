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
const tiendaRoutes = require("./src/routes/tiendaRoutes");
const ligaRoutes = require("./src/routes/ligaRoutes");
const roleplayRoutes = require("./src/routes/roleplayRoutes");
const bibliotecaRoutes = require("./src/routes/bibliotecaRoutes");
const audioRoutes = require("./src/routes/audioRoutes");

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

app.use(express.json());

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

app.get("/api/health", (req, res) => {
  res.json({ estado: "ok", mensaje: "TutorIA's backend funcionando" });
});

app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

app.listen(PORT, () => {
  console.log(`TutorIA's backend corriendo en el puerto ${PORT}`);
});
