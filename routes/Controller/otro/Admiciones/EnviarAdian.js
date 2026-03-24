const axios = require('axios');

async function EnviarADian(req, res) {
    const { idFacturas } = req.body;

    if (!idFacturas) {
        return res.status(400).json({ error: 'idFacturas es requerido' });
    }

    const url = 'https://balance.saludplus.co/facturasAdministar/facturacionElectronica';

    const headers = {
        'data': 'kC0YDHEUO0vlftrAtYHllfCjAqT8zXGwj/hFT8ULo8k=.1SS9/UCeyjpq9PyT8MBqPg==.wcFkBNOeMUO3EbN8I4nUXw=='
    };

    const data = {
        idFacturas: idFacturas.toString(),
        idNotasCredito: "",
        idNotasDebito: ""
    };

    try {
        const response = await axios.post(url, data, { headers });

        // Respuesta exitosa del curl: {"valorRetorno":1,"mensajeRetorno":""}
        res.json(response.data);
    } catch (error) {
        console.error('Error al enviar a DIAN:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Error al enviar factura a DIAN',
            details: error.response?.data || error.message
        });
    }
}

module.exports = { EnviarADian };