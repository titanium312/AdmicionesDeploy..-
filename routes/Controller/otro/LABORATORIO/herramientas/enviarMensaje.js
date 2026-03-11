const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

let client;

function iniciarCliente() {

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: "./.wwebjs_auth"
    }),
    puppeteer: {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ]
    }
  });

  client.on("qr", (qr) => {
    console.log("📲 Escanea el QR con tu WhatsApp");
    qrcode.generate(qr, { small: true });
  });

  client.on("ready", () => {
    console.log("✅ WhatsApp conectado");
  });

  client.on("authenticated", () => {
    console.log("🔐 WhatsApp autenticado");
  });

  client.on("auth_failure", (msg) => {
    console.error("❌ Error de autenticación:", msg);
  });

  client.on("disconnected", (reason) => {
    console.log("⚠️ WhatsApp desconectado:", reason);
    console.log("🔄 Reconectando...");
    iniciarCliente();
  });

  client.initialize();
}

iniciarCliente();


// ------------------
// ENVIAR MENSAJE
// ------------------

const enviarMensaje = async (req, res) => {

  try {

    const { numero, mensaje } = req.body;

    if (!numero || !mensaje) {
      return res.status(400).json({
        ok: false,
        error: "Numero y mensaje son obligatorios"
      });
    }

    const numeroFormateado = numero + "@c.us";

    const response = await client.sendMessage(numeroFormateado, mensaje);

    res.json({
      ok: true,
      enviado: true,
      id: response.id.id
    });

  } catch (error) {

    console.error("Error enviando mensaje:", error);

    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
};

module.exports = {
  enviarMensaje
};