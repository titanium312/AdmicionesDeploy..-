const axios = require('axios');
const token = require('./token'); // 👈 acá saca el token

exports.buscarFechaNacimiento = async (req, res) => {
  try {
    const documento = req.query.filter || req.body.documento;

    if (!documento) {
      return res.status(400).json({
        isError: true,
        message: 'El documento (filter) es requerido'
      });
    }

    // ✅ OBTENER TOKEN (IMPORTANTE: await)
    const authToken = await token.getToken();

    // ================= PARAMETROS =================
    const params = new URLSearchParams();
    params.append('pageSize', '30');
    params.append('pageNumber', '1');
    params.append('order', 'desc');
    params.append(
      'filterslist',
      '[{"filters":"1","properties":["estado"]},{"filters":"","properties":["tipoDocumentoPaciente"]},{"filters":"","properties":["fkSede"]}]'
    );
    params.append(
      'properties',
      'documentoPaciente,nombre1Paciente,nombre2Paciente,apellido1Paciente,apellido2Paciente,estado,tipoDocumentoPaciente,fkSede'
    );
    params.append('filter', documento);
    params.append('filterAudit', '3');
    params.append('sort', 'idPaciente');

    // ================= CONSULTA =================
    const response = await axios.get(
      'https://api.saludplus.co/api/pacientes/ListadoPacientes',
      {
        params,
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    const data = response.data;

    // ================= DEBUG =================
    if (!data.result || data.result.length === 0) {
      console.log(
        '⚠ SaludPlus respondió sin resultados para el doc:',
        documento
      );
    }

    // ================= RESPUESTA OK =================
    if (data?.isSuccessful && data.result?.length > 0) {
      const p = data.result[0];

      return res.json({
        isSuccessful: true,
        documento: p.documentoPaciente,
        nombre: `${p.nombre1Paciente} ${p.apellido1Paciente}`,
        fechaNacimiento: p.fechaNacimiento
      });
    }

    // ================= NO ENCONTRADO =================
    return res.status(404).json({
      isSuccessful: false,
      message: 'Paciente no encontrado en SaludPlus',
      apiRawResponse: data
    });

  } catch (error) {
    console.error(
      '🔥 Error API SaludPlus:',
      error.response?.data || error.message
    );

    return res.status(500).json({
      isError: true,
      message: 'Error consultando paciente',
      error: error.message
    });
  }
};
