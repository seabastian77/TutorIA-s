// El botón de Google en el login: que aparezca, entre, y se esconda si no hay
const { chromium } = require("playwright");
const ESPERA = (ms) => new Promise((r) => setTimeout(r, ms));

// Hace de script de Google: guarda la llamada y pinta un botón de mentiras
const GOOGLE_FALSO = `
  window.__google = { iniciado: null, pintado: false };
  window.google = {
    accounts: {
      id: {
        initialize: (opciones) => {
          window.__google.iniciado = opciones;
          window.__entrarConGoogle = (credencial) => opciones.callback({ credential: credencial });
        },
        renderButton: (caja) => {
          window.__google.pintado = true;
          caja.innerHTML = '<button id="google-falso" type="button" ' +
            'style="min-height:44px;padding:10px 20px">Continue with Google</button>';
        },
      },
    },
  };
`;

(async () => {
  const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const correo = `ui${Date.now()}@t4.com`;

  for (const [tema, ancho, alto] of [["claro", 1280, 900], ["oscuro", 1280, 900], ["movil", 390, 780]]) {
    const p = await nav.newPage({ viewport: { width: ancho, height: alto } });
    const errores = [];
    p.on("pageerror", (e) => errores.push(String(e)));
    await p.addInitScript(GOOGLE_FALSO);

    if (tema === "oscuro") {
      await p.goto("http://localhost:8080/index.html");
      await p.evaluate(() => localStorage.setItem("tutorias_tema", "oscuro"));
    }
    await p.goto("http://localhost:8080/index.html");
    await p.waitForSelector("#caja-google:not(.oculto)", { timeout: 15000 });

    const estado = await p.evaluate(() => ({
      pintado: window.__google.pintado,
      clientId: window.__google.iniciado && window.__google.iniciado.client_id,
    }));
    console.log(tema, "| botón pintado:", estado.pintado, "| con el clientId del servidor:",
      estado.clientId === "prueba.apps.googleusercontent.com");

    const caja = await p.locator("#boton-google button").boundingBox();
    console.log(tema, "| tamaño del botón:", Math.round(caja.width) + "x" + Math.round(caja.height));
    await p.screenshot({ path: `/tmp/google-${tema}.png` });

    if (tema === "claro") {
      // Entrar de verdad, con el perfil que el stub del backend entiende
      await p.evaluate((c) => window.__entrarConGoogle(JSON.stringify({
        sub: "g-ui-1", email: c, email_verified: true, name: "Sebas UI",
      })), correo);
      await p.waitForSelector("#vista-principal:not(.oculto)", { timeout: 15000 });
      console.log(tema, "| entró y saluda:", (await p.textContent("#saludo-usuario")).trim());
      console.log(tema, "| quedó sesión guardada:",
        !!(await p.evaluate(() => localStorage.getItem("tutorias_token"))));

      // Un rechazo del backend tiene que verse, no quedarse callado
      await p.evaluate(() => { localStorage.clear(); });
      await p.goto("http://localhost:8080/index.html");
      await p.waitForSelector("#caja-google:not(.oculto)");
      await p.evaluate(() => window.__entrarConGoogle(JSON.stringify({
        sub: "g-ui-2", email: "sinverificar@t4.com", email_verified: false,
      })));
      await p.waitForSelector(".mensaje-error.visible");
      console.log(tema, "| avisa si Google no verificó:", (await p.textContent(".mensaje-error")).trim());
    }

    console.log(tema, "| errores de JS:", errores.length, errores.slice(0, 2));
    await p.close();
  }

  // Sin Google configurado, el botón no puede aparecer
  const p2 = await nav.newPage();
  await p2.addInitScript(GOOGLE_FALSO);
  await p2.route("**/auth/config", (ruta) =>
    ruta.fulfill({ status: 200, contentType: "application/json", body: '{"googleClientId":null}' }));
  await p2.goto("http://localhost:8080/index.html");
  await ESPERA(1200);
  console.log("sin configurar | la caja de Google sigue escondida:",
    (await p2.locator("#caja-google.oculto").count()) === 1);
  console.log("sin configurar | el login normal sigue ahí:",
    (await p2.locator("#form-login").isVisible()));
  await p2.close();

  await nav.close();
})();
