// Límite de peticiones por minuto: frena a quien quiera gastar la IA o adivinar claves a la fuerza

const crypto = require("crypto");

/** Identifica a quien pide: por su sesión si la trae (un salón comparte IP), si no por su IP. */
function quienPide(req) {
  const auth = req.headers.authorization;
  if (auth) return `t:${crypto.createHash("sha1").update(auth).digest("hex")}`;
  return `ip:${req.ip}`;
}

/** Crea el limitador con su ventana, su máximo y cómo agrupar las peticiones. */
function limitar({ ventanaMs = 60 * 1000, max = 30, clave = quienPide, mensaje } = {}) {
  const cubetas = new Map();

  // Se barre cada tanto para que la memoria no crezca con visitantes viejos
  const barrido = setInterval(() => {
    const ahora = Date.now();
    for (const [k, c] of cubetas) if (c.hasta <= ahora) cubetas.delete(k);
  }, ventanaMs);
  barrido.unref();

  return (req, res, next) => {
    if (req.method === "OPTIONS") return next();
    const k = clave(req);
    const ahora = Date.now();
    let c = cubetas.get(k);
    if (!c || c.hasta <= ahora) {
      c = { cuenta: 0, hasta: ahora + ventanaMs };
      cubetas.set(k, c);
    }
    c.cuenta += 1;
    if (c.cuenta > max) {
      res.set("Retry-After", String(Math.ceil((c.hasta - ahora) / 1000)));
      return res.status(429).json({
        error: mensaje || "Vas muy rápido. Espera un momento y vuelve a intentar.",
        codigo: "demasiadas_peticiones",
      });
    }
    next();
  };
}

module.exports = { limitar, quienPide };
