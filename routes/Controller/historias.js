// Archivo: routes/tuRuta.js

const { createToken } = require('./Base/toke');
const { ConsultaId } = require('./Base/consultaid'); 

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
  Anexo: 'ANX',               // Agregado para completar
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

  let numeroFactura = ids?.numeroFactura || '0';
  if (Array.isArray(ids?.facturasDetalle) && idAdmision) {
    const match = ids.facturasDetalle.find(
      f => String(f.id_admision || f.admisionId || ids.id_admision) === String(idAdmision)
    );
    if (match && (match.numero_factura || match.numeroFactura)) {
      numeroFactura = String(match.numero_factura || match.numeroFactura);
    }
  }

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
 * SIN importar qué EPS llegue como parámetro
 */
function generarNombreArchivo(tipoDocumento, ctx, options = {}) {
  const { nit } = ctx;
  const factura = options.facturaPorDoc || ctx.factura || '0';
  
  // Determinar el número para renombrar (con o sin identificación)
  const numeroParaRenombrar = options.esCapita ? 
    `${factura}_${ctx.tipoId}${ctx.numId}` : 
    factura;

  // Obtener el prefijo fijo según el tipo de documento
  const prefijo = PREFIJOS_RENOMBRES[tipoDocumento];
  
  // Si no hay prefijo definido, usar el tipoDocumento como prefijo
  if (!prefijo) {
    return `${tipoDocumento}_${nit}_${numeroParaRenombrar}.pdf`;
  }

  // Formato estándar: PREFIJO_NIT_NUMERO.pdf
  return `${prefijo}_${nit}_${numeroParaRenombrar}.pdf`;
}

/* =========================
 *  Obtener IDs usando ConsultaId
 * ========================= */
async function obtenerIdsConConsultaId({ clave, institucionId, token }) {
  try {
    // Validación estricta: Token debe venir por body
    if (!token) {
      console.error('❌ Token no proporcionado en body');
      return null;
    }

    // Crear un objeto request que coincida exactamente con lo que ConsultaId espera
    const mockReq = {
      body: {
        sSearch: clave,
        idInstitucion: Number(institucionId),
        include: [
          'admision',
          'egreso',
          'evolucion',
          'notasEnfermeria',
          'ordenesMedicas',
          'historias',
          'facturas',
          'idanexo'
        ],
        tokenAnexo: token.replace(/^Bearer\s+/i, '')
      },
      query: {
        sSearch: clave,
        idInstitucion: Number(institucionId)
      },
      headers: {}
    };

    // Variable para capturar la respuesta
    let responseData = null;
    let statusCode = 200;

    // Crear mock response
    const mockRes = {
      json: function(data) {
        responseData = data;
        return this;
      },
      status: function(code) {
        statusCode = code;
        return this;
      },
      send: function(data) {
        if (typeof data === 'string') {
          try {
            responseData = JSON.parse(data);
          } catch {
            responseData = { message: data };
          }
        } else {
          responseData = data;
        }
        return this;
      },
      statusCode: 200
    };

    // Llamar a ConsultaId como middleware
    await ConsultaId(mockReq, mockRes);

    // Verificar respuesta
    if (!responseData?.ok) {
      console.error('Error en ConsultaId:', responseData);
      return null;
    }

    console.log('✅ Respuesta de ConsultaId:', {
      ok: responseData.ok,
      numeroBusqueda: responseData.numeroBusqueda,
      ids: responseData.resultados?.ids
    });

    const ids = responseData.resultados?.ids || {};
    
    const transformIds = {
      // ID individuales
      id_admision: ids.admision?.[0] || null,
      id_egreso: ids.egreso?.[0] || null,
      id_factura: ids.factura?.[0] || null,
      
      // Arrays de IDs
      idsAdmisiones: ids.admision || [],
      idEgresos: ids.egreso || [],
      idsEvoluciones: ids.evolucion || [],
      idsNotasEnfermeria: ids.notasEnfermeria || [],
      idsOrdenMedicas: ids.ordenesMedicas || [],
      idsHistorias: ids.historiasClinicas || [],
      idAnexosDos: ids.idanexo || [],
      
      // Información de búsqueda
      numeroFactura: responseData.numeroBusqueda || clave,
      
      // Información del paciente
      tipoDocumento: 'CC',
      numero_documento: clave,
      
      // Totales
      totales: responseData.resultados?.totales || {
        notasEnfermeria: ids.notasEnfermeria?.length || 0,
        ordenesMedicas: ids.ordenesMedicas?.length || 0,
        historiasClinicas: ids.historiasClinicas?.length || 0,
      },
      
      // Información adicional
      modalidad: '',
      regimen: '',
      
      // Datos de facturación
      facturasDetalle: ids.factura ? ids.factura.map(id => ({
        id_factura: id,
        numero_factura: responseData.numeroBusqueda || clave,
        id_admision: ids.admision?.[0] || null
      })) : []
    };

    console.log('🔄 IDs transformados:', {
      id_admision: transformIds.id_admision,
      idsHistorias: transformIds.idsHistorias,
      idsNotasEnfermeria: transformIds.idsNotasEnfermeria,
      idsOrdenMedicas: transformIds.idsOrdenMedicas
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
    // Validación explícita y exclusiva del token en body
    const { token } = req.body;
    
    if (!token || typeof token !== 'string' || token.trim() === '') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token de autorización requerido EXCLUSIVAMENTE en body' 
      });
    }

    const {
      clave,
      numeroFactura,
      numeroAdmision,
      idAdmision: idAdmisionRaw,
      institucionId,
      idUser,
      eps,      // Se recibe pero NO se usa para nombres de archivo
      tipos,
      docs,
      tipo,
      modalidad,
    } = req.query;

    // Validaciones mínimas
    const missing = [];
    if (!institucionId) missing.push('institucionId');
    if (!idUser) missing.push('idUser');

    const anyKey = clave ?? numeroFactura ?? numeroAdmision ?? idAdmisionRaw;
    if (!anyKey) missing.push('clave|numeroFactura|numeroAdmision|idAdmision');

    if (missing.length) {
      return res.status(400).send(`❌ Faltan parámetros: ${missing.join(', ')}`);
    }

    // Filtro de tipos
    const tiposRaw = tipos ?? docs ?? tipo;
    const reportesSeleccionados = parseTiposParam(tiposRaw);

    // Resolver IDs usando ConsultaId
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

    // Admision resuelta
    const resolvedAdmisionId = (
      Number(ids?.id_admision) ||
      Number(idAdmisionRaw) ||
      Number(numeroAdmision) ||
      (Number.isFinite(Number(claveFinal)) ? Number(claveFinal) : 0)
    );

    // Contexto de renombramiento con NIT correcto
    const ctx = construirContextoRenombramiento(ids, {
      idAdmision: resolvedAdmisionId,
      institucionId,
    });

    // Normalizar colecciones
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
    };

    // Construir items
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
        
        // Generar nombre de archivo usando SIEMPRE los prefijos fijos
        // El parámetro eps se recibe pero NO se usa
        const nombreArchivoFinal = generarNombreArchivo(
          nombre,
          ctx,
          { id, facturaPorDoc, esCapita: es_capita }
        );

        trabajos.push({
          numeroAdmision: String(numeroAdmision ?? idAdmisionRaw ?? resolvedAdmisionId),
          numeroFactura: String(numeroFactura ?? ctx.factura ?? '0'),
          nombreArchivo: nombre,  // Nombre del tipo de documento
          url: `https://reportes.saludplus.co/view.aspx?${urlParams.toString()}`,
          nombrepdf: nombreArchivoFinal,
        });
      }
    }

    if (!trabajos.length) {
      return res.status(404).json({ success: false, message: 'No se encontraron documentos' });
    }

    // Agrupar resultados
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