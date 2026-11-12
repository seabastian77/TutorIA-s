const express = require("express");
const router = express.Router();
const BibliotecaController = require("../controllers/bibliotecaController");
const verificarAuth = require("../middleware/authMiddleware");

router.get("/catalogo", verificarAuth, BibliotecaController.catalogo);
router.get("/lectura/:slug", verificarAuth, BibliotecaController.lectura);
router.post("/traducir", verificarAuth, BibliotecaController.traducir);
router.post("/responder", verificarAuth, BibliotecaController.responder);
router.get("/libros", verificarAuth, BibliotecaController.libros);
router.get("/libros/:libro/:numero", verificarAuth, BibliotecaController.capitulo);
router.post("/libros/:libro/:numero/terminar", verificarAuth, BibliotecaController.terminarCapitulo);

module.exports = router;
