const axios = require('axios');

const IdinstitucionES = {
  14: {
    nombre: 'TOLUVIEJO',
    data: 'r/EZTPgNx62XzkLqKBYdDKCZ6CpXzAvwUsPsDB5E4tI=.qSTbSfTuauUhk/PDAmMBhw==.W8yyMby3724tK/yRfaS43A=='
  },
  20: {
    nombre: 'HOSPITAL SAN JORGE',
    data: '3KpvkLUGr3iohpFUZSKPvAkg2A/bXYWC9XP9o9K5Ppc=.1SS9/UCeyjpq9PyT8MBqPg==.wcFkBNOeMUO3EbN8I4nUXw=='
  },
  28: {
    nombre: 'HOSPITAL LOCAL SANTIAGO DE TOLÚ ESE',
    data: '9Eq0mOR4zMmRU3S0IlzdH1Uv8B6W0ur7jJV7X0oTeQ0=.Z0YjGvL5Y9AfBZulmPnHuw==.NAZKYZnmjNiBit9QwfK28A=='
  }
};

async function NumeroFactura(req, res) {
  try {
    const { idFacturas, numeroFactura = '', Idinstitucion } = req.query;
    const idInst = Number(Idinstitucion);

    if (!idFacturas) {
      return res.status(400).json({ error: 'idFacturas es requerido' });
    }

    if (!idInst || !IdinstitucionES[idInst]) {
      return res.status(400).json({
        error: 'Idinstitucion inválida',
        disponibles: Object.keys(IdinstitucionES)
      });
    }

    const url = 'https://balance.saludplus.co/facturasAdministar/Numerarfacturas';

    const headers = {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Referer': 'https://balance.saludplus.co/instituciones/?origen=1',
      'data': IdinstitucionES[idInst].data
    };

    const response = await axios.get(url, {
      headers,
      params: { idFacturas, numeroFactura },
      timeout: 10000
    });

    return res.json({
      institucion: IdinstitucionES[idInst].nombre,
      resultado: response.data
    });

  } catch (error) {
    console.error('Error in NumeroFactura:', error.message);

    if (error.response) {
      return res.status(error.response.status).json({
        error: true,
        backend: error.response.data
      });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { NumeroFactura };
