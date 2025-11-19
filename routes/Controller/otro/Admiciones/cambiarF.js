// ./controllers/facturas.controller.js
const axios = require('axios');
const querystring = require('querystring');

// POST /facturas/cambiar-fecha
// Recibe: { idFactura: "5607145", fechaEmision: "11/01/2025" }
// Envia la fecha tal cual: "11/01/2025"
async function cambiarFechaEmision(req, res) {
  try {
    const { idFactura, fechaEmision } = req.body;

    if (!idFactura || !fechaEmision) {
      return res.status(400).json({
        ok: false,
        mensaje: "Faltan parámetros: idFactura y/o fechaEmision",
      });
    }

    // NO convertir fecha → se envía tal cual
    const fechaFormateada = fechaEmision;

    const uri =
      "https://balance.saludplus.co/facturasAdministar/cambiarfechaEmisionAccion";

    const body = querystring.stringify({
      idFacturas: idFactura.trim(), // Se limpia espacio accidental
      fechaEmision: fechaFormateada,
    });

    const headers = {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Cookie: req.headers.cookie || process.env.SALUDPLUS_COOKIE || "",
    };

    const { data } = await axios.post(uri, body, { headers });

    return res.json({
      ok: true,
      data,
      debug: {
        fechaEnviada: fechaFormateada,
      },
    });
  } catch (error) {
    console.error("Error al cambiar fecha de emisión:", error.message);

    return res.status(error.response?.status || 500).json({
      ok: false,
      mensaje: "Error al llamar al servicio cambiarfechaEmisionAccion",
      error: error.message,
      serverBody: error.response?.data,
    });
  }
}

module.exports = { cambiarFechaEmision };
