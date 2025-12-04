// descargarArchivo.js
const axios = require('axios');
const unzipper = require('unzipper');
const { pipeline } = require('stream/promises');

// IMPORTS — ajusta rutas si es necesario
let buscarFactura = null;
let obtenerIds = null;
let obtenerIdsPorAdmision = null;

try {
  buscarFactura = require('../Controller/otro/Admiciones/buscar').buscarFactura;
} catch (e) { /* no-op */ }

try {
  const idsModule = require('../Controller/Base/ids');
  obtenerIds = idsModule.obtenerIds;
  obtenerIdsPorAdmision = idsModule.obtenerIdsPorAdmision;
} catch (e) { /* no-op */ }

/* ========== Helpers ========== */
const sanitizeFilename = (name) =>
  String(name).replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim();

const normalizarEPS = (eps) => {
  const e = String(eps || '').trim().toUpperCase();
  if (e === 'NUEVA EPS' || e === 'NUEVA_EPS') return 'NUEVA EPS';
  if (e === 'SALUD TOTAL' || e === 'SALUD_TOTAL') return 'SALUD TOTAL';
  return e;
};

const pickFactura = (facturasDetalle = [], preferNumero = null) => {
  if (!Array.isArray(facturasDetalle) || facturasDetalle.length === 0) return null;
  if (preferNumero) {
    const m = facturasDetalle.find(f => String(f.numero_factura) === String(preferNumero));
    if (m) return m;
  }
  return facturasDetalle.reduce((acc, cur) => (!acc || Number(cur.id_factura) > Number(acc.id_factura) ? cur : acc), null);
};

const callBuscarFacturaSimulado = ({ sSearch = '' }, timeoutMs = 8000) => new Promise((resolve) => {
  const reqSim = { body: { sSearch } };
  const resSim = {};
  let finished = false;

  function finalize(status, body) {
    if (finished) return;
    finished = true;
    resolve({ status, body });
  }

  resSim.json = (payload) => finalize(200, payload);
  resSim.send = (payload) => finalize(200, payload);
  resSim.status = (code) => ({ json: (p) => finalize(code, p), send: (p) => finalize(code, p) });
  resSim.end = () => finalize(200, null);

  try {
    const maybe = typeof buscarFactura === 'function' ? buscarFactura(reqSim, resSim) : null;
    if (maybe && typeof maybe.then === 'function') {
      const to = setTimeout(() => finalize(204, null), timeoutMs);
      maybe.finally(() => clearTimeout(to));
    } else {
      setTimeout(() => finalize(204, null), timeoutMs);
    }
  } catch (err) {
    finalize(500, { error: String(err && err.message ? err.message : err) });
  }
});

/* ========== Controller ========== */
async function FacturaElectronica(req, res) {
  try {
    const { clave, numeroFactura, numeroAdmision, idAdmision, eps, institucionId, idUser } = req.query;

    // Validación básica
    const faltantes = [];
    if (!eps) faltantes.push('eps');
    if (!institucionId) faltantes.push('institucionId');
    if (!idUser) faltantes.push('idUser');
    const anyKey = clave ?? numeroFactura ?? numeroAdmision ?? idAdmision;
    if (!anyKey) faltantes.push('clave|numeroFactura|numeroAdmision|idAdmision');
    if (faltantes.length) return res.status(400).send(`Faltan parámetros: ${faltantes.join(', ')}`);

    // 1) intentar resolver idFactura usando buscarFactura (si está disponible)
    let resolvedIdFactura = null;
    let ids = null;

    try {
      const sSearch = numeroAdmision ?? clave ?? '';
      const resultado = await callBuscarFacturaSimulado({ sSearch }, 8000);
      if (resultado && resultado.status === 200 && resultado.body && (resultado.body.idFactura || resultado.body.idFactura === 0)) {
        resolvedIdFactura = String(resultado.body.idFactura);
      }
    } catch (e) {
      // ignorar y seguir
    }

    // 2) si no se resolvió, usar obtenerIds / obtenerIdsPorAdmision
    if (!resolvedIdFactura) {
      if (typeof obtenerIds !== 'function' || typeof obtenerIdsPorAdmision !== 'function') {
        return res.status(500).send('Error interno: funciones de resolución de IDs no disponibles');
      }

      if (!numeroFactura && !clave && (numeroAdmision || idAdmision)) {
        ids = await obtenerIdsPorAdmision({
          institucionId: Number(institucionId),
          idAdmision: Number(numeroAdmision ?? idAdmision),
        });
      } else {
        ids = await obtenerIds({
          institucionId: Number(institucionId),
          clave: String(anyKey),
        });
      }

      const preferNumero = numeroFactura ? String(numeroFactura).trim() : null;
      const principal = pickFactura(ids?.facturasDetalle, preferNumero);
      if (!principal?.id_factura) return res.status(404).send('No se encontraron facturas asociadas');
      resolvedIdFactura = String(principal.id_factura);
    }

    // 3) obtener info del ZIP desde servicio remoto
    const idFactura = resolvedIdFactura;
    const noFactura = numeroFactura ?? ids?.numeroFactura ?? undefined;
    const nit = ids?.nitInstitucion ? String(ids.nitInstitucion) : '812001219';

    const zipInfoUrl = `https://balance.saludplus.co/facturasAdministar/GetZipFile?IdFactura=${encodeURIComponent(idFactura)}`;
    const responseZip = await axios.get(zipInfoUrl).catch(() => null);
    if (!responseZip || responseZip.status !== 200 || responseZip.data?.valorRetorno !== 1) {
      return res.status(400).send('Error al obtener la información de la factura');
    }

    const archivoUrl = responseZip.data.archivo;
    if (!archivoUrl) return res.status(400).send('No se encontró la URL del archivo');

    // 4) construir nombre final
    const epsNorm = normalizarEPS(eps);
    let baseNombre;
    if (epsNorm === 'NUEVA EPS') baseNombre = `FVS_${nit}_FEH${noFactura ?? idFactura}`;
    else if (epsNorm === 'SALUD TOTAL') baseNombre = `${nit}_FEH_${noFactura ?? idFactura}_1_1`;
    else baseNombre = `${nit}_${noFactura ?? idFactura}`;
    const finalName = `${sanitizeFilename(baseNombre)}.pdf`;

    // 5) descargar ZIP, extraer PDF y enviar
    const zipResp = await axios.get(archivoUrl, { responseType: 'arraybuffer', timeout: 20000 }).catch(() => null);
    if (!zipResp || !zipResp.data) return res.status(500).send('Error al descargar el ZIP de la factura');

    const directory = await unzipper.Open.buffer(zipResp.data).catch(() => null);
    if (!directory) return res.status(500).send('Error al procesar el ZIP');

    const pdfEntry = directory.files.find(f => /\.pdf$/i.test(f.path));
    if (!pdfEntry) return res.status(400).send('El ZIP no contiene ningún PDF');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${finalName}"; filename*=UTF-8''${encodeURIComponent(finalName)}`);

    await pipeline(pdfEntry.stream(), res);
    // pipeline se encarga de finalizar la respuesta
  } catch (err) {
    if (!res.headersSent) res.status(500).send('Error interno al generar la descarga del PDF');
  }
}

module.exports = { FacturaElectronica };
