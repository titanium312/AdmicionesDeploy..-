const axios = require('axios');
const buscarFechaCtrl = require('./BuscarPacienteFecha');

const URL_ADMISIONES =
  'https://balance.saludplus.co/admisiones/BucardorAdmisionesDatos';

// =======================================================
// Helper: obtener fecha nacimiento
// =======================================================
const obtenerFechaNacimiento = (documento) => {
  return new Promise((resolve, reject) => {
    const reqFake = {
      query: { filter: documento },
      body: {}
    };

    const resFake = {
      json: (data) => resolve(data),
      status: () => ({
        json: (err) => reject(err)
      })
    };

    buscarFechaCtrl.buscarFechaNacimiento(reqFake, resFake);
  });
};

// =======================================================
// Controller principal
// =======================================================
exports.buscarPaciente = async (req, res) => {
  try {
    const { search } = req.body;

    if (!search) {
      return res.status(400).json({
        isError: true,
        message: 'El parámetro search es obligatorio'
      });
    }

    // ================= NORMALIZACIÓN =================
    // "1 FEH23121" | " 1 " -> "1"
    const searchAdmision = String(search).trim().split(/\s+/)[0];

    // ================= CONSULTA =================
    const response = await axios.post(
      URL_ADMISIONES,
      {
        sEcho: 1,
        iDisplayStart: 0,
        iDisplayLength: 100, // más registros para asegurar match
        sSearch: searchAdmision
      },
      {
        params: {
          fechaInicial: '*',
          fechaFinal: '*',
          idRecurso: 0,
          SinCargo: false,
          idServicioIngreso: 3,
          idCaracteristica: 0,
          validarSede: true
        },
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          data:
            'zsJo9Q61W/UjmJFf0xF8QZewLMC0rk3+wGbXhGdsmkM=.1SS9/UCeyjpq9PyT8MBqPg==.wcFkBNOeMUO3EbN8I4nUXw==',
          'X-Requested-With': 'XMLHttpRequest',
          Origin: 'https://balance.saludplus.co',
          Referer:
            'https://balance.saludplus.co/instituciones/?origen=1&theme=false'
        }
      }
    );

    const filas = response.data?.aaData || [];

    if (!filas.length) {
      return res.status(404).json({
        isError: true,
        message: 'No se encontraron admisiones'
      });
    }

    // ================= FILTRO EXACTO =================
    const filaExacta = filas.find((fila) => {
      const admision = String(fila[1]).trim().split(/\s+/)[0];
      return admision === searchAdmision;
    });

    if (!filaExacta) {
      return res.status(404).json({
        isError: true,
        message: 'No existe una admisión exacta con ese número'
      });
    }

    // ================= EXTRACCIÓN =================
    const idAdmision = filaExacta[0];
    const numeroAdmision = String(filaExacta[1]).trim().split(/\s+/)[0];

    const [tipoDocumento, documento] =
      String(filaExacta[2]).trim().split(/\s+/);

    // ================= FECHA NACIMIENTO =================
    let fechaNacimiento = null;

    try {
      const fechaResp = await obtenerFechaNacimiento(documento);

      if (
        fechaResp?.isSuccessful &&
        String(fechaResp.documento).trim() === documento
      ) {
        fechaNacimiento = fechaResp.fechaNacimiento;
      }
    } catch (e) {
      console.warn('⚠ No se pudo obtener fecha nacimiento:', e.message);
    }

    // ================= RESPUESTA =================
    return res.json({
      isSuccessful: true,
      idAdmision,
      numeroAdmision,
      tipoDocumento,
      documento,
      fechaNacimiento
    });

  } catch (error) {
    console.error(
      '🔥 Error buscando paciente:',
      error.response?.status,
      error.response?.data || error.message
    );

    return res.status(500).json({
      isError: true,
      message: 'Error consultando admisiones'
    });
  }
};
