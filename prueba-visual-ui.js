const { chromium } = require("playwright");
const ESPERA = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const navegador = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
  });

  for (const [nombre, ancho, alto] of [["ancho", 1280, 1100], ["movil", 400, 850]]) {
    const pagina = await navegador.newPage({ viewport: { width: ancho, height: alto } });
    const errores = [];
    pagina.on("pageerror", (e) => errores.push(String(e)));

    await pagina.goto("http://localhost:8080/index.html");
    await pagina.click("#tab-registro");
    await pagina.fill("#registro-nombre", "Sebas");
    await pagina.fill("#registro-correo", `vis${nombre}${Date.now()}@t4.com`);
    await pagina.fill("#registro-contrasena", "123456");
    await pagina.check("#registro-politica");
    await pagina.click("#form-registro button[type=submit]");
    await pagina.waitForSelector("#vista-principal:not(.oculto)");

    // Entrada desde Daily Practice
    await pagina.click("#btn-practicar");
    await pagina.waitForSelector("#btn-visual-describir");
    await pagina.click("#btn-visual-describir");
    await pagina.waitForSelector("#vista-visual:not(.oculto)");
    await pagina.waitForSelector("#visual-lista-temas .tema-visual");
    const temas = await pagina.locator("#visual-lista-temas .tema-visual").count();
    console.log(nombre, "| temas de describir:", temas);
    await pagina.screenshot({ path: `/tmp/vis-${nombre}-temas.png`, fullPage: true });

    await pagina.locator("#visual-lista-temas .tema-visual").first().click();
    await pagina.waitForSelector("#visual-imagen[src]");
    await ESPERA(700);
    const cargando = await pagina.locator("#visual-marco.cargando").count();
    const credito = (await pagina.textContent("#visual-credito")).trim();
    console.log(nombre, "| marco sigue latiendo:", cargando > 0, "| crédito:", credito);
    await pagina.screenshot({ path: `/tmp/vis-${nombre}-foto.png`, fullPage: true });

    await pagina.fill("#visual-entrada", "he is cook in the kitchen");
    await pagina.click("#btn-comprobar-visual");
    await pagina.waitForSelector(".visual-marcador");
    await ESPERA(400);
    console.log(nombre, "| marcador:", await pagina.textContent(".visual-marcador"));
    console.log(nombre, "| correcciones:", await pagina.locator(".visual-correccion").count(),
      "| listas:", await pagina.locator(".visual-lista").count());
    await pagina.screenshot({ path: `/tmp/vis-${nombre}-resultado.png`, fullPage: true });

    // Modo reaccionar desde Real Situations
    await pagina.click("#btn-salir-visual");
    await pagina.waitForSelector("#vista-principal:not(.oculto)");
    await pagina.click("#btn-roleplay");
    await pagina.waitForSelector("#btn-visual-reaccionar");
    await pagina.click("#btn-visual-reaccionar");
    await pagina.waitForSelector("#visual-lista-temas .tema-visual");
    console.log(nombre, "| título:", await pagina.textContent("#visual-titulo"),
      "| situaciones:", await pagina.locator("#visual-lista-temas .tema-visual").count());
    await pagina.locator("#visual-lista-temas .tema-visual").first().click();
    await pagina.waitForSelector("#visual-imagen[src]");
    await pagina.fill("#visual-entrada", "I want coffee");
    await pagina.click("#btn-comprobar-visual");
    await pagina.waitForSelector(".visual-mejor");
    console.log(nombre, "| mejor respuesta:", (await pagina.textContent(".visual-mejor")).slice(0, 60));
    await pagina.screenshot({ path: `/tmp/vis-${nombre}-reaccion.png`, fullPage: true });

    // Modo escena con el video de fondo
    await pagina.click("#btn-salir-visual");
    await pagina.waitForSelector("#vista-principal:not(.oculto)");
    await pagina.click("#btn-escena");
    await pagina.waitForSelector("#vista-escena:not(.oculto)");
    await ESPERA(900);
    const videoVisible = await pagina.locator("#escena-video:not(.oculto)").count();
    const fuente = await pagina.getAttribute("#escena-video-fuente", "src");
    console.log(nombre, "| capa de video visible:", videoVisible > 0, "| src:", fuente);
    await pagina.screenshot({ path: `/tmp/vis-${nombre}-escena.png`, fullPage: true });

    const desborde = await pagina.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    console.log(nombre, "| desborde horizontal:", desborde, "| errores JS:", errores.length ? errores : "ninguno");
    console.log("---");
    await pagina.close();
  }

  await navegador.close();
})();
