const axios = require("axios");
const qs = require("qs");
const { instituciones } = require("../Base/Instituciones");
const { buscarFactura } = require("../Base/ids/buscarIdFactura");
const { BuscarAnexo } = require("../Base/ids/buscarIdAnexo");

/* =========================
   🔧 CONFIGURACIÓN GLOBAL
========================= */
const BASE_URL = "https://total-oeyx.onrender.com";
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
    console.error(`❌ postRequest ${url}:`, err.message);
    return [];
  }
};

const findFactura = (rows, numero) =>
  rows
    .filter(r => String(r?.[1] ?? "").split("-")[0].trim() === String(numero))
    .map(r => Number(r?.[0]))
    .filter(Boolean);

const matchNumeroInicial = (valor, search) => {
  if (!valor) return false;
  const limpio = String(valor).trim().split(" ")[0].replace(/[^0-9]/g, "");
  return limpio === String(search).trim();
};

/* =========================
   🎯 CONTROLLER
========================= */
const ConsultaId = async (req, res) => {
  try {
    /* ========= INPUT ========= */
    const numero = String(req.body?.sSearch ?? req.query?.sSearch ?? "").trim();
    const idInstitucion = Number(req.body?.idInstitucion ?? req.query?.idInstitucion);
    const tokenAnexo = req.body?.tokenAnexo ?? req.query?.tokenAnexo;

    if (!numero || !idInstitucion) {
      return res.status(400).json({ ok: false, message: "Debe enviar sSearch e idInstitucion" });
    }

    /* ===== INSTITUCIÓN ===== */
    const institucion = instituciones.find(i => i.idInstitucion === idInstitucion);
    if (!institucion) {
      return res.status(404).json({ ok: false, message: "Institución no encontrada" });
    }

    const HEADERS_BALANCE = {
      data: institucion.Tksesicion,
      "Content-Type": "application/x-www-form-urlencoded",
    };

    /* ========= SERVICIOS ========= */
    const servicios = {
      admision: () =>
        postRequest(
          `${BASE_URL}/admisiones/BucardorAdmisionesDatos?fechaInicial=*&fechaFinal=*`,
          { sEcho: 1, iDisplayStart: 0, iDisplayLength: 100, sSearch: numero },
          HEADERS_BALANCE
        ),

      historias: () =>
        postRequest(
          `${BASE_URL}/historiasClinicas/BuscardorHistoriasDatos?fechaInicial=${FECHA_INICIAL}&fechaFinal=${FECHA_FINAL}`,
          { sEcho: 2, iColumns: 8, iDisplayStart: 0, iDisplayLength: 100, sSearch: numero },
          HEADERS_BALANCE
        ),

      // 🆕 EGRESOS
      egreso: () =>
        postRequest(
          `${BASE_URL}/egresosHistoria/BucardorEgresosDatos?fechaInicial=${FECHA_INICIAL}&fechaFinal=${FECHA_FINAL}`,
          { sEcho: 1, iColumns: 6, iDisplayStart: 0, iDisplayLength: 100, sSearch: numero },
          HEADERS_BALANCE
        ),

      // 🆕 EVOLUCIONES
      evolucion: () =>
        postRequest(
          `${BASE_URL}/evoluciones/BucardorEvolucionesDatos?fechaInicial=${FECHA_INICIAL}&fechaFinal=${FECHA_FINAL}`,
          { sEcho: 1, iColumns: 6, iDisplayStart: 0, iDisplayLength: 100, sSearch: numero },
          HEADERS_BALANCE
        ),

      // 🆕 NOTAS DE ENFERMERÍA
      notasEnfermeria: () =>
        postRequest(
          `${BASE_URL}/notasEnfermeria/BucardorNotasEnfermeriaDatos?fechaInicial=${FECHA_INICIAL}&fechaFinal=${FECHA_FINAL}`,
          { sEcho: 1, iColumns: 7, iDisplayStart: 0, iDisplayLength: 300, sSearch: numero },
          HEADERS_BALANCE
        ),

      // 🆕 ORDENES MEDICAS
      ordenesMedicas: () =>
        postRequest(
          `${BASE_URL}/ordenesMedicas/BucardorOrdenesMedicasDatos?fechaInicial=${FECHA_INICIAL}&fechaFinal=${FECHA_FINAL}`,
          { sEcho: 2, iColumns: 7, iDisplayStart: 0, iDisplayLength: 300, sSearch: numero },
          HEADERS_BALANCE
        ),

      facturas: async () => {
        const reqFake = { body: { sSearch: numero, idInstitucion } };
        let r = null;
        const resFake = { json: d => (r = d), status: () => ({ json: d => (r = d) }) };
        await buscarFactura(reqFake, resFake);
        return r?.id ? [[r.id, r.numeroCompleto]] : [];
      },

      anexo: async () => {
        const reqFake = { body: { filter: numero, token: tokenAnexo } };
        let r = null;
        const resFake = { json: d => (r = d), status: () => ({ json: d => (r = d) }) };
        await BuscarAnexo(reqFake, resFake);
        return r?.idAnexo ? [[r.idAnexo]] : [];
      },
    };

    /* ========= EJECUCIÓN ========= */
    const modulos = [
      "admision",
      "historias",
      "egreso",
      "evolucion",
      "notasEnfermeria",
      "ordenesMedicas",
      "facturas",
      "anexo",
    ];

    const resultados = {};
    await Promise.all(modulos.map(m => servicios[m]().then(r => (resultados[m] = r))));

    /* ========= RESPONSE ========= */
    const response = { ids: {}, totales: {} };

    response.ids.admision = resultados.admision.filter(r => matchNumeroInicial(r?.[1], numero)).map(r => +r[0]);
    response.totales.admision = response.ids.admision.length;

    response.ids.historiasClinicas = resultados.historias.filter(r => String(r?.[9]) === numero).map(r => +r[0]);
    response.totales.historiasClinicas = response.ids.historiasClinicas.length;

    response.ids.egreso = resultados.egreso.map(r => +r[0]).filter(Boolean);
    response.totales.egreso = response.ids.egreso.length;

    response.ids.evolucion = resultados.evolucion.map(r => +r[0]).filter(Boolean);
    response.totales.evolucion = response.ids.evolucion.length;

    response.ids.notasEnfermeria = resultados.notasEnfermeria.map(r => +r[0]).filter(Boolean);
    response.totales.notasEnfermeria = response.ids.notasEnfermeria.length;

    response.ids.ordenesMedicas = resultados.ordenesMedicas.map(r => +r[0]).filter(Boolean);
    response.totales.ordenesMedicas = response.ids.ordenesMedicas.length;

    response.ids.factura = findFactura(resultados.facturas, numero);
    response.totales.factura = response.ids.factura.length;

    response.ids.anexo = resultados.anexo.map(r => +r[0]).filter(Boolean);
    response.totales.anexo = response.ids.anexo.length;

    return res.json({
      ok: true,
      numeroBusqueda: numero,
      institucion: institucion.nombre,
      fechaConsulta: FECHA_FINAL,
      resultados: response,
    });

  } catch (e) {
    console.error("❌ ConsultaId:", e);
    return res.status(500).json({ ok: false, message: "Error interno del servidor" });
  }
};

module.exports = { ConsultaId };
