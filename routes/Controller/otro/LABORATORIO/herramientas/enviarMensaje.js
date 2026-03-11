const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

class WhatsappController {
    constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: { args: ['--no-sandbox'] }
        });

        this.initEvents();
        this.client.initialize();
    }

    initEvents() {
        this.client.on('qr', (qr) => qrcode.generate(qr, { small: true }));
        this.client.on('ready', () => console.log("WhatsApp conectado"));
    }

    enviarMensaje = async (req, res) => {
        try {
            const { telefono, mensaje } = req.query; 
            const numero = `${telefono}@c.us`;
            await this.client.sendMessage(numero, mensaje);
            res.json({ status: true, mensaje: "Enviado" });
        } catch (error) {
            res.status(500).json({ status: false, error: error.message });
        }
    }
}

const whatsappService = new WhatsappController();
module.exports = { enviarMensaje: whatsappService.enviarMensaje };