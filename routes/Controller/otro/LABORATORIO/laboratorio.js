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
// 🛠️ HELPER CORREGIDO: Normalización manual de fecha
// =======================================================
const normalizarFecha = (fecha) => {
  if (!fecha) return '';

  let f = String(fecha).trim();

  // 1. Si el formato es DD/MM/YYYY (común en tu entrada)
  if (f.includes('/')) {
    const partes = f.split('/');
    if (partes.length === 3) {
      const [d, m, y] = partes;
      // Forzamos el formato ISO manual: YYYY-MM-DD
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }

  // 2. Si ya viene como YYYY-MM-DD o similar (ISO)
  const d = new Date(fecha);
  if (!isNaN(d.getTime())) {
    // Usamos el split de 'T' para evitar problemas de desfase por zona horaria (UTC)
    return d.toISOString().split('T')[0];
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

    // VALIDACIONES BÁSICAS
    const faltantes = [];
    if (!institucionId) faltantes.push('institucionId');
    if (!idUser) faltantes.push('idUser');
    if (!numeroAdmicion) faltantes.push('numeroAdmicion');
    if (!tipoDocumento) faltantes.push('tipoDocumento');
    if (!numeroDocumento) faltantes.push('numeroDocumento');
    if (!fechaNacimiento) faltantes.push('fechaNacimiento');

    if (faltantes.length) {
      return res.status(400).json({ success: false, paso: 'VALIDACION_PARAMETROS', faltantes });
    }

    const instId = Number(institucionId);
    const userId = Number(idUser);

    // 1) BUSCAR PACIENTE
    const numeroAdmisionBuscada = String(numeroAdmicion).trim();
    let paciente;
    try {
      paciente = await ejecutarBuscarPaciente(numeroAdmisionBuscada);
    } catch (e) {
      return res.status(500).json({ success: false, paso: 'BUSCAR_PACIENTE', error: e });
    }

    if (!paciente || !paciente.isSuccessful) {
      return res.status(404).json({ success: false, paso: 'PACIENTE_NO_ENCONTRADO' });
    }

    // 2) VALIDACIÓN DE SEGURIDAD (Blindada)
    const errores = [];

    // Normalización de strings para evitar fallos por espacios o mayúsculas
    if (String(paciente.tipoDocumento).trim().toUpperCase() !== String(tipoDocumento).trim().toUpperCase()) {
      errores.push('tipoDocumento');
    }

    if (String(paciente.documento).trim() !== String(numeroDocumento).trim()) {
      errores.push('numeroDocumento');
    }

    // COMPARACIÓN CRÍTICA DE FECHAS
    const fechaEntrada = normalizarFecha(fechaNacimiento);
    const fechaBaseDatos = normalizarFecha(paciente.fechaNacimiento);

    if (fechaEntrada !== fechaBaseDatos) {
      errores.push('fechaNacimiento');
    }

    if (errores.length) {
      return res.status(401).json({
        success: false,
        paso: 'VALIDACION_SEGURIDAD',
        errores,
        info: {
          recibido: fechaEntrada,
          esperado: fechaBaseDatos
        }
      });
    }

    // 3) GENERACIÓN DE TOKEN Y URL
    const token = createToken('ListadoInformesResultadosLaboratorio', instId, 83, userId);

    const params = new URLSearchParams({
      modulo: 'Laboratorio',
      reporte: 'ListadoInformesResultadosLaboratorio',
      render: 'pdf',
      hideTool: 'true',
      environment: '1',
      userId: String(userId),
      idAdmision: String(paciente.idAdmision),
      token
    });

    const url = `https://reportes.saludplus.co/view.aspx?${params.toString()}`;

    // 4) DESCARGA Y PIPE
    const response = await axios.get(url, {
      responseType: 'stream',
      validateStatus: () => true,
      timeout: 30000 // 30 segundos por si el reporte es pesado
    });

    if (!response.headers['content-type']?.includes('pdf')) {
      return res.status(502).json({ success: false, paso: 'REPORTE_NO_PDF' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="laboratorio_${paciente.idAdmision}.pdf"`);

    response.data.pipe(res);

  } catch (error) {
    return res.status(500).json({ success: false, paso: 'EXCEPCION_GENERAL', message: error.message });
  }
}

// =======================================================
// 🧪 TEST — Debug
// =======================================================
async function DescargarLaboratorioTest(req, res) {
  try {
    const { numeroAdmicion, fechaNacimiento } = req.body;
    const paciente = await ejecutarBuscarPaciente(String(numeroAdmicion).trim());

    if (!paciente || !paciente.isSuccessful) return res.status(404).json({ success: false });

    return res.json({
      success: true,
      comparacion: {
        enviada: normalizarFecha(fechaNacimiento),
        bd: normalizarFecha(paciente.fechaNacimiento),
        match: normalizarFecha(fechaNacimiento) === normalizarFecha(paciente.fechaNacimiento)
      }
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

module.exports = { DescargarLaboratorio, DescargarLaboratorioTest };