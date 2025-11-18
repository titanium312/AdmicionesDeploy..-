// ./controllers/facturas.controller.js
const axios = require('axios');
const querystring = require('querystring');

// POST /facturas/cambiar-fecha-emision
// body esperado: { idFactura: "3607138", fechaEmision: "11/13/2025" } → se convierte a 13/11/2025
async function cambiarFechaEmision(req, res) {
  try {
    const { idFactura, fechaEmision } = req.body;

    if (!idFactura || !fechaEmision) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Faltan parámetros: idFactura y/o fechaEmision',
      });
    }

    // === CONVERSIÓN DE FECHA: MM/DD/YYYY → DD/MM/YYYY ===
    let fechaFormateada;
    try {
      const [mes, dia, anio] = fechaEmision.split('/').map(Number);

      if (!mes || !dia || !anio || mes > 12 || dia > 31) {
        throw new Error('Formato de fecha inválido o valores fuera de rango');
      }

      // Aseguramos 2 dígitos para día y mes
      fechaFormateada = `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${anio}`;
    } catch (err) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Formato de fecha inválido. Usa MM/DD/YYYY (ej: 11/13/2025)',
      });
    }

    const uri = 'https://balance.saludplus.co/facturasAdministar/cambiarfechaEmisionAccion';

    const body = querystring.stringify({
      idFacturas: idFactura,        // nombre exacto esperado por el backend
      fechaEmision: fechaFormateada, // ← fecha ya convertida a DD/MM/YYYY
    });

    const headers = {
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Cookie: req.headers.cookie || process.env.SALUDPLUS_COOKIE || '',
    };

    const { data } = await axios.post(uri, body, { headers });

    return res.json({
      ok: true,
      data,
      // Opcional: mostrar la fecha enviada
      debug: { fechaRecibida: fechaEmision, fechaEnviada: fechaFormateada },
    });
  } catch (error) {
    console.error('Error al cambiar fecha de emisión:', error.message);

    const status = error.response?.status || 500;
    const serverBody = error.response?.data;

    return res.status(status).json({
      ok: false,
      mensaje: 'Error al llamar al servicio cambiarfechaEmisionAccion',
      error: error.message,
      serverBody,
    });
  }
}

module.exports = { cambiarFechaEmision };