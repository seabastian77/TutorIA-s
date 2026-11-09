// Los scripts clásicos del frontend comparten un solo ámbito global: dos con el mismo nombre se pisan
const fs = require("fs");
const path = require("path");

const FRONTEND = path.join(__dirname, "..", "src", "frontend");
const html = fs.readFileSync(path.join(FRONTEND, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script\s+src="(src\/[^"]+\.js)"/g)].map((m) => m[1]);

/** Saca los nombres que un script declara en el nivel superior. */
function nombresGlobales(codigo) {
  const nombres = [];
  const patron = /^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)|^(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm;
  for (const m of codigo.matchAll(patron)) nombres.push(m[1] || m[2]);
  return nombres;
}

describe("scripts del frontend", () => {
  test("index.html carga los scripts y todos existen", () => {
    expect(scripts.length).toBeGreaterThan(20);
    for (const s of scripts) expect(fs.existsSync(path.join(FRONTEND, s))).toBe(true);
  });

  test("ningún nombre global se declara en dos scripts", () => {
    const dueños = new Map();
    const choques = [];
    for (const s of scripts) {
      const codigo = fs.readFileSync(path.join(FRONTEND, s), "utf8");
      for (const nombre of new Set(nombresGlobales(codigo))) {
        if (dueños.has(nombre)) choques.push(`${nombre}: ${dueños.get(nombre)} y ${s}`);
        else dueños.set(nombre, s);
      }
    }
    expect(choques).toEqual([]);
  });
});
