const { chromium } = require("playwright");

const ESPERA = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const navegador = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
  });
  const pagina = await navegador.newPage({ viewport: { width: 1280, height: 1000 } });

  const errores = [];
  pagina.on("pageerror", (e) => errores.push(String(e)));
  pagina.on("console", (m) => {
    if (m.type() === "error") errores.push(m.text());
  });

  await pagina.goto("http://localhost:8080/index.html");

  await pagina.click("#tab-registro");
  const correo = `juegos${Date.now()}@t4.com`;
  await pagina.fill("#registro-nombre", "Sebas");
  await pagina.fill("#registro-correo", correo);
  await pagina.fill("#registro-contrasena", "123456");
  await pagina.check("#registro-politica");
  await pagina.click("#form-registro button[type=submit]");
  await pagina.waitForSelector("#vista-principal:not(.oculto)");
  console.log("registro ok");

  await pagina.click("#btn-juegos");
  await pagina.waitForSelector("#vista-juegos:not(.oculto)");
  await pagina.screenshot({ path: "/tmp/j1-menu.png" });
  console.log("menu de juegos visible");

  // Ahorcado
  await pagina.click("#btn-juego-ahorcado");
  await pagina.waitForSelector("#ahorcado-teclado .tecla");
  const pista = await pagina.textContent("#ahorcado-pista");
  const huecos = await pagina.locator("#ahorcado-palabra .hueco").count();
  console.log("ahorcado:", pista, "| huecos:", huecos);

  // Se falla a propósito para ver aparecer el muñeco
  for (const letra of ["Z", "X"]) {
    await pagina.click(`#ahorcado-teclado .tecla[data-letra="${letra}"]`);
    await ESPERA(250);
  }
  const partesVisibles = await pagina.locator("#ahorcado-dibujo .ahorcado-parte.visible").count();
  const intentos = await pagina.textContent("#ahorcado-intentos");
  console.log("tras 2 fallos: partes dibujadas", partesVisibles, "|", intentos);
  await pagina.screenshot({ path: "/tmp/j2-ahorcado.png" });

  // El teclado físico también juega
  await pagina.keyboard.press("e");
  await ESPERA(300);
  const usadas = await pagina.locator("#ahorcado-teclado .tecla-usada").count();
  console.log("teclas usadas tras teclado físico:", usadas);

  // Pista de la tienda
  const pistasAntes = await pagina.textContent("#ahorcado-pistas");
  await pagina.click("#btn-pista-ahorcado");
  await ESPERA(500);
  const pistasDespues = await pagina.textContent("#ahorcado-pistas");
  console.log("pistas:", pistasAntes, "->", pistasDespues);

  // Se termina la partida a lo bruto
  for (const letra of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    const tecla = pagina.locator(`#ahorcado-teclado .tecla[data-letra="${letra}"]`);
    if (await tecla.isEnabled()) {
      await tecla.click();
      await ESPERA(140);
    }
    if (!(await pagina.locator("#ahorcado-resultado").evaluate((e) => e.classList.contains("oculto")))) break;
  }
  console.log("resultado ahorcado:", (await pagina.textContent("#ahorcado-resultado")).trim());
  await pagina.screenshot({ path: "/tmp/j3-ahorcado-fin.png" });

  // Sopa de letras
  await pagina.click("#btn-menu-juegos");
  await pagina.click("#btn-juego-sopa");
  await pagina.waitForSelector("#sopa-grilla .sopa-celda");
  const celdas = await pagina.locator("#sopa-grilla .sopa-celda").count();
  const palabras = await pagina.locator("#sopa-palabras .sopa-palabra").count();
  console.log("sopa: celdas", celdas, "| palabras", palabras, "| reloj", await pagina.textContent("#sopa-reloj"));
  await pagina.screenshot({ path: "/tmp/j4-sopa.png" });

  // Se busca una palabra en la grilla y se arrastra sobre ella
  const tablero = await pagina.evaluate(() => {
    const filas = [];
    document.querySelectorAll("#sopa-grilla .sopa-celda").forEach((c) => {
      const f = Number(c.dataset.fila);
      filas[f] = filas[f] || [];
      filas[f][Number(c.dataset.columna)] = c.textContent;
    });
    return filas;
  });
  const listaPalabras = await pagina.$$eval("#sopa-palabras .sopa-palabra", (n) =>
    n.map((x) => x.dataset.palabra),
  );

  const DIRS = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
  const N = tablero.length;
  function ubicar(palabra) {
    for (let f = 0; f < N; f++)
      for (let c = 0; c < N; c++)
        for (const [df, dc] of DIRS) {
          const fe = f + df * (palabra.length - 1);
          const ce = c + dc * (palabra.length - 1);
          if (fe < 0 || ce < 0 || fe >= N || ce >= N) continue;
          let texto = "";
          for (let i = 0; i < palabra.length; i++) texto += tablero[f + df * i][c + dc * i];
          if (texto === palabra) return { f, c, fe, ce };
        }
    return null;
  }

  async function arrastrar(desde, hasta) {
    const a = await pagina.locator(`#sopa-grilla .sopa-celda[data-fila="${desde.f}"][data-columna="${desde.c}"]`).boundingBox();
    const b = await pagina.locator(`#sopa-grilla .sopa-celda[data-fila="${hasta.f}"][data-columna="${hasta.c}"]`).boundingBox();
    await pagina.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await pagina.mouse.down();
    await pagina.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    await pagina.mouse.up();
    await ESPERA(400);
  }

  const objetivo = ubicar(listaPalabras[0]);
  await arrastrar({ f: objetivo.f, c: objetivo.c }, { f: objetivo.fe, c: objetivo.ce });
  const halladas = await pagina.locator("#sopa-palabras .palabra-hallada").count();
  const celdasVerdes = await pagina.locator("#sopa-grilla .celda-hallada").count();
  console.log("tras arrastrar sobre", listaPalabras[0], "-> palabras tachadas:", halladas, "| celdas verdes:", celdasVerdes);

  // Un arrastre sobre letras sueltas no debe contar
  await arrastrar({ f: 0, c: 0 }, { f: 0, c: 1 });
  console.log("tras un arrastre cualquiera -> palabras tachadas:", await pagina.locator("#sopa-palabras .palabra-hallada").count());
  await pagina.screenshot({ path: "/tmp/j5-sopa-hallada.png" });

  // Se encuentra el resto para cerrar la partida
  for (const palabra of listaPalabras.slice(1)) {
    const donde = ubicar(palabra);
    if (donde) await arrastrar({ f: donde.f, c: donde.c }, { f: donde.fe, c: donde.ce });
  }
  await ESPERA(600);
  console.log("resultado sopa:", (await pagina.textContent("#sopa-resultado")).trim());
  await pagina.screenshot({ path: "/tmp/j6-sopa-fin.png" });

  // Emparejar
  await pagina.click("#btn-menu-juegos-2");
  await pagina.click("#btn-juego-emparejar");
  await pagina.waitForSelector("#emparejar-izquierda .carta-par");
  console.log("emparejar:", await pagina.textContent("#emparejar-marcador"));
  await pagina.screenshot({ path: "/tmp/j7-emparejar.png" });

  const TRAD = {
    planet: "planeta", bridge: "puente", silver: "plata",
    forest: "bosque", candle: "vela", market: "mercado",
  };
  const izquierdas = await pagina.$$eval("#emparejar-izquierda .carta-par", (n) => n.map((x) => x.textContent));

  // Primero una pareja equivocada a propósito
  await pagina.click(`#emparejar-izquierda .carta-par:has-text("${izquierdas[0]}")`);
  await pagina.click(`#emparejar-derecha .carta-par:has-text("${TRAD[izquierdas[1]]}")`);
  await ESPERA(300);
  console.log("pareja mala pinta en rojo:", await pagina.locator(".carta-fallada").count());
  await ESPERA(600);

  for (const palabra of izquierdas) {
    await pagina.click(`#emparejar-izquierda .carta-par:has-text("${palabra}")`);
    await pagina.click(`#emparejar-derecha .carta-par:text-is("${TRAD[palabra]}")`);
    await ESPERA(300);
  }
  console.log("marcador final:", await pagina.textContent("#emparejar-marcador"));
  console.log("resultado emparejar:", (await pagina.textContent("#emparejar-resultado")).trim());
  await pagina.screenshot({ path: "/tmp/j8-emparejar-fin.png" });

  // Vuelta al panel: el XP tiene que haber subido
  await pagina.click("#btn-salir-juegos");
  await pagina.waitForSelector("#vista-principal:not(.oculto)");
  await ESPERA(900);
  console.log("panel -> XP:", await pagina.textContent("#progreso-puntos"),
    "| monedas:", await pagina.textContent("#progreso-monedas"),
    "|", await pagina.textContent("#meta-diaria-texto"));
  await pagina.screenshot({ path: "/tmp/j9-panel.png", fullPage: true });

  console.log("\nERRORES JS:", errores.length ? errores : "ninguno");
  await navegador.close();
})();
