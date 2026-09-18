// Con la IA caída Tuti no puede quedarse mudo: debe responder con reglas
const { chromium } = require("playwright");

(async () => {
  const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const p = await nav.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto("http://localhost:8080/index.html");
  await p.click("#tab-registro");
  await p.fill("#registro-nombre", "Sebas");
  await p.fill("#registro-correo", `falla${Date.now()}@t4.com`);
  await p.fill("#registro-contrasena", "123456");
  await p.click("#form-registro button[type=submit]");
  await p.waitForSelector("#vista-principal:not(.oculto)");
  await p.click("#mentor-abrir-charla");
  await p.waitForSelector(".charla-suyo:not(.charla-pensando)");

  await p.fill("#charla-entrada", "hola tuti");
  await p.click("#charla-enviar");
  await p.waitForFunction(
    () =>
      document.querySelectorAll(".charla-suyo").length >= 2 &&
      !document.querySelector(".charla-pensando"),
  );
  const r = (await p.locator(".charla-suyo .charla-globo").last().textContent()).trim();
  console.log("IA caída | Tuti responde:", r);

  const campo = await p.evaluate(() => ({
    activo: !document.getElementById("charla-entrada").disabled,
    foco: document.activeElement.id,
    estado: document.getElementById("charla-estado").textContent,
  }));
  console.log("IA caída | campo listo:", campo.activo, "| foco:", campo.foco, "| estado:", campo.estado);

  // Un mensaje vacío no puede gastar una llamada ni pintar un globo en blanco
  const antes = await p.locator(".charla-turno").count();
  await p.fill("#charla-entrada", "   ");
  await p.click("#charla-enviar");
  await new Promise((r2) => setTimeout(r2, 600));
  console.log("IA caída | turnos tras enviar vacío:", antes, "->", await p.locator(".charla-turno").count());

  await p.screenshot({ path: "/tmp/charla-falla.png" });
  await nav.close();
})();
