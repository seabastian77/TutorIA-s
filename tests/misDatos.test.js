// Comprueba que la lista de datos personales esté completa y que nunca se entregue lo sensible
const fs = require("fs");
const path = require("path");
const {
  TABLAS_DEL_USUARIO,
  correoCoincide,
  cuentaParaEntregar,
  correoDeDespedida,
} = require("../src/backend/src/utils/misDatos");

const CONFIG = path.join(__dirname, "../src/backend/src/config");

/** Encuentra en los .sql cada tabla que guarda un usuario_id que apunta a usuarios. */
function tablasConUsuario() {
  const tablas = new Set();
  fs.readdirSync(CONFIG)
    .filter((n) => n.endsWith(".sql"))
    .forEach((n) => {
      const sql = fs.readFileSync(path.join(CONFIG, n), "utf8");
      const bloques = sql.split(/CREATE TABLE IF NOT EXISTS /i).slice(1);
      bloques.forEach((b) => {
        const nombre = b.match(/^(\w+)/)[1];
        const cuerpo = b.slice(0, b.indexOf(");"));
        if (/usuario_id[^,]*REFERENCES usuarios/i.test(cuerpo)) tablas.add(nombre);
      });
    });
  return [...tablas].sort();
}

describe("lista de datos personales", () => {
  test("cubre todas las tablas que guardan algo de un usuario", () => {
    const cubiertas = TABLAS_DEL_USUARIO.map((t) => t.tabla).sort();
    expect(tablasConUsuario()).toEqual(cubiertas);
  });

  test("todo lo que se entrega tiene un orden definido", () => {
    TABLAS_DEL_USUARIO.filter((t) => t.clave).forEach((t) => {
      expect(t.columnas).toBeTruthy();
      expect(t.orden).toBeTruthy();
    });
  });
});

describe("confirmación del correo", () => {
  test("acepta el mismo correo con otras mayúsculas o espacios", () => {
    expect(correoCoincide("  Ana@Correo.com ", "ana@correo.com")).toBe(true);
  });

  test("rechaza otro correo o uno vacío", () => {
    expect(correoCoincide("otra@correo.com", "ana@correo.com")).toBe(false);
    expect(correoCoincide("", "ana@correo.com")).toBe(false);
    expect(correoCoincide(undefined, "ana@correo.com")).toBe(false);
  });
});

describe("lo que se entrega de la cuenta", () => {
  const fila = {
    nombre: "Ana",
    correo: "ana@correo.com",
    contrasena_hash: "$2a$10$secreto",
    google_id: "1234567890",
    ayuda_es: false,
    puntos: 40,
  };

  test("nunca incluye la contraseña ni el identificador de Google", () => {
    const texto = JSON.stringify(cuentaParaEntregar(fila));
    expect(texto).not.toContain("secreto");
    expect(texto).not.toContain("1234567890");
  });

  test("sí dice cómo entra la persona y sus preferencias", () => {
    expect(cuentaParaEntregar(fila)).toMatchObject({
      entraConGoogle: true,
      tieneContrasena: true,
      explicacionesEnEspanol: false,
      puntos: 40,
    });
  });
});

describe("correo de despedida", () => {
  test("escapa el nombre en el HTML", () => {
    const { html, texto } = correoDeDespedida("<b>Ana</b>");
    expect(html).not.toContain("<b>Ana</b>");
    expect(texto).toContain("<b>Ana</b>");
  });
});
