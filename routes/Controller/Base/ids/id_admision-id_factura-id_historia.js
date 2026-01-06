const fetch = require('node-fetch');

const URL_ADMISION =
  'https://balance.saludplus.co/admisiones/AdmisionBuscarConAscendientes';

/* =====================================================
   STORAGE SIMPLE (MEMORIA)
   👉 luego lo cambias por BD
===================================================== */


/* =====================================================
   CONTROLLER
===================================================== */
async function ConsultaId(req, res) {
  try {
    const { idAdmision } = req.query;

    if (!idAdmision) {
      return res.status(400).json({
        error: 'idAdmision es requerido'
      });
    }

    /* ==========================
       1. CONSULTA API
    =========================== */
    const response = await fetch(
      `${URL_ADMISION}?idAdmision=${idAdmision}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        }
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Error consultando admisión'
      });
    }

    const data = await response.json();

    /* ==========================
       2. EXTRAER DATOS
    =========================== */
    const id_historia = data?.historia?.id_historia || null;

    const id_factura =
      data?.admision?.facturas?.length > 0
        ? data.admision.facturas[0].id_factura
        : null;

    if (!id_historia || !id_factura) {
      return res.status(404).json({
        error: 'No se encontraron id_factura o id_historia'
      });
    }

    /* ==========================
       3. GUARDAR
    =========================== */
    const registro = {
      id_admision: Number(idAdmision),
      id_factura,
      id_historia,
    };

    registros.push(registro);

    /* ==========================
       4. RESPUESTA
    =========================== */
return res.json({
  id_admision: registro.id_admision,
  id_factura: registro.id_factura,
  id_historia: registro.id_historia
});
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
}

module.exports = {
  ConsultaId,
};
