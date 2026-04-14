const axios = require('axios');
const token = require('./token');

exports.buscarFechaNacimiento = async (req, res) => {
  try {
    const documento = req.query.filter || req.body.documento;

    if (!documento) {
      return res.status(400).json({ isError: true, message: 'Documento requerido' });
    }

    const authToken = await token.getToken();
    const params = new URLSearchParams();

    // Configuración de paginación básica
    params.append('pageSize', '10');
    params.append('pageNumber', '1');
    params.append('sort', 'idPaciente');
    params.append('order', 'desc');

    // IMPORTANTE: En lugar de usar 'filter' general, usamos un filtro específico
    // Esto evita que la API intente buscar el texto en columnas que no aceptan nulos
    const filtros = [
      {
        filters: documento.toString().trim(),
        properties: ['documentoPaciente']
      }
    ];
    params.append('filterslist', JSON.stringify(filtros));

    // Solicitamos explícitamente los campos que necesitamos
    params.append(
      'properties',
      'documentoPaciente,nombre1Paciente,nombre2Paciente,apellido1Paciente,apellido2Paciente,fechaNacimiento'
    );

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

    if (data?.isSuccessful && data.result?.length > 0) {
      const p = data.result[0];
      
      // Limpiamos el nombre para que no tenga nulos
      const nombreCompleto = [p.nombre1Paciente, p.nombre2Paciente, p.apellido1Paciente, p.apellido2Paciente]
        .filter(Boolean)
        .join(' ');

      return res.json({
        isSuccessful: true,
        documento: p.documentoPaciente,
        nombre: nombreCompleto,
        fechaNacimiento: p.fechaNacimiento
      });
    }

    // Si sigue saliendo el error de Coalesce, lo veremos aquí
    return res.status(404).json({
      isSuccessful: false,
      message: 'No se encontró el paciente',
      apiRawResponse: data
    });

  } catch (error) {
    console.error('🔥 Error API:', error.response?.data || error.message);
    return res.status(500).json({
      isError: true,
      message: 'Error en la consulta',
      detail: error.response?.data || error.message
    });
  }
};


