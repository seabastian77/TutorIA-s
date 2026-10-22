// Conexión con Simli, el proveedor de avatar en video: solo se carga si el backend tiene sus claves

const SIMLI_SDK = "https://cdn.jsdelivr.net/npm/simli-client@3.0.3/+esm";
const TROZO_PCM = 6000; // bytes por envío, como en el ejemplo oficial (PCM16 a 16 kHz)

const AvatarSimli = {
  /**
   * Abre el video en vivo con el token que dio el backend. Resuelve cuando Simli confirma que el
   * avatar ya se ve; si algo falla lanza un error y la tutoría sigue con el avatar de demostración.
   */
  async conectar({ sessionToken, video, audio, alHablar, alCallar, alCortarse }) {
    const sdk = await import(SIMLI_SDK);
    const cliente = new sdk.SimliClient(sessionToken, video, audio, null, sdk.LogLevel && sdk.LogLevel.ERROR, "livekit");

    const listo = new Promise((resolver, rechazar) => {
      const espera = setTimeout(() => rechazar(new Error("Simli no respondió a tiempo")), 20000);
      cliente.on("start", () => { clearTimeout(espera); resolver(); });
      cliente.on("error", (e) => { clearTimeout(espera); rechazar(new Error(String(e || "Error de Simli"))); });
      cliente.on("startup_error", (e) => { clearTimeout(espera); rechazar(new Error(String(e || "Simli no pudo arrancar"))); });
    });
    cliente.on("speaking", () => alHablar && alHablar());
    cliente.on("silent", () => alCallar && alCallar());
    cliente.on("stop", () => alCortarse && alCortarse());

    await cliente.start();
    await listo;

    return {
      /** Envía la voz ya convertida a PCM16 de 16 kHz; Simli mueve los labios y la reproduce. */
      enviarVoz(pcm) {
        for (let i = 0; i < pcm.length; i += TROZO_PCM) cliente.sendAudioData(pcm.subarray(i, i + TROZO_PCM));
      },
      /** Corta lo que el avatar esté diciendo. */
      callar() {
        if (typeof cliente.ClearBuffer === "function") cliente.ClearBuffer();
      },
      async cerrar() {
        try { await cliente.stop(); } catch (e) { /* ya estaba cerrado */ }
      },
    };
  },
};

window.AvatarSimli = AvatarSimli;
