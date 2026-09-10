const fs = require("fs");
const path = require("path");
const pool = require("./db");
const { reportarError } = require("../utils/errores");

// El esquema va primero y después las migraciones en orden alfabético
const BASE = "schema.sql";
const PREFIJO_MIGRACION = "migracion-";

/** Lista los archivos .sql que hay que ejecutar, en el orden correcto. */
function archivosDeMigracion() {
  const migraciones = fs
    .readdirSync(__dirname)
    .filter((n) => n.startsWith(PREFIJO_MIGRACION) && n.endsWith(".sql"))
    .sort();

  return [BASE, ...migraciones].filter((n) =>
    fs.existsSync(path.join(__dirname, n)),
  );
}

/**
 * Pone la base al día al arrancar. Todos los .sql usan IF NOT EXISTS, así que
 * volver a correrlos no cambia nada de lo que ya existe ni borra datos.
 */
async function ejecutarMigraciones() {
  const archivos = archivosDeMigracion();
  let fallos = 0;

  for (const archivo of archivos) {
    const sql = fs.readFileSync(path.join(__dirname, archivo), "utf8");
    const cliente = await pool.connect();

    try {
      // Cada archivo va en su propia transacción: o entra entero o no entra
      await cliente.query("BEGIN");
      await cliente.query(sql);
      await cliente.query("COMMIT");
      console.log(`Migración aplicada: ${archivo}`);
    } catch (error) {
      await cliente.query("ROLLBACK").catch(() => {});
      fallos += 1;
      reportarError(`Falló la migración ${archivo}`, error);
    } finally {
      cliente.release();
    }
  }

  // Un fallo no debe impedir que el servidor arranque, pero sí tiene que verse
  if (fallos > 0) {
    console.error(
      `${fallos} de ${archivos.length} migraciones fallaron. Revisa la base antes de seguir.`,
    );
  }

  return { total: archivos.length, fallos };
}

module.exports = { archivosDeMigracion, ejecutarMigraciones };
