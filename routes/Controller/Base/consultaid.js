const axios = require("axios");
const qs = require("qs");
const fetch = require("node-fetch");
const { instituciones } = require("./Instituciones");

/* =========================
   🔧 CONFIGURACIÓN GLOBAL
========================= */
const BASE_URL = "https://balance.saludplus.co";
const API_URL = "https://api.saludplus.co";

const FECHA_INICIAL = "01/01/2024";

const hoy = new Date();
const pad = (n) => String(n).padStart(2, "0");
const FECHA_FINAL = `${pad(hoy.getDate())}/${pad(hoy.getMonth() + 1)}/${hoy.getFullYear()}`;

/* =========================
   🔁 HELPERS
========================= */
const postRequest = async (url, payload, headers, timeout = 45000) => {
  try {
    const { data } = await axios.post(url, qs.stringify(payload), {
      headers,
      timeout,
    });
    return Array.isArray(data?.aaData) ? data.aaData : [];
  } catch (err) {
    console.error(`Error en postRequest ${url}:`, err.message);
    return [];
  }
};

const findFactura = (rows, numero) =>
  rows
    .filter(row => {
      const raw = String(row?.[2] ?? "").trim();

      // Extrae SOLO el número inicial antes del "-"
      const numeroFactura = raw.split("-")[0].trim();

      return numeroFactura === String(numero);
    })
    .map(row => Number(row?.[0]) || null)
    .filter(Boolean);

/* =========================
   🎯 CONTROLLER CONSULTAID
========================= */
const ConsultaId = async (req, res) => {
  try {
    const numero = String(req.body?.sSearch ?? req.query?.sSearch ?? "").trim();
    const idInstitucion = Number(req.body?.idInstitucion ?? req.query?.idInstitucion);

    if (!numero || isNaN(idInstitucion) || idInstitucion <= 0) {
      return res.status(400).json({
        ok: false,
        message: "Parámetros requeridos: sSearch e idInstitucion válido",
      });
    }

    const institucion = instituciones.find(i => i.idInstitucion === idInstitucion);
    if (!institucion) {
      return res.status(404).json({
        ok: false,
        message: "Institución no encontrada",
      });
    }

    const HEADERS = {
      data: institucion.Tksesicion,
      "Content-Type": "application/x-www-form-urlencoded",
    };

    const authToken = req.body?.token || null;

    const servicios = {
      admision: () =>
        postRequest(
          `${BASE_URL}/admisiones/BucardorAdmisionesDatos?fechaInicial=*&fechaFinal=*`,
          { sEcho: 1, iDisplayStart: 0, iDisplayLength: 100, sSearch: numero },
          HEADERS
        ),

      egreso: () =>
        postRequest(
          `${BASE_URL}/egresosHistoria/BucardorEgresosDatos?fechaInicial=${FECHA_INICIAL}&fechaFinal=${FECHA_FINAL}`,
          { sEcho: 1, iColumns: 6, iDisplayStart: 0, iDisplayLength: 100, sSearch: numero },
          HEADERS
        ),

      evolucion: () =>
        postRequest(
          `${BASE_URL}/evoluciones/BucardorEvolucionesDatos?fechaInicial=${FECHA_INICIAL}&fechaFinal=${FECHA_FINAL}`,
          { sEcho: 1, iColumns: 6, iDisplayStart: 0, iDisplayLength: 100, sSearch: numero },
          HEADERS
        ),

      notas: () =>
        postRequest(
          `${BASE_URL}/notasEnfermeria/BucardorNotasEnfermeriaDatos?fechaInicial=${FECHA_INICIAL}&fechaFinal=${FECHA_FINAL}`,
          { sEcho: 1, iColumns: 7, iDisplayStart: 0, iDisplayLength: 300, sSearch: numero },
          HEADERS
        ),

      ordenes: () =>
        postRequest(
          `${BASE_URL}/ordenesMedicas/BucardorOrdenesMedicasDatos?fechaInicial=${FECHA_INICIAL}&fechaFinal=${FECHA_FINAL}`,
          { sEcho: 2, iColumns: 7, iDisplayStart: 0, iDisplayLength: 300, sSearch: numero },
          HEADERS
        ),

      historias: () =>
        postRequest(
          `${BASE_URL}/historiasClinicas/BuscardorHistoriasDatos?fechaInicial=${FECHA_INICIAL}&fechaFinal=${FECHA_FINAL}`,
          { sEcho: 2, iColumns: 8, iDisplayStart: 0, iDisplayLength: 100, sSearch: numero },
          HEADERS
        ),

      facturas: () =>
        postRequest(
          `${BASE_URL}/facturasAdministar/BuscarListadofacturasDatos?fechaInicial=${FECHA_INICIAL}&fechaFinal=${FECHA_FINAL}`,
          { sEcho: 2, iColumns: 8, iDisplayStart: 0, iDisplayLength: 100, sSearch: numero },
          HEADERS
        ),
    };

    const includeFinal = ["admision", "egreso", "evolucion", "notas", "ordenes", "historias", "facturas"];

    const resultados = {};
    await Promise.all(
      includeFinal.map(async k => {
        resultados[k] = await servicios[k]();
      })
    );

    const response = { ids: {}, totales: {} };


       /* ======================================================
       🔴 ÚNICO CAMBIO: NUMERO DE ADMICION
       Regla: sSearch === ÚLTIMA COLUMNA
    ====================================================== */ 
const matchNumeroInicial = (valor, search) => {
  if (!valor) return false;
  const limpio = String(valor)
    .trim()
    .split(" ")[0]        // toma solo el primer número
    .replace(/[^0-9]/g, "");
  return limpio === String(search).trim();
};


if (resultados.admision) {
  response.ids.admision = resultados.admision
    .filter(row => matchNumeroInicial(row?.[1], numero)) // 👈 columna 1
    .map(row => Number(row?.[0]) || null)                 // 👈 ID columna 0
    .filter(Boolean);

  response.totales.admision = response.ids.admision.length;
}


    /* ======================================================
       🔴 ÚNICO CAMBIO: HISTORIAS CLÍNICAS
       Regla: sSearch === ÚLTIMA COLUMNA
    ====================================================== */
    if (resultados.historias) {
      response.ids.historiasClinicas = resultados.historias
        .filter(row => String(row?.[9] ?? "").trim() === numero)
        .map(row => Number(row?.[0]) || null)
        .filter(Boolean);

      response.totales.historiasClinicas =
        response.ids.historiasClinicas.length;
    }




    /* =========================
       🔒 TODO LO DEMÁS IGUAL
    ========================= */
    if (resultados.facturas) {
      response.ids.factura = findFactura(resultados.facturas, numero);
      response.totales.factura = response.ids.factura.length;
    }

    return res.json({
      ok: true,
      numeroBusqueda: numero,
      idInstitucion,
      institucion: institucion.nombre,
      fechaConsulta: FECHA_FINAL,
      resultados: response,
    });

  } catch (error) {
    console.error("❌ ConsultaId:", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al consultar",
    });
  }
};

module.exports = { ConsultaId };



