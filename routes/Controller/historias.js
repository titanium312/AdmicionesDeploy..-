// Archivo: routes/tuRuta.js

const { createToken } = require('./Base/toke');
const { ConsultaId } = require('./Base/consultaid'); 

// Importar datos de instituciones
const { instituciones } = require('./Base/Instituciones');

/* =========================
 *  Mapeos y constantes
 * ========================= */
const PREFIJOS_NUEVA_EPS = {
  factura_electronica: 'FEV',
  factura: 'FAT',
  detalle_factura: 'DFV',
  prefacturas: 'DFV',
  nota_credito_debito: 'NDC',
  formato_ami: 'AMI',
  lista_precios: 'LDP',
  comprobante_recibo_usuario: 'CRC',
  historia: 'HAU',
  evolucion: 'HEV',
  epicrisis: 'EPI',
  enfermeria: 'HAM',
  hoja_medicamentos: 'HAM',
  hoja_procedimientos: 'PDX',
  descripcion_quirurgica: 'DQX',
  registro_anestesia: 'RAN',
  ordenmedica: 'OPF',
  traslado_asistencial: 'TAP',
  transporte_no_asistencial: 'TNA',
  acta_junta_nutricion: 'JNM',
  consentimiento_nutricion: 'CNM',
  factura_material_osteosintesis: 'FMO',
  anexo: 'ANX',
  admisiones: 'ADM',
  hoja_gastos: 'LDP',
  historia_asistencial: 'HEV',
};

const CODIGOS_SALUD_TOTAL = {
  factura: 'prefacura',
  anexo: 'anexoDos',
  historia: 'historia',
  enfermeria: 'enfermeria',
  epicrisis: 'epicrisis',
  evolucion: 'evolucion',
  ordenmedica: 'ordenMedica',
  admisiones: 'admisiones',
  prefacturas: 'prefacturas',
  hoja_procedimientos: 'hojaProcedimientos',
  hoja_medicamentos: 'hojaMedicamentos',
  hoja_gastos: 'hojaGastos',
  historia_asistencial: 'historiaAsistencial',
};

const FECHA_FIJA_REPORTS = new Set([
  'ListadoAsistencialHojaAdministracionProcedimientos',
  'ListadoAsistencialHojaAdministracionMedicamentos',
  'ListadoAsistencialHojaGastos',
  'ListadoHistoriasAsistencialesDestallado',
]);

const reportMapping = [
  { param: 'idsHistorias',       report: 'ListadoHistoriasClinicasDetallado3',                 nombre: 'historia' },
  { param: 'idAnexosDos',        report: 'ListadoanexoDosDetallado',                           nombre: 'anexo' },
  { param: 'idEgresos',          report: 'ListadoEpicrisis',                                   nombre: 'epicrisis' },
  { param: 'idsEvoluciones',     report: 'ListadoEvolucionDestallado',                         nombre: 'evolucion' },
  { param: 'idsNotasEnfermeria', report: 'ListadoNotasEnfermeriaDestallado',                   nombre: 'enfermeria' },
  { param: 'idsAdmisiones',      report: 'ListadoAdmisionesDetallado',                         nombre: 'admisiones' },
  { param: 'idAdmisiones',       report: 'ListadoPrefacturasDetallado',                        nombre: 'prefacturas' },
  { param: 'idsOrdenMedicas',    report: 'ListadoOrdenMedicasDestallado',                      nombre: 'ordenmedica' },
  { param: 'idsHistorias',       report: 'ListadoAsistencialHojaAdministracionProcedimientos', nombre: 'hoja_procedimientos' },
  { param: 'idsHistorias',       report: 'ListadoAsistencialHojaAdministracionMedicamentos',   nombre: 'hoja_medicamentos' },
  { param: 'idsHistorias',       report: 'ListadoAsistencialHojaGastos',                       nombre: 'hoja_gastos' },
  { param: 'idHistorias',        report: 'ListadoHistoriasAsistencialesDestallado',            nombre: 'historia_asistencial' },
];

const CODE_TO_REPORTS = {
  HAU:  ['ListadoHistoriasClinicasDetallado3'],
  HEV:  ['ListadoEvolucionDestallado'],
  EPI:  ['ListadoEpicrisis'],
  HAM:  ['ListadoAsistencialHojaAdministracionMedicamentos'],
  PDX:  ['ListadoAsistencialHojaAdministracionProcedimientos'],
  OPF:  ['ListadoOrdenMedicasDestallado'],
  ADM:  ['ListadoAdmisionesDetallado'],
  DFV:  ['ListadoPrefacturasDetallado'],
  HAA:  ['ListadoHistoriasAsistencialesDestallado'],
  ANX:  ['ListadoanexoDosDetallado'],
  PREF: ['ListadoPrefacturasDetallado'],
  HAP:  ['ListadoAsistencialHojaAdministracionProcedimientos'],
  HMD:  ['ListadoAsistencialHojaAdministracionMedicamentos'],
  HGA:  ['ListadoAsistencialHojaGastos'],
  NDC:  ['*'],
  AMI:  ['*'],
  DQX:  ['*'],
  RAN:  ['*'],
  LDP:  ['*'],
  JNM:  ['*'],
  CNM:  ['*'],
  FAT:  ['*'],
  FMO:  ['*'],
  TAP:  ['*'],
  TNA:  ['*'],
  CRC:  ['*'],
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
    ListadoNotasEnfermeriaDestallado: 'Asistencial', // 🔴 AGREGAR ESTA LÍNEA
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

function obtenerNombrePorEPS(eps, nombreBase) {
  const nombresPorEPS = {
    NUEVA_EPS: {
      historia: 'HistoriaNuevaEPS',
      anexo: 'AnexoNuevaEPS',
      epicrisis: 'EpicrisisNuevaEPS',
      evolucion: 'EvolucionNuevaEPS',
      enfermeria: 'EnfermeriaNuevaEPS',
      admisiones: 'AdmisionesNuevaEPS',
      prefacturas: 'PrefacturasNuevaEPS',
      ordenmedica: 'OrdenMedicaNuevaEPS',
      hoja_procedimientos: 'HojaProcedimientosNuevaEPS',
      hoja_medicamentos: 'HojaMedicamentosNuevaEPS',
      hoja_gastos: 'HojaGastosNuevaEPS',
      historia_asistencial: 'HistoriaAsistencialNuevaEPS',
    },
    SALUD_TOTAL: {
      historia: 'HistoriaSaludTotal',
      anexo: 'AnexoSaludTotal',
      epicrisis: 'EpicrisisSaludTotal',
      evolucion: 'EvolucionSaludTotal',
      enfermeria: 'EnfermeriaSaludTotal',
      admisiones: 'AdmisionesSaludTotal',
      prefacturas: 'PrefacturasSaludTotal',
      ordenmedica: 'OrdenMedicaSaludTotal',
      hoja_procedimientos: 'HojaProcedimientosSaludTotal',
      hoja_medicamentos: 'HojaMedicamentosSaludTotal',
      hoja_gastos: 'HojaGastosSaludTotal',
      historia_asistencial: 'HistoriaAsistencialSaludTotal',
    },
  };
  const epsNombres = nombresPorEPS[eps] || {};
  return epsNombres[nombreBase.toLowerCase()] || nombreBase;
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

function generarNombreArchivo(eps, tipoDocumento, ctx, options = {}) {
  const { tipoId, numId, nit } = ctx;
  const factura = options.facturaPorDoc || ctx.factura || '0';

  if (eps === 'NUEVA_EPS') {
    const prefijo = PREFIJOS_NUEVA_EPS[tipoDocumento] || tipoDocumento.toUpperCase();

    if (options.esCapita) {
      return `${prefijo}_${nit}_FEH${factura}_${tipoId}${numId}.pdf`;
    }
    return `${prefijo}_${nit}_FEH${factura}.pdf`;
  }

  if (eps === 'SALUD_TOTAL') {
    const codigo = CODIGOS_SALUD_TOTAL[tipoDocumento] || 'soportes';
    return `${nit}_FEH_${factura}_${codigo}_1.pdf`;
  }

  const id = options.id != null ? String(options.id) : '';
  return `${tipoDocumento}-${id}.pdf`;
}

/* =========================
 *  Obtener IDs usando ConsultaId
 * ========================= */
/* =========================
 *  Obtener IDs usando ConsultaId - VERSIÓN CORREGIDA
 * ========================= */
async function obtenerIdsConConsultaId({ clave, institucionId, token }) {
  try {
    // 🔴 VALIDACIÓN ESTRICTA: Token debe venir por body
    if (!token) {
      console.error('❌ Token no proporcionado en body');
      return null;
    }

    // Crear un objeto request que coincida EXACTAMENTE con lo que ConsultaId espera
    const mockReq = {
      body: {
        sSearch: clave,
        idInstitucion: Number(institucionId), // 🔴 CRÍTICO: Esto faltaba
        include: [
          'admision',
          'egreso',
          'evolucion',
          'notas',
          'ordenes',
          'historias',
          'facturas',
          'idanexo'
        ],
        token: token.replace(/^Bearer\s+/i, '')
      },
      query: {
        sSearch: clave,
        idInstitucion: Number(institucionId) // También en query
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

    // 🔴 Llamar a ConsultaId como middleware
    // ConsultaId espera (req, res, next) - usamos solo req, res
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

    // 🔴 TRANSFORMACIÓN CORRECTA según la respuesta REAL de ConsultaId
    // Basado en el ejemplo que proporcionaste:
    // {
    //   "ok": true,
    //   "numeroBusqueda": "10542",
    //   "idInstitucion": 20,
    //   "institucion": "ESE HOSPITAL SAN JORGE AYAPEL",
    //   "fechaConsulta": "06/01/2026",
    //   "include": [...],
    //   "resultados": {
    //     "ids": {
    //       "admision": [],
    //       "egreso": [297161],
    //       "evolucion": [584321],
    //       "notasEnfermeria": [1000133, 1000002],
    //       "ordenesMedicas": [495618],
    //       "historiasClinicas": [1401147],
    //       "factura": [3688929],
    //       "idanexo": []
    //     },
    //     "totales": {...}
    //   }
    // }

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
      
      // Información del paciente (estos campos pueden venir de otra fuente)
      tipoDocumento: 'CC', // Por defecto
      numero_documento: clave, // Temporalmente usamos la clave
      
      // Totales
      totales: responseData.resultados?.totales || {
        notasEnfermeria: ids.notasEnfermeria?.length || 0,
        ordenesMedicas: ids.ordenesMedicas?.length || 0,
        historiasClinicas: ids.historiasClinicas?.length || 0,
      },
      
      // Información adicional (puede ser null si no está disponible)
      modalidad: '',
      regimen: '',
      
      // Datos de facturación
      facturasDetalle: ids.factura ? ids.factura.map(id => ({
        id_factura: id,
        numero_factura: responseData.numeroBusqueda || clave,
        // Si necesitas id_admision aquí, necesitas obtenerlo de otra fuente
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
 *  Controller principal MODIFICADO
 * ========================= */
async function Hs_Anx(req, res) {
  try {
    // 🔴 VALIDACIÓN EXPLÍCITA Y EXCLUSIVA DEL TOKEN EN BODY
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
      eps,
      tipos,
      docs,
      tipo,
      modalidad,
    } = req.query;

    // Validaciones mínimas
    const missing = [];
    if (!institucionId) missing.push('institucionId');
    if (!idUser) missing.push('idUser');
    if (!eps) missing.push('eps');

    const anyKey = clave ?? numeroFactura ?? numeroAdmision ?? idAdmisionRaw;
    if (!anyKey) missing.push('clave|numeroFactura|numeroAdmision|idAdmision');

    if (missing.length) {
      return res.status(400).send(`❌ Faltan parámetros: ${missing.join(', ')}`);
    }

    // Filtro de tipos
    const tiposRaw = tipos ?? docs ?? tipo;
    const reportesSeleccionados = parseTiposParam(tiposRaw);

    // === Resolver IDs USANDO CONSULTAID (token ahora viene de req.body) ===
    const claveFinal = String(anyKey);
    let ids;
    
    if (idAdmisionRaw && !numeroFactura && !clave && !numeroAdmision) {
      ids = await obtenerIdsPorAdmision({
        institucionId: Number(institucionId),
        idAdmision: Number(idAdmisionRaw),
        token // 🔴 Token del body
      });
    } else {
      ids = await obtenerIdsConConsultaId({
        clave: claveFinal,
        institucionId: Number(institucionId),
        token // 🔴 Token del body
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

    // === Normalizar colecciones ===
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

    // === Construir items ===
    const trabajos = [];
    const FECHA_INICIAL_FIJA = '01/01/2023';
    const FECHA_FINAL_HOY = formatDateDDMMYYYY(new Date());

    const es_capita = esCapita({ modalidad, ids });

    for (const { param, report, nombre } of reportMapping) {
      if (!(reportesSeleccionados.has('*') || reportesSeleccionados.has(report))) continue;

      const lista = normalized[param];
      if (!lista || !lista.length) continue;

      const modulo = getModulo(report);
      const nombreEPS = obtenerNombrePorEPS(eps, nombre);

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
          eps,
          nombre,
          ctx,
          { id, facturaPorDoc, esCapita: es_capita }
        );

        trabajos.push({
          numeroAdmision: String(numeroAdmision ?? idAdmisionRaw ?? resolvedAdmisionId),
          numeroFactura: String(numeroFactura ?? ctx.factura ?? '0'),
          nombreArchivo: nombreEPS,
          url: `https://reportes.saludplus.co/view.aspx?${urlParams.toString()}`,
          nombrepdf: nombreArchivoFinal,
        });
      }
    }

    if (!trabajos.length) {
      return res.status(404).json({ success: false, message: 'No se encontraron documentos' });
    }

    // === Agrupar resultados ===
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