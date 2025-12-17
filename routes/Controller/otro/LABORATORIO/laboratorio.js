const axios = require('axios');
const { createToken } = require('../../Base/toke');
const buscarPacienteCtrl = require('./herramientas/buscarPaciente');

// =======================================================
// Helper: ejecutar buscarPaciente internamente
// =======================================================
const ejecutarBuscarPaciente = (numeroAdmision) => {
  return new Promise((resolve, reject) => {
    const reqFake = { body: { search: numeroAdmision } };

    const resFake = {
      json: (data) => resolve(data),
      status: (code) => ({
        json: (err) => reject({ code, err })
      })
    };

    buscarPacienteCtrl.buscarPaciente(reqFake, resFake);
  });
};

// =======================================================
// Helper: normalizar fecha a YYYY-MM-DD
// =======================================================
const normalizarFecha = (fecha) => {
  if (!fecha) return '';

  const f = String(fecha).trim();

  // 1953-10-23T00:00:00
  if (f.includes('T')) {
    return f.split('T')[0];
  }

  // 1953-10-23 00:00:00
  if (f.includes(' ')) {
    return f.split(' ')[0];
  }

  // 23/10/1953
  if (f.includes('/')) {
    const [d, m, y] = f.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return f;
};

// =======================================================
// Controller principal
// =======================================================
async function DescargarLaboratorio(req, res) {
  try {
    // Soporta GET y POST
    const source = req.method === 'GET' ? req.query : req.body;

    const {
      institucionId,
      idUser,
      numeroAdmicion, // se respeta el nombre
      tipoDocumento,
      numeroDocumento,
      fechaNacimiento
    } = source;

    // ================= VALIDACIONES BÁSICAS =================
    const faltantes = [];
    if (!institucionId) faltantes.push('institucionId');
    if (!idUser) faltantes.push('idUser');
    if (!numeroAdmicion) faltantes.push('numeroAdmicion');
    if (!tipoDocumento) faltantes.push('tipoDocumento');
    if (!numeroDocumento) faltantes.push('numeroDocumento');
    if (!fechaNacimiento) faltantes.push('fechaNacimiento');

    if (faltantes.length) {
      return res.status(400).json({
        success: false,
        paso: 'VALIDACION_PARAMETROS',
        faltantes
      });
    }

    const instId = Number(institucionId);
    const userId = Number(idUser);

    if (!Number.isFinite(instId) || !Number.isFinite(userId)) {
      return res.status(400).json({
        success: false,
        paso: 'VALIDACION_NUMERICA',
        message: 'institucionId e idUser deben ser numéricos'
      });
    }

    // ================= 1) BUSCAR PACIENTE =================
    const numeroAdmisionBuscada = String(numeroAdmicion)
      .trim()
      .split(/\s+/)[0];

    let paciente;
    try {
      paciente = await ejecutarBuscarPaciente(numeroAdmisionBuscada);
    } catch (e) {
      return res.status(500).json({
        success: false,
        paso: 'BUSCAR_PACIENTE',
        error: e
      });
    }

    if (!paciente || !paciente.isSuccessful) {
      return res.status(404).json({
        success: false,
        paso: 'PACIENTE_NO_ENCONTRADO'
      });
    }

    const {
      idAdmision,
      numeroAdmision,
      tipoDocumento: tipoDocBD,
      documento: numeroDocBD,
      fechaNacimiento: fechaNacBD
    } = paciente;

    // ================= 2) VALIDACIÓN DE SEGURIDAD =================
    const norm = (v) =>
      v === undefined || v === null ? '' : String(v).trim().toUpperCase();

    const errores = [];

    if (norm(tipoDocBD) !== norm(tipoDocumento)) {
      errores.push('tipoDocumento');
    }

    if (norm(numeroDocBD) !== norm(numeroDocumento)) {
      errores.push('numeroDocumento');
    }

    if (
      normalizarFecha(fechaNacBD) !==
      normalizarFecha(fechaNacimiento)
    ) {
      errores.push('fechaNacimiento');
    }

    if (norm(numeroAdmision) !== norm(numeroAdmisionBuscada)) {
      errores.push('numeroAdmision');
    }

    if (errores.length) {
      return res.status(401).json({
        success: false,
        paso: 'VALIDACION_SEGURIDAD',
        errores
      });
    }

    // ================= 3) VALIDAR idAdmision =================
    const resolvedAdmisionId = Number(idAdmision);

    if (!Number.isFinite(resolvedAdmisionId) || resolvedAdmisionId <= 0) {
      return res.status(400).json({
        success: false,
        paso: 'ID_ADMISION_INVALIDO'
      });
    }

    // ================= 4) GENERAR TOKEN =================
    let token;
    try {
      token = createToken(
        'ListadoInformesResultadosLaboratorio',
        instId,
        83,
        userId
      );
    } catch (e) {
      return res.status(500).json({
        success: false,
        paso: 'CREATE_TOKEN',
        message: 'Error generando token',
        error: e.message
      });
    }

    if (!token) {
      return res.status(500).json({
        success: false,
        paso: 'TOKEN_UNDEFINED'
      });
    }

    // ================= 5) GENERAR URL =================
    const params = new URLSearchParams({
      modulo: 'Laboratorio',
      reporte: 'ListadoInformesResultadosLaboratorio',
      render: 'pdf',
      hideTool: 'true',
      environment: '1',
      userId: String(userId),
      idAdmision: String(resolvedAdmisionId),
      token
    });

    const url = `https://reportes.saludplus.co/view.aspx?${params.toString()}`;

    // ================= 6) DESCARGAR PDF =================
    const reportResponse = await axios.get(url, {
      responseType: 'stream',
      validateStatus: () => true
    });

    const contentType = reportResponse.headers['content-type'] || '';

    if (!contentType.includes('pdf')) {
      return res.status(502).json({
        success: false,
        paso: 'REPORTE_NO_PDF',
        status: reportResponse.status,
        contentType,
        url
      });
    }

    // ================= 7) ENVIAR PDF =================
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="laboratorio_${resolvedAdmisionId}.pdf"`
    );

    reportResponse.data.pipe(res);

  } catch (error) {
    console.error('🔥 ERROR GENERAL DescargarLaboratorio:', error);

    return res.status(500).json({
      success: false,
      paso: 'EXCEPCION_GENERAL',
      message: error.message
    });
  }
}

module.exports = { DescargarLaboratorio };
