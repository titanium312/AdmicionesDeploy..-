// Archivo: descargarArchivo.js

const axios = require('axios');
const unzipper = require('unzipper');
const { pipeline } = require('stream/promises');

// IMPORTAMOS buscarFactura (handler Express existente) sin modificarlo
const { buscarFactura } = require('../Controller/otro/Admiciones/buscar'); // <-- no tocar buscarFactura

/* =========================
 *  Utils
 * ========================= */
function sanitizeFilename(name) {
  return String(name)
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizarEPS(eps) {
  const e = String(eps || '').trim().toUpperCase();
  if (e === 'NUEVA EPS' || e === 'NUEVA_EPS') return 'NUEVA EPS';
  if (e === 'SALUD TOTAL' || e === 'SALUD_TOTAL') return 'SALUD TOTAL';
  return e;
}

// Toma la factura principal (mayor id_factura) o una que coincida
function pickFactura(facturasDetalle = [], preferNumeroFactura = null) {
  if (!Array.isArray(facturasDetalle) || facturasDetalle.length === 0) return null;
  if (preferNumeroFactura) {
    const match = facturasDetalle.find(
      f => String(f.numero_factura) === String(preferNumeroFactura)
    );
    if (match) return match;
  }
  return facturasDetalle.reduce(
    (acc, cur) => (!acc || Number(cur.id_factura) > Number(acc.id_factura) ? cur : acc),
    null
  );
}

/* =========================
 *  Helper: invocar buscarFactura (sin modificar el handler)
 *  Crea req/res simulados y devuelve la respuesta JSON.
 * ========================= */
function callBuscarFacturaSimulado({ sSearch = '' }, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    let finished = false;

    // req simulado: buscarFactura usa req.body.sSearch en tu snippet original
    const reqSim = { body: { sSearch } };

    // res simulado: capturamos json() / status().json() / send()
    const resSim = {};

    function finalize(ok, payload) {
      if (finished) return;
      finished = true;
      if (ok) resolve(payload);
      else reject(payload);
    }

    resSim.json = (payload) => finalize(true, { status: 200, body: payload });
    resSim.send = (payload) => finalize(true, { status: 200, body: payload });
    resSim.status = function (code) {
      // devolver objeto con json/send
      return {
        json: (payload) => finalize(true, { status: code, body: payload }),
        send: (payload) => finalize(true, { status: code, body: payload }),
      };
    };

    // en algunos handlers pueden usar res.end / res.writeHead; añadimos defensas mínimas:
    resSim.end = () => finalize(true, { status: 200, body: null });

    // Llamamos al handler — puede lanzar: capturarlo
    try {
      // buscarFactura puede ser sync o async — soportamos ambos
      const maybePromise = buscarFactura(reqSim, resSim);
      if (maybePromise && typeof maybePromise.then === 'function') {
        // Si el handler devuelve una promesa, también queremos capturar si llama res.json dentro
        // pero la promesa podría resolverse antes de que resSim.json sea llamado — entonces esperaremos al finalize via resSim.
        // Para evitar espera infinita, ponemos un timeout:
        const to = setTimeout(() => {
          if (!finished) {
            finished = true;
            resolve({ status: 204, body: null }); // sin respuesta concreta
          }
        }, timeoutMs);

        // si la promesa rechaza, lo convertimos en reject (si no se ha finalizado ya)
        maybePromise.catch((err) => {
          clearTimeout(to);
          if (!finished) finalize(false, err);
        }).finally(() => {
          clearTimeout(to);
        });
      } else {
        // si no retorna promesa, dependeremos de resSim para finalizar; añadimos timeout
        setTimeout(() => {
          if (!finished) resolve({ status: 204, body: null }); // sin respuesta concreta
        }, timeoutMs);
      }
    } catch (err) {
      finalize(false, err);
    }
  });
}

/* =========================
 *  Controller principal
 * ========================= */
async function FacturaElectronica(req, res) {
  try {
    const { clave, numeroFactura, numeroAdmision, idAdmision, eps, institucionId, idUser } = req.query;

    console.log("📥 Query recibida:", req.query);

    // Validación de requeridos
    const faltantes = [];
    if (!eps) faltantes.push('eps');
    if (!institucionId) faltantes.push('institucionId');
    if (!idUser) faltantes.push('idUser');
    const anyKey = clave ?? numeroFactura ?? numeroAdmision ?? idAdmision;
    if (!anyKey) faltantes.push('clave|numeroFactura|numeroAdmision|idAdmision');

    if (faltantes.length > 0) {
      return res.status(400).send(`❌ Faltan parámetros: ${faltantes.join(', ')}`);
    }

    // ----------------------------------------------------
    // Intentar resolver idFactura llamando al handler buscarFactura (sin modificarlo)
    // ----------------------------------------------------
    let resolvedIdFactura = null;

    try {
      // Construimos el sSearch tal como el handler espera:
      const sSearch = numeroAdmision ?? clave ?? '';
      const resultado = await callBuscarFacturaSimulado({ sSearch }, 8000); // timeout 8s

      if (resultado && resultado.status === 200 && resultado.body) {
        // buscarFactura original devolvía { idFactura, numeroAdmision } en tu snippet
        const body = resultado.body;
        if (body && (body.idFactura || body.idFactura === 0)) {
          resolvedIdFactura = String(body.idFactura);
          console.log('🔎 idFactura resuelto vía buscarFactura ->', resolvedIdFactura);
        } else {
          console.log('🔎 buscarFactura respondió pero no incluyó idFactura en el body:', body);
        }
      } else {
        console.log('🔎 buscarFactura no devolvió 200 o body vacío, resultado:', resultado);
      }
    } catch (err) {
      console.warn('⚠️ Error al ejecutar buscarFactura (simulado):', err && err.message ? err.message : err);
      // No abortamos: seguimos ruta alternativa para resolver ids
    }

    // ----------------------------------------------------
    // Si no obtuvimos idFactura desde buscarFactura, seguimos la lógica previa para resolver ids
    // ----------------------------------------------------
    let ids = null;
    if (!resolvedIdFactura) {
      if (!numeroFactura && !clave && (numeroAdmision || idAdmision)) {
        // obtenerIdsPorAdmision debe existir en tu código original
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

      // seleccionar la factura preferida
      const preferFacturaNum = numeroFactura ? String(numeroFactura).trim() : null;
      const principal = pickFactura(ids.facturasDetalle, preferFacturaNum);
      if (!principal?.id_factura) {
        return res.status(404).send('❌ No se encontraron facturas asociadas');
      }

      resolvedIdFactura = String(principal.id_factura);
    }

    // A partir de aquí resolvedIdFactura está disponible
    const idFactura = resolvedIdFactura;
    const noFactura = numeroFactura ?? ids?.numeroFactura ?? undefined;
    const nit = ids?.nitInstitucion ? String(ids.nitInstitucion) : 'NITDESCONOCIDO';

    // 2) Obtener URL del ZIP
    const zipInfoUrl = `https://balance.saludplus.co/facturasAdministar/GetZipFile?IdFactura=${encodeURIComponent(idFactura)}`;

    const responseZip = await axios.get(zipInfoUrl);
    if (responseZip.data?.valorRetorno !== 1) {
      return res.status(400).send('❌ Error al obtener la información de la factura');
    }
    const archivoUrl = responseZip.data.archivo;
    if (!archivoUrl) {
      return res.status(400).send('❌ No se encontró la URL del archivo');
    }

    // 3) Construir nombre final SOLO 2 formatos
    const epsNorm = normalizarEPS(eps);
    let baseNombreFinal;
    if (epsNorm === 'NUEVA EPS') {
      baseNombreFinal = `FVS_${nit}_FEH${noFactura ?? idFactura}`;
    } else if (epsNorm === 'SALUD TOTAL') {
      baseNombreFinal = `${nit}_FEH_${noFactura ?? idFactura}_1_1`;
    } else {
      baseNombreFinal = `${nit}_${noFactura ?? idFactura}`;
    }

    const finalSafe = `${sanitizeFilename(baseNombreFinal)}.pdf`;

    // 4) Descargar ZIP → extraer PDF → enviar al cliente
    const zipResp = await axios.get(archivoUrl, { responseType: 'arraybuffer' });
    const directory = await unzipper.Open.buffer(zipResp.data);

    const pdfEntry = directory.files.find((f) => /\.pdf$/i.test(f.path));
    if (!pdfEntry) {
      return res.status(400).send('❌ El ZIP no contiene ningún PDF');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${finalSafe}"; filename*=UTF-8''${encodeURIComponent(finalSafe)}`
    );

    await pipeline(pdfEntry.stream(), res);

  } catch (error) {
    console.error('🔥 Error en descarga directa de PDF:', error);
    if (!res.headersSent) {
      return res.status(500).send('❌ Error interno al generar la descarga del PDF');
    }
  }
}

module.exports = { FacturaElectronica };
