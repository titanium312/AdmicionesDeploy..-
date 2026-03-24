// ./controllers/facturas.controller.js
const axios = require('axios');
const querystring = require('querystring');

/**
 * Convierte una fecha de YYYY/MM/DD a MM/DD/YYYY
 * @param {string} fechaStr - Ejemplo: "2026/03/24"
 * @returns {string} - Ejemplo: "03/24/2026"
 */
function formatearFechaParaAPI(fechaStr) {
  if (!fechaStr) return "";
  // Reemplazamos guiones por slashes por si acaso y dividimos
  const partes = fechaStr.replace(/-/g, '/').split('/');
  
  if (partes.length !== 3) return fechaStr; // Retorna original si no tiene el formato esperado

  const [anio, mes, dia] = partes;
  return `${mes}/${dia}/${anio}`;
}

async function cambiarFechaEmision(req, res) {
  try {
    const { idFactura, fechaEmision } = req.body;

    if (!idFactura || !fechaEmision) {
      return res.status(400).json({
        ok: false,
        mensaje: "Faltan parámetros: idFactura y/o fechaEmision",
      });
    }

    // TRANSFORMACIÓN: De "2026/03/24" a "03/24/2026"
    const fechaFormateada = formatearFechaParaAPI(fechaEmision);

    const uri = "https://balance.saludplus.co/facturasAdministar/cambiarfechaEmisionAccion";

    const body = querystring.stringify({
      idFacturas: idFactura.toString().trim(), 
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
        fechaRecibida: fechaEmision, // 2026/03/24
        fechaEnviada: fechaFormateada, // 03/24/2026
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