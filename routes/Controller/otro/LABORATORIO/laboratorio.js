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
// (tolerante a zona horaria)
// =======================================================
const normalizarFecha = (fecha) => {
  if (!fecha) return '';

  const d = new Date(fecha);
  if (!isNaN(d)) {
    return d.toISOString().slice(0, 10);
  }

  const f = String(fecha).trim();

  if (f.includes('/')) {
    const [d, m, y] = f.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return f;
};

// =======================================================
// 🔐 PRODUCCIÓN — Descarga PDF laboratorio
// =======================================================
async function DescargarLaboratorio(req, res) {
  try {
    const source = req.method === 'GET' ? req.query : req.body;

    const {
      institucionId,
      idUser,
      numeroAdmicion,
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
        paso: 'VALIDACION_NUMERICA'
      });
    }

    // ================= 1) BUSCAR PACIENTE =================
    const numeroAdmisionBuscada = String(numeroAdmicion).trim();

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
    const errores = [];

    if (String(tipoDocBD).toUpperCase() !== String(tipoDocumento).toUpperCase()) {
      errores.push('tipoDocumento');
    }

    if (String(numeroDocBD) !== String(numeroDocumento)) {
      errores.push('numeroDocumento');
    }

    if (
      normalizarFecha(fechaNacBD) !==
      normalizarFecha(fechaNacimiento)
    ) {
      errores.push('fechaNacimiento');
    }

    if (String(numeroAdmision) !== String(numeroAdmisionBuscada)) {
      errores.push('numeroAdmision');
    }

    if (errores.length) {
      return res.status(401).json({
        success: false,
        paso: 'VALIDACION_SEGURIDAD',
        errores
      });
    }

    // ================= 3) TOKEN =================
    const token = createToken(
      'ListadoInformesResultadosLaboratorio',
      instId,
      83,
      userId
    );

    // ================= 4) URL REPORTE =================
    const params = new URLSearchParams({
      modulo: 'Laboratorio',
      reporte: 'ListadoInformesResultadosLaboratorio',
      render: 'pdf',
      hideTool: 'true',
      environment: '1',
      userId: String(userId),
      idAdmision: String(idAdmision),
      token
    });

    const url = `https://reportes.saludplus.co/view.aspx?${params.toString()}`;

    // ================= 5) DESCARGAR PDF =================
    const response = await axios.get(url, {
      responseType: 'stream',
      validateStatus: () => true
    });

    if (!response.headers['content-type']?.includes('pdf')) {
      return res.status(502).json({
        success: false,
        paso: 'REPORTE_NO_PDF'
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="laboratorio_${idAdmision}.pdf"`
    );

    response.data.pipe(res);

  } catch (error) {
    return res.status(500).json({
      success: false,
      paso: 'EXCEPCION_GENERAL',
      message: error.message
    });
  }
}

// =======================================================
// 🧪 TEST — Debug sin romper producción
// =======================================================
async function DescargarLaboratorioTest(req, res) {
  try {
    const { numeroAdmicion, tipoDocumento, numeroDocumento, fechaNacimiento } = req.body;

    const numeroAdmisionBuscada = String(numeroAdmicion).trim();
    const paciente = await ejecutarBuscarPaciente(numeroAdmisionBuscada);

    if (!paciente || !paciente.isSuccessful) {
      return res.status(404).json({ success: false });
    }

    return res.json({
      success: true,
      request: {
        numeroAdmicion,
        tipoDocumento,
        numeroDocumento,
        fechaNacimiento,
        fechaNacimiento_normalizada: normalizarFecha(fechaNacimiento)
      },
      bd: {
        tipoDocumento: paciente.tipoDocumento,
        numeroDocumento: paciente.documento,
        fechaNacimiento: paciente.fechaNacimiento,
        fechaNacimiento_normalizada: normalizarFecha(paciente.fechaNacimiento)
      }
    });

  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

module.exports = {
  DescargarLaboratorio,
  DescargarLaboratorioTest
};
