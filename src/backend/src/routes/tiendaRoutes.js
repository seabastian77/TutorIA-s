const express = require("express");
const router = express.Router();
const TiendaController = require("../controllers/tiendaController");
const verificarAuth = require("../middleware/authMiddleware");

router.get("/catalogo", verificarAuth, TiendaController.catalogo);
router.post("/comprar", verificarAuth, TiendaController.comprar);

module.exports = router;
