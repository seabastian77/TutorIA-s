// Tuti tiene que responder lo que le pidan, y decir la verdad cuando no pueda
const { chromium } = require("playwright");

async function entrar(p) {
  await p.goto("http://localhost:8080/index.html");
  await p.click("#tab-registro");
  await p.fill("#registro-nombre", "Sebas");
  await p.fill("#registro-correo", `resp${Date.now()}@t4.com`);
  await p.fill("#registro-contrasena", "123456");
  await p.check("#registro-politica");
  await p.click("#form-registro button[type=submit]");
  await p.waitForSelector("#vista-principal:not(.oculto)");
  await p.waitForSelector("#mentor-avatar");
  if (await p.locator("#mentor.encogido").count()) await p.click("#mentor-avatar");
  await p.click("#mentor-abrir-charla");
  await p.waitForSelector(".charla-suyo:not(.charla-pensando)");
}

async function preguntar(p, texto) {
  const antes = await p.locator(".charla-suyo").count();
  await p.fill("#charla-entrada", texto);
  await p.click("#charla-enviar");
  await p.waitForFunction(
    (n) =>
      document.querySelectorAll(".charla-suyo").length > n &&
      !document.querySelector(".charla-pensando"),
    antes,
  );
  return (await p.locator(".charla-suyo .charla-globo").last().textContent()).trim();
}

(async () => {
  const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const p = await nav.newPage({ viewport: { width: 420, height: 900 } });
  const errores = [];
  p.on("pageerror", (e) => errores.push(String(e)));

  await entrar(p);

  const frases = await preguntar(p, "tuti dame algunas frases en ingles");
  console.log("Pide frases | renglones:", frases.split("\n").length);
  console.log("Pide frases | respuesta:\n" + frases);

  // Los saltos de línea tienen que verse como saltos, no como un párrafo pegado
  const saltos = await p.evaluate(
    () => getComputedStyle(document.querySelector(".charla-suyo .charla-globo")).whiteSpace,
  );
  console.log("Pide frases | white-space del globo:", saltos);

  await p.screenshot({ path: "/tmp/charla-frases.png" });
  console.log("errores de JS:", errores.length, errores.slice(0, 2));
  await nav.close();
})();
