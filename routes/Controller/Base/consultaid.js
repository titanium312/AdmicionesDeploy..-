const axios = require("axios");
const qs = require("qs");
const fetch = require("node-fetch");
const { instituciones } = require("./Instituciones");

/* =========================
   🔧 CONFIGURACIÓN GLOBAL
========================= */
const BASE_URL = "https://balance.saludplus.co";
const API_URL = "https://api.saludplus.co";

// Fechas en formato COLOMBIANO → DD/MM/YYYY
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

const findByColumn = (rows, columnIndex, value) =>
  rows
    .filter((row) => String(row?.[columnIndex] ?? "").trim() === String(value).trim())
    .map((row) => Number(row[0]) || null)
    .filter(Boolean);

const findFactura = (rows, numero) =>
  rows
    .filter((row) => {
      const factura = String(row?.[2] ?? "");
      if (!factura) return false;
      // Más tolerante: contiene el número o coincide quitando prefijos y caracteres
      return (
        factura.includes(numero) ||
        factura.replace(/[^0-9]/g, "") === String(numero)
      );
    })
    .map((row) => Number(row[0]) || null)
    .filter(Boolean);

/* =========================
   🎯 CONTROLLER
========================= */
/* =========================
   🎯 CONTROLLER CONSULTAID CORREGIDO
========================= */
const ConsultaId = async (req, res) => {
  try {
    // ── Parámetros ───────────────────────────────────────────────
    const numero = String(req.body?.sSearch ?? req.query?.sSearch ?? "").trim();
    const idInstitucion = Number(req.body?.idInstitucion ?? req.query?.idInstitucion);

    if (!numero || isNaN(idInstitucion) || idInstitucion <= 0) {
      return res.status(400).json({
        ok: false,
        message: "Parámetros requeridos: sSearch (número identificación) e idInstitucion (número válido)",
      });
    }

    // ── Institución ──────────────────────────────────────────────
    const institucion = instituciones.find((i) => i.idInstitucion === idInstitucion);
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

    // ── Token para API nueva (opcional) ──────────────────────────
    const authToken = req.body?.token || req.body?.accessToken || null;

    // ── Servicios (igual) ────────────────────────────────────────
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

      idanexo: async () => {
        if (!authToken) return { result: [] };
        try {
          const res = await fetch(
            `${API_URL}/api/anexoUrgencia/ListadoAnexos?pageSize=50&pageNumber=1&filter=${encodeURIComponent(numero)}&filterAudit=3`,
            {
              headers: {
                Authorization: `Bearer ${authToken}`,
                Accept: "application/json",
              },
            }
          );
          return res.ok ? await res.json() : { result: [] };
        } catch {
          return { result: [] };
        }
      },
    };

    // ── Include flexible ─────────────────────────────────────────
    const aliasMap = {
      todo: Object.keys(servicios),
      all: Object.keys(servicios),
      "*": Object.keys(servicios),
      admision: ["admision"],
      egreso: ["egreso"],
      evolucion: ["evolucion"],
      notas: ["notas"],
      ordenes: ["ordenes"],
      historias: ["historias"],
      facturas: ["facturas"],
      idanexo: ["idanexo"],
    };

    const rawInclude = Array.isArray(req.body?.include)
      ? req.body.include
      : typeof req.body?.include === "string"
      ? [req.body.include]
      : ["admision"];

    const includeFinal = [...new Set(rawInclude.flatMap((k) => aliasMap[k] || []))];

    // ── Ejecución paralela ───────────────────────────────────────
    const resultados = {};
    await Promise.all(
      includeFinal.map(async (key) => {
        resultados[key] = await servicios[key]();
      })
    );

    // ── Procesamiento de IDs CORREGIDO ───────────────────────────
    // ❗ IMPORTANTE: Verifica los índices reales de tus datos
    // Normalmente: columna 0 = ID, columna 1 = Número documento
    
    const response = { ids: {}, totales: {} };

    // Helper mejorado para encontrar IDs
    const encontrarIds = (rows, searchValue, idColumn = 0, searchColumn = 1) => {
      return rows
        .filter(row => {
          const valorBusqueda = String(row?.[searchColumn] ?? "").trim();
          return valorBusqueda === String(searchValue).trim() ||
                 valorBusqueda.includes(String(searchValue).trim());
        })
        .map(row => Number(row?.[idColumn]) || null)
        .filter(id => id && !isNaN(id));
    };

    // 🔴 AJUSTA ESTOS ÍNDICES SEGÚN TUS DATOS REALES
    if (resultados.admision) {
      response.ids.admision = encontrarIds(resultados.admision, numero, 0, 1); // ID col 0, Doc col 1
    }
    
    if (resultados.egreso) {
      response.ids.egreso = encontrarIds(resultados.egreso, numero, 0, 6); // ID col 0, Doc col 6
    }
    
    if (resultados.evolucion) {
      response.ids.evolucion = encontrarIds(resultados.evolucion, numero, 0, 1); // ID col 0, Doc col 1
    }
    
    if (resultados.notas) {
      response.ids.notasEnfermeria = encontrarIds(resultados.notas, numero, 0, 1); // ID col 0, Doc col 1
      response.totales.notasEnfermeria = response.ids.notasEnfermeria.length;
    }
    
    if (resultados.ordenes) {
      response.ids.ordenesMedicas = encontrarIds(resultados.ordenes, numero, 0, 1); // ID col 0, Doc col 1
      response.totales.ordenesMedicas = response.ids.ordenesMedicas.length;
    }
    
    if (resultados.historias) {
      // 🔴 ESTO ES CRÍTICO: Verifica qué columna tiene el ID (normalmente 0) y qué columna tiene el documento
      response.ids.historiasClinicas = encontrarIds(resultados.historias, numero, 0, 1); // ID col 0, Doc col 1
      response.totales.historiasClinicas = response.ids.historiasClinicas.length;
    }
    
    if (resultados.facturas) {
      // Para facturas, buscamos por número de factura en columna 2
      response.ids.factura = resultados.facturas
        .filter(row => {
          const factura = String(row?.[2] ?? "");
          return factura.includes(numero) || 
                 factura.replace(/[^0-9]/g, "") === numero;
        })
        .map(row => Number(row[0]) || null)
        .filter(Boolean);
      response.totales.factura = response.ids.factura.length;
    }
    
    if (resultados.idanexo?.result) {
      response.ids.idanexo = resultados.idanexo.result.map((r) => r.id).filter(Boolean);
      response.totales.idanexo = response.ids.idanexo.length;
    }

    // ── Log para depuración ──────────────────────────────────────
    console.log("🔍 ConsultaId resultados:", {
      numeroBuscado: numero,
      totalHistorias: response.ids.historiasClinicas?.length || 0,
      historiasIds: response.ids.historiasClinicas,
      totalNotas: response.ids.notasEnfermeria?.length || 0,
      notasIds: response.ids.notasEnfermeria,
      totalOrdenes: response.ids.ordenesMedicas?.length || 0,
      ordenesIds: response.ids.ordenesMedicas
    });

    // ── Validar si realmente encontró algo ───────────────────────
    const totalDocumentos = 
      (response.ids.admision?.length || 0) +
      (response.ids.historiasClinicas?.length || 0) +
      (response.ids.notasEnfermeria?.length || 0) +
      (response.ids.ordenesMedicas?.length || 0) +
      (response.ids.evolucion?.length || 0) +
      (response.ids.egreso?.length || 0) +
      (response.ids.factura?.length || 0) +
      (response.ids.idanexo?.length || 0);

    if (totalDocumentos === 0) {
      console.log("⚠️ No se encontraron documentos para:", numero);
      
      // Retornar estructura vacía pero válida
      return res.json({
        ok: true,
        numeroBusqueda: numero,
        idInstitucion,
        institucion: institucion.nombre,
        fechaConsulta: FECHA_FINAL,
        include: includeFinal,
        resultados: {
          ids: {
            admision: [],
            egreso: [],
            evolucion: [],
            notasEnfermeria: [],
            ordenesMedicas: [],
            historiasClinicas: [],
            factura: [],
            idanexo: []
          },
          totales: {
            notasEnfermeria: 0,
            ordenesMedicas: 0,
            historiasClinicas: 0,
            factura: 0,
            idanexo: 0
          }
        },
        mensaje: "No se encontraron documentos para la búsqueda"
      });
    }

    // ── Respuesta final ──────────────────────────────────────────
    return res.json({
      ok: true,
      numeroBusqueda: numero,
      idInstitucion,
      institucion: institucion.nombre,
      fechaConsulta: FECHA_FINAL,
      include: includeFinal,
      resultados: response,
    });

  } catch (error) {
    console.error("❌ ConsultaId:", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al consultar la información",
      detalle: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
module.exports = { ConsultaId };