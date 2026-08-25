const sql = require('mssql');

const dbConfig = {
  user: process.env.DB_USER || 'developer',
  password: process.env.DB_PASS || 'lsbQUA2Z75)2',
  server: process.env.DB_HOST || '54.159.152.155',
  database: process.env.DB_NAME || 'SaludPlus24HRS',
  options: { encrypt: false, trustServerCertificate: true },
  connectionTimeout: Number(process.env.DB_CONN_TIMEOUT || 15000),
};

async function buscarFacturaDb(req, res) {
  try {
    const { numero_admision, fk_institucion } = req.body;

    if (!numero_admision || !fk_institucion) {
      return res.status(400).json({
        error: 'Faltan datos: numero_admision y fk_institucion son obligatorios'
      });
    }

    const pool = await sql.connect(dbConfig);

    // 1️⃣ Buscar admisión
    const admQuery = `
      SELECT id_admision
      FROM facturacion_admisiones
      WHERE fk_institucion = @fk_institucion
        AND numero_admision = @numero_admision
    `;

    const admResult = await pool
      .request()
      .input('fk_institucion', sql.Int, fk_institucion)
      .input('numero_admision', sql.VarChar, numero_admision)
      .query(admQuery);

    if (admResult.recordset.length === 0) {
      return res.status(404).json({
        error: 'No existe admisión con esos datos',
        numero_admision,
        fk_institucion
      });
    }

    const id_admision = admResult.recordset[0].id_admision;

    // 2️⃣ Buscar factura usando id_admision + institución
    const facQuery = `
      SELECT id_factura, numero_factura
      FROM facturas
      WHERE fk_institucion = @fk_institucion
        AND fk_admision = @id_admision
    `;

    const facResult = await pool
      .request()
      .input('fk_institucion', sql.Int, fk_institucion)
      .input('id_admision', sql.Int, id_admision)
      .query(facQuery);

    if (facResult.recordset.length === 0) {
      return res.status(404).json({
        error: 'La admisión existe pero no tiene factura',
        id_admision,
        fk_institucion
      });
    }

    const factura = facResult.recordset[0];

    // 3️⃣ Respuesta final
    return res.json({
      success: true,
      numero_admision,
      fk_institucion,
      id_admision,
      id_factura: factura.id_factura,
      numero_factura: factura.numero_factura
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Error interno',
      detalle: error.message
    });
  }
}

module.exports = { buscarFacturaDb };
