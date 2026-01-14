const axios = require('axios');

const API_URL = 'https://api.saludplus.co/api/anexoUrgencia/ListadoAnexos';

const PROPERTIES = [
  'numeroAdmision',
  'documento',
  'nombre1Paciente',
  'nombre2Paciente',
  'apellido1Paciente',
  'apellido2Paciente',
  'fecha'
];

async function BuscarAnexo(req, res) {
  try {
    const { filter, token } = req.body;

    if (!filter) {
      return res.status(400).json({
        ok: false,
        message: 'Debe enviar filter'
      });
    }

    if (!token) {
      return res.status(401).json({
        ok: false,
        message: 'Debe enviar token'
      });
    }

    const response = await axios.get(API_URL, {
      headers: {
        Authorization: token,
        Accept: 'application/json'
      },
      params: {
        filter,
        filterAudit: 3,
        pageSize: 30,
        pageNumber: 1,
        properties: PROPERTIES.join(',')
      }
    });

    // Validación de respuesta
    if (
      !response.data?.isSuccessful ||
      !Array.isArray(response.data.result) ||
      response.data.result.length === 0
    ) {
      return res.status(404).json({
        ok: false,
        message: 'No se encontraron resultados'
      });
    }

    const anexo = response.data.result[0];

    // 🔑 COMPARACIÓN CLAVE
    if (Number(anexo.numeroAdmision) === Number(filter)) {
      return res.status(200).json({
        ok: true,
        idAnexo: anexo.id
      });
    }

    // Si no coincide
    return res.status(404).json({
      ok: false,
      message: 'El numero de admisión no coincide'
    });

  } catch (error) {
    console.error('❌ Error BuscarAnexo:', error?.response?.data || error.message);

    return res.status(error?.response?.status || 500).json({
      ok: false,
      message: 'Error al consultar anexo',
      error: error?.response?.data || error.message
    });
  }
}

module.exports = { BuscarAnexo };
