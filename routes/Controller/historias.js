// Archivo: routes/tuRuta.js

const { createToken } = require('./Base/toke');
const { ConsultaIdIntermedio } = require('./Base/ids/ConsultaIdIntermedio');

// Importar datos de instituciones
const { instituciones } = require('./Base/Instituciones');

/* =========================
 *  Mapeos y constantes - PREFIJOS FIJOS para TODAS las EPS
 * ========================= */
const PREFIJOS_RENOMBRES = {
  Epicrisis: 'EPI',
  HojaMedicamentos: 'HAM',
  HistoriaClinica: 'HAU',
  Evoluciones: 'HEV',
  OrdenesMedicas: 'CRC',      // Fijo CRC para todas
  HojaAdmision: 'HAD',
  Prefactura: 'PRE',
  NotasEnfermeria: 'NOT',
  HojaInsumos: 'INS',
  HistoriaClinicaAuditoria: 'HAU',
  FacturaElectronica: 'FEV',
  Anexo: 'ANX',
};

const FECHA_FIJA_REPORTS = new Set([
  'ListadoAsistencialHojaAdministracionProcedimientos',
  'ListadoAsistencialHojaAdministracionMedicamentos',
  'ListadoAsistencialHojaGastos',
  'ListadoHistoriasAsistencialesDestallado',
]);

const reportMapping = [
  { param: 'idsHistorias',       report: 'ListadoHistoriasClinicasDetallado3',                 nombre: 'HistoriaClinica' },
  { param: 'idAnexosDos',        report: 'ListadoanexoDosDetallado',                           nombre: 'Anexo' },
  { param: 'idEgresos',          report: 'ListadoEpicrisis',                                   nombre: 'Epicrisis' },
  { param: 'idsEvoluciones',     report: 'ListadoEvolucionDestallado',                         nombre: 'Evoluciones' },
  { param: 'idsNotasEnfermeria', report: 'ListadoNotasEnfermeriaDestallado',                   nombre: 'NotasEnfermeria' },
  { param: 'idsAdmisiones',      report: 'ListadoAdmisionesDetallado',                         nombre: 'HojaAdmision' },
  { param: 'idAdmisiones',       report: 'ListadoPrefacturasDetallado',                        nombre: 'Prefactura' },
  { param: 'idsOrdenMedicas',    report: 'ListadoOrdenMedicasDestallado',                      nombre: 'OrdenesMedicas' },
  { param: 'idsHistorias',       report: 'ListadoAsistencialHojaAdministracionProcedimientos', nombre: 'HojaProcedimientos' },
  { param: 'idsHistorias',       report: 'ListadoAsistencialHojaAdministracionMedicamentos',   nombre: 'HojaMedicamentos' },
  { param: 'idsHistorias',       report: 'ListadoAsistencialHojaGastos',                       nombre: 'HojaInsumos' },
  { param: 'idHistorias',        report: 'ListadoHistoriasAsistencialesDestallado',            nombre: 'HistoriaClinicaAuditoria' },
  // ✅ CORREGIDO: FacturaElectronica usa el idFactura real
  { param: 'idFacturas',         report: 'ListadoFacturasDetallado',                           nombre: 'FacturaElectronica' },
];

const CODE_TO_REPORTS = {
  HAU:  ['ListadoHistoriasClinicasDetallado3', 'ListadoHistoriasAsistencialesDestallado'],
  HEV:  ['ListadoEvolucionDestallado'],
  EPI:  ['ListadoEpicrisis'],
  NOT:  ['ListadoNotasEnfermeriaDestallado'],
  HAM:  ['ListadoAsistencialHojaAdministracionMedicamentos'],
  PDX:  ['ListadoAsistencialHojaAdministracionProcedimientos'],
  OPF:  ['ListadoOrdenMedicasDestallado'],
  HAD:  ['ListadoAdmisionesDetallado'],
  DFV:  ['ListadoPrefacturasDetallado'],
  INS:  ['ListadoAsistencialHojaGastos'],
  ANX:  ['ListadoanexoDosDetallado'],
  CRC:  ['ListadoOrdenMedicasDestallado'],
  PREF: ['ListadoPrefacturasDetallado'],
  FEV:  ['ListadoFacturasDetallado'],
  TODO: ['*'],
};

/* =========================
 *  Helpers
 * ========================= */
function getModulo(reportName) {
  const moduloMapping = {
    ListadoHistoriasClinicasDetallado3: 'HistoriasClinicas',
    ListadoanexoDosDetallado: 'Facturacion',
    ListadoEpicrisis: 'Asistencial',
    ListadoEvolucionDestallado: 'Asistencial',
    ListadoNotasEnfermeriaDestallado: 'Asistencial',
    ListadoAdmisionesDetallado: 'Facturacion',
    ListadoPrefacturasDetallado: 'Facturacion',
    ListadoOrdenMedicasDestallado: 'Asistencial',
    ListadoAsistencialHojaAdministracionProcedimientos: 'Asistencial',
    ListadoAsistencialHojaAdministracionMedicamentos: 'Asistencial',
    ListadoAsistencialHojaGastos: 'Asistencial',
    ListadoHistoriasAsistencialesDestallado: 'Asistencial',
    ListadoFacturasDetallado: 'Facturacion',
  };
  return moduloMapping[reportName] || 'Asistencial';
}

function formatDateDDMMYYYY(date) {
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function parseTiposParam(raw) {
  if (!raw) return new Set(['*']);
  const parts = String(raw)
    .split(/[,\s|]+/)
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);
  if (parts.includes('TODO')) return new Set(['*']);
  const reports = new Set();
  for (const code of parts) {
    const list = CODE_TO_REPORTS[code];
    if (Array.isArray(list)) list.forEach(r => reports.add(r));
  }
  if (reports.size === 0) reports.add('*');
  return reports;
}

function toArray(v) { return v == null ? [] : (Array.isArray(v) ? v : [v]); }

function obtenerNitInstitucion(institucionId) {
  if (!institucionId) return 'NITDESCONOCIDO';
  
  const institucion = instituciones.find(
    inst => inst.idInstitucion === Number(institucionId)
  );
  
  return institucion?.nit || 'NITDESCONOCIDO';
}

function construirContextoRenombramiento(ids, { idAdmision, institucionId }) {
  const nit = obtenerNitInstitucion(institucionId);
  const tipoId = (ids?.tipoDocumento || 'CC').toString().toUpperCase();
  const numId = (ids?.numero_documento || '0000000000').toString();

  // Usar el número de factura real si existe
  let numeroFactura = ids?.numeroFactura || '0';

  return {
    nit: String(nit),
    tipoId,
    numId,
    factura: String(numeroFactura),
    institucionId: Number(institucionId) || 0,
    idAdmision: Number(idAdmision) || 0,
  };
}

function resolverFacturaParaDocumento(ids, tipoDocumento, id, facturaFallback) {
  const porDoc = ids?.facturasPorDocumento;
  if (porDoc && porDoc[tipoDocumento] && porDoc[tipoDocumento][id]) {
    return String(porDoc[tipoDocumento][id]);
  }
  return String(facturaFallback || ids?.numeroFactura || '0');
}

function esCapita({ modalidad, ids }) {
  if (modalidad) {
    const m = String(modalidad).toLowerCase();
    if (m === 'capita' || m === 'cápita') return true;
    if (m === 'evento') return false;
    return false;
  }
  const cand = [
    ids?.modalidad,
    ids?.regimen,
    ids?.tipo_contrato,
    ids?.tipoContrato,
    ids?.modalidad_atencion,
    ids?.modalidadAtencion,
  ]
  .filter(Boolean)
  .map(v => String(v).toLowerCase());

  return cand.some(v => v.includes('cápita') || v.includes('capita') || v.includes('cap'));
}

/**
 * Genera nombre de archivo usando SIEMPRE los prefijos fijos
 * El número para renombrar es el numeroFactura (como en la lógica original)
 */
function generarNombreArchivo(tipoDocumento, ctx, options = {}) {
  const { nit } = ctx;
  // Siempre usar numeroFactura como base para el nombre
  const numeroParaRenombrar = ctx.factura || '0';

  // Obtener el prefijo fijo según el tipo de documento
  const prefijo = PREFIJOS_RENOMBRES[tipoDocumento];
  
  // Si no hay prefijo definido, usar el tipoDocumento como prefijo
  if (!prefijo) {
    return `${tipoDocumento}_${nit}_${numeroParaRenombrar}.pdf`;
  }

  // Formato estándar: PREFIJO_NIT_NUMERO_FACTURA.pdf
  return `${prefijo}_${nit}_${numeroParaRenombrar}.pdf`;
}

/* =========================
 *  Obtener IDs usando ConsultaIdIntermedio
 * ========================= */
async function obtenerIdsConConsultaId({ clave, institucionId, token }) {
  try {
    const mockReq = {
      body: { documento: clave }
    };
    
    let resultadoIntermedio = null;
    
    await new Promise((resolve, reject) => {
      const mockRes = {
        status: (code) => ({
          json: (data) => {
            resultadoIntermedio = data;
            resolve(data);
          }
        })
      };
      
      ConsultaIdIntermedio(mockReq, mockRes).catch(reject);
    });
    
    if (!resultadoIntermedio || !resultadoIntermedio.ok) {
      console.error('Error en ConsultaIdIntermedio:', resultadoIntermedio?.message || 'No se encontraron resultados');
      return null;
    }

    console.log('✅ Respuesta de ConsultaIdIntermedio:', {
      idAdmision: resultadoIntermedio.idAdmision,
      idHistoria: resultadoIntermedio.idHistoria,
      idOrden: resultadoIntermedio.idOrden,
      idEvolucion: resultadoIntermedio.idEvolucion,
      idNotas: resultadoIntermedio.idNotas?.length || 0,
      idFactura: resultadoIntermedio.idFactura,
      numeroFactura: resultadoIntermedio.numeroFactura
    });

    // TRANSFORMAR al formato esperado por el resto del código
    const transformIds = {
      // ID individuales
      id_admision: resultadoIntermedio.idAdmision || null,
      id_egreso: resultadoIntermedio.idEgresos?.[0] || null,
      
      // Arrays de IDs
      idsAdmisiones: resultadoIntermedio.idAdmision ? [resultadoIntermedio.idAdmision] : [],
      idEgresos: resultadoIntermedio.idEgresos || [],
      idsEvoluciones: resultadoIntermedio.idEvolucion ? [resultadoIntermedio.idEvolucion] : [],
      idsNotasEnfermeria: resultadoIntermedio.idNotas || [],
      idsOrdenMedicas: resultadoIntermedio.idOrden ? [resultadoIntermedio.idOrden] : [],
      idsHistorias: resultadoIntermedio.idHistoria ? [resultadoIntermedio.idHistoria] : [],
      idAnexosDos: resultadoIntermedio.idAnexosDos || [],
      // ✅ CORREGIDO: Para facturas, usar el idFactura REAL
      idFacturas: resultadoIntermedio.idFactura ? [resultadoIntermedio.idFactura] : [],
      
      // Información de búsqueda
      numeroFactura: resultadoIntermedio.numeroFactura || clave,
      
      // Información del paciente
      tipoDocumento: 'CC',
      numero_documento: clave,
      
      // Totales
      totales: {
        notasEnfermeria: (resultadoIntermedio.idNotas || []).length,
        ordenesMedicas: resultadoIntermedio.idOrden ? 1 : 0,
        historiasClinicas: resultadoIntermedio.idHistoria ? 1 : 0,
        facturas: resultadoIntermedio.idFactura ? 1 : 0,
      },
      
      // Información adicional
      modalidad: '',
      regimen: '',
      
      // Datos de facturación
      facturasDetalle: [],
      facturasPorDocumento: {}
    };

    console.log('🔄 IDs transformados:', {
      id_admision: transformIds.id_admision,
      idsHistorias: transformIds.idsHistorias,
      idsNotasEnfermeria: transformIds.idsNotasEnfermeria,
      idsOrdenMedicas: transformIds.idsOrdenMedicas,
      idFacturas: transformIds.idFacturas,
      numeroFactura: transformIds.numeroFactura
    });

    return transformIds;

  } catch (error) {
    console.error('Error en obtenerIdsConConsultaId:', error);
    return null;
  }
}

async function obtenerIdsPorAdmision({ institucionId, idAdmision, token }) {
  return await obtenerIdsConConsultaId({
    clave: idAdmision.toString(),
    institucionId,
    token
  });
}

/* =========================
 *  Controller principal
 * ========================= */
async function Hs_Anx(req, res) {
  try {
    const {
      clave,
      numeroFactura,
      numeroAdmision,
      idAdmision: idAdmisionRaw,
      institucionId,
      idUser,
      eps,
      tipos,
      docs,
      tipo,
      modalidad,
      token,
    } = req.query;

    const missing = [];
    if (!institucionId) missing.push('institucionId');
    if (!idUser) missing.push('idUser');

    const anyKey = clave ?? numeroFactura ?? numeroAdmision ?? idAdmisionRaw;
    if (!anyKey) missing.push('clave|numeroFactura|numeroAdmision|idAdmision');

    if (missing.length) {
      return res.status(400).send(`❌ Faltan parámetros: ${missing.join(', ')}`);
    }

    const tiposRaw = tipos ?? docs ?? tipo;
    const reportesSeleccionados = parseTiposParam(tiposRaw);

    const claveFinal = String(anyKey);
    let ids;
    
    if (idAdmisionRaw && !numeroFactura && !clave && !numeroAdmision) {
      ids = await obtenerIdsPorAdmision({
        institucionId: Number(institucionId),
        idAdmision: Number(idAdmisionRaw),
        token
      });
    } else {
      ids = await obtenerIdsConConsultaId({
        clave: claveFinal,
        institucionId: Number(institucionId),
        token
      });
    }

    if (!ids) {
      return res.status(404).json({ 
        success: false, 
        message: 'No se pudieron obtener los IDs para la consulta' 
      });
    }

    const resolvedAdmisionId = (
      Number(ids?.id_admision) ||
      Number(idAdmisionRaw) ||
      Number(numeroAdmision) ||
      (Number.isFinite(Number(claveFinal)) ? Number(claveFinal) : 0)
    );

    const ctx = construirContextoRenombramiento(ids, {
      idAdmision: resolvedAdmisionId,
      institucionId,
    });

    // ✅ CORREGIDO: Normalizar colecciones - idFacturas ahora usa el ID real
    const normalized = {
      idsHistorias:       toArray(ids.idsHistorias || ids.id_historia),
      idAnexosDos:        toArray(ids.idAnexosDos || ids.anexo2),
      idEgresos:          toArray(ids.idEgresos || ids.id_egreso),
      idsEvoluciones:     toArray(ids.idsEvoluciones || ids.evoluciones),
      idsNotasEnfermeria: toArray(ids.idsNotasEnfermeria || ids.notas_enfermeria),
      idsAdmisiones:      toArray(ids.idsAdmisiones || ids.id_admision || resolvedAdmisionId),
      idAdmisiones:       toArray(resolvedAdmisionId),
      idsOrdenMedicas:    toArray(ids.idsOrdenMedicas || ids.ordenes_medicas),
      idHistorias:        toArray(ids.idHistorias || ids.id_historia),
      idFacturas:         toArray(ids.idFacturas), // ✅ Ahora usa el idFactura real
    };

    const trabajos = [];
    const FECHA_INICIAL_FIJA = '01/01/2023';
    const FECHA_FINAL_HOY = formatDateDDMMYYYY(new Date());

    const es_capita = esCapita({ modalidad, ids });

    for (const { param, report, nombre } of reportMapping) {
      if (!(reportesSeleccionados.has('*') || reportesSeleccionados.has(report))) continue;

      const lista = normalized[param];
      if (!lista || !lista.length) continue;

      const modulo = getModulo(report);

      for (const id of lista) {
        const tokenReporte = createToken(report, Number(institucionId), 83, Number(idUser));

        const urlParams = new URLSearchParams({
          modulo,
          reporte: report,
          render: 'pdf',
          hideTool: 'true',
          environment: '1',
          userId: String(idUser),
          [param]: String(id),
          token: tokenReporte,
        });

        if (FECHA_FIJA_REPORTS.has(report)) {
          urlParams.set('fechaInicial', FECHA_INICIAL_FIJA);
          urlParams.set('fechaFinal', FECHA_FINAL_HOY);
        }

        if (report === 'ListadoHistoriasAsistencialesDestallado') {
          urlParams.set('auditoria', '1');
        }

        const facturaPorDoc = resolverFacturaParaDocumento(ids, nombre, String(id), ctx.factura);
        
        const nombreArchivoFinal = generarNombreArchivo(
          nombre,
          ctx,
          { id, facturaPorDoc, esCapita: es_capita }
        );

        trabajos.push({
          numeroAdmision: String(numeroAdmision ?? idAdmisionRaw ?? resolvedAdmisionId),
          numeroFactura: String(numeroFactura ?? ctx.factura ?? '0'),
          nombreArchivo: nombre,
          url: `https://reportes.saludplus.co/view.aspx?${urlParams.toString()}`,
          nombrepdf: nombreArchivoFinal,
        });
      }
    }

    if (!trabajos.length) {
      return res.status(404).json({ success: false, message: 'No se encontraron documentos' });
    }

    const agruparPorFactura = Boolean(numeroFactura) && String(numeroFactura) !== '0';

    const resultadoFinal = {};
    for (const t of trabajos) {
      const key = agruparPorFactura
        ? `factura-${t.numeroFactura}`
        : `admision-${t.numeroAdmision}`;

      if (!resultadoFinal[key]) {
        resultadoFinal[key] = [];
      }
      resultadoFinal[key].push({
        nombreArchivo: t.nombreArchivo,
        url: t.url,
        nombrepdf: t.nombrepdf,
      });
    }

    return res.json(resultadoFinal);

  } catch (error) {
    console.error('🔥 Error en Hs_Anx:', error);
    res.status(500).json({
      error: '❌ Error interno del servidor',
      detalle: error.message,
    });
  }
}

module.exports = { Hs_Anx };