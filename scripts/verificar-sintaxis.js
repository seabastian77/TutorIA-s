// Revisa que todos los .js del proyecto se puedan leer, sin ejecutar ninguno
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const CARPETAS = ["src/backend", "src/frontend/src", "tests", "scripts"];
const IGNORADAS = /node_modules|[\\/]vendor[\\/]/;

/** Junta los .js de una carpeta y sus subcarpetas. */
function listarJs(carpeta) {
  if (!fs.existsSync(carpeta)) return [];
  return fs.readdirSync(carpeta, { withFileTypes: true }).flatMap((e) => {
    const ruta = path.join(carpeta, e.name);
    if (IGNORADAS.test(ruta)) return [];
    if (e.isDirectory()) return listarJs(ruta);
    return e.name.endsWith(".js") ? [ruta] : [];
  });
}

const archivos = CARPETAS.flatMap((c) => listarJs(path.join(RAIZ, c)));
const temporal = path.join(os.tmpdir(), `tutorias-sintaxis-${process.pid}.mjs`);
let fallos = 0;

for (const archivo of archivos) {
  const codigo = fs.readFileSync(archivo, "utf8");
  // Los módulos ES se revisan como .mjs para que node acepte import y export
  const esModulo = /^\s*(import|export)\s/m.test(codigo);
  if (esModulo) fs.writeFileSync(temporal, codigo);
  try {
    execFileSync(process.execPath, ["--check", esModulo ? temporal : archivo], { stdio: "pipe" });
  } catch (error) {
    fallos += 1;
    console.error(`✗ ${path.relative(RAIZ, archivo)}\n${String(error.stderr).trim()}\n`);
  }
}

if (fs.existsSync(temporal)) fs.unlinkSync(temporal);
console.log(fallos ? `${fallos} archivo(s) con errores de sintaxis` : `Sintaxis correcta en ${archivos.length} archivos`);
process.exit(fallos ? 1 : 0);
