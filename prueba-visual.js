const { chromium } = require("playwright");
const ESPERA = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const navegador = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
  });

  for (const [nombre, ancho, alto] of [["ancho", 1280, 1000], ["movil", 400, 850]]) {
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
    await ESPERA(400);
    await pagina.screenshot({ path: `/tmp/v-${nombre}-panel.png`, fullPage: true });

    await pagina.click("#btn-juegos");
    await pagina.waitForSelector("#vista-juegos:not(.oculto)");
    await ESPERA(300);
    await pagina.screenshot({ path: `/tmp/v-${nombre}-menu.png`, fullPage: true });

    await pagina.click("#btn-juego-ahorcado");
    await pagina.waitForSelector("#ahorcado-teclado .tecla");
    await pagina.click("#ahorcado-teclado .tecla[data-letra='E']");
    await ESPERA(300);
    await pagina.click("#btn-pista-ahorcado");
    await ESPERA(500);
    await pagina.screenshot({ path: `/tmp/v-${nombre}-ahorcado.png`, fullPage: true });

    await pagina.click("#btn-menu-juegos");
    await pagina.click("#btn-juego-sopa");
    await pagina.waitForSelector("#sopa-grilla .sopa-celda");
    await ESPERA(400);
    await pagina.screenshot({ path: `/tmp/v-${nombre}-sopa.png`, fullPage: true });

    await pagina.click("#btn-menu-juegos-2");
    await pagina.click("#btn-juego-emparejar");
    await pagina.waitForSelector("#emparejar-izquierda .carta-par");
    await ESPERA(300);
    await pagina.screenshot({ path: `/tmp/v-${nombre}-emparejar.png`, fullPage: true });

    // El body no debe desbordarse a lo ancho
    const desborde = await pagina.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    console.log(nombre, "| desborde horizontal:", desborde, "| errores JS:", errores.length ? errores : "ninguno");
    await pagina.close();
  }

  await navegador.close();
})();
