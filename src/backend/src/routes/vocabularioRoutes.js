const express = require("express");
const router = express.Router();
const VocabularioController = require("../controllers/vocabularioController");
const verificarAuth = require("../middleware/authMiddleware");

router.get("/repaso", verificarAuth, VocabularioController.repaso);
router.post("/responder", verificarAuth, VocabularioController.responder);

module.exports = router;
