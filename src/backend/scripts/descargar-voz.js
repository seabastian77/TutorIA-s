// Baja la voz en inglés del servidor durante la construcción; si falla, el servidor lo reintenta al arrancar
const { asegurarVoz } = require("../src/utils/descargaVoz");

if (process.env.TUTORIAS_SIN_VOZ === "1") process.exit(0);
asegurarVoz().then(() => process.exit(0));
