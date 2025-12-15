const axios = require('axios');

const IdinstitucionES = {
  14: {
    nombre: 'TOLUVIEJO',
    data: 'r/EZTPgNx62XzkLqKBYdDKCZ6CpXzAvwUsPsDB5E4tI=.qSTbSfTuauUhk/PDAmMBhw==.W8yyMby3724tK/yRfaS43A=='
  },
  20: {
    nombre: 'HOSPITAL SAN JORGE',
    data: '3KpvkLUGr3iohpFUZSKPvAkg2A/bXYWC9XP9o9K5Ppc=.1SS9/UCeyjpq9PyT8MBqPg==.wcFkBNOeMUO3EbN8I4nUXw=='
  }
};

async function NumeroFactura(req, res) {
  try {
    // Obtén los parámetros de la URL
    const { idFacturas, numeroFactura = '', Idinstitucion } = req.query;

    // Verifica si el parámetro idFacturas está presente
    if (!idFacturas) {
      return res.status(400).json({ error: 'idFacturas is required' });
    }

    // Verifica si el parámetro Idinstitucion es válido
    if (!Idinstitucion || !IdinstitucionES[Idinstitucion]) {
      return res.status(400).json({
        error: 'Idinstitucion inválida',
        disponibles: Object.keys(IdinstitucionES)  // Devuelve las credenciales disponibles (14, 20)
      });
    }

    // Construye la URL del endpoint de la API
    const url = 'https://balance.saludplus.co/facturasAdministar/Numerarfacturas';

    // Configura los headers con la credencial seleccionada
    const headers = {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      'data': IdinstitucionES[Idinstitucion].data  // Usamos la credencial según el Idinstitucion
    };

    // Llama a la API con los parámetros requeridos
    const response = await axios.get(url, {
      headers,
      params: { idFacturas, numeroFactura },
      timeout: 10000
    });

    // Devuelve el resultado con el nombre de la institución
    return res.json({
      institucion: IdinstitucionES[Idinstitucion].nombre,
      resultado: response.data
    });

  } catch (error) {
    // Manejo de errores
    console.error('Error in NumeroFactura:', error.message);

    if (error.response) {
      return res
        .status(error.response.status)
        .json(error.response.data);  // Devuelve los datos del error desde la API
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { NumeroFactura };
