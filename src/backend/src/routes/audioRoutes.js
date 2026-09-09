const express = require("express");
const router = express.Router();
const AudioController = require("../controllers/audioController");
const verificarAuth = require("../middleware/authMiddleware");

router.get("/dictado", verificarAuth, AudioController.dictado);
router.post(
  "/responder-dictado",
  verificarAuth,
  AudioController.responderDictado,
);
router.get("/comprension", verificarAuth, AudioController.comprension);
router.post(
  "/responder-comprension",
  verificarAuth,
  AudioController.responderComprension,
);

module.exports = router;
