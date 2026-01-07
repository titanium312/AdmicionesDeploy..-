const axios = require("axios");
const qs = require("qs");

/* =========================
   🔧 CONFIGURACIÓN GLOBAL
========================= */
const BASE_URL = "https://balance.saludplus.co";
const FECHA_INICIAL = "11/18/2025";
const FECHA_FINAL   = "12/18/2025";
const JSESSIONID    = "PEGA_AQUI_TU_JSESSIONID_REAL";

const HEADERS = {
  "Accept": "application/json, text/javascript, */*; q=0.01",
  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
  "X-Requested-With": "XMLHttpRequest",
  "Origin": BASE_URL,
  "Referer": `${BASE_URL}/instituciones/?origen=1&theme=false`,
  "User-Agent": "Mozilla/5.0",
  "Cookie": `JSESSIONID=${JSESSIONID}`,
  "data":
    "kC0YDHEUO0vlftrAtYHllfCjAqT8zXGwj/hFT8ULo8k=.1SS9/UCeyjpq9PyT8MBqPg==.wcFkBNOeMUO3EbN8I4nUXw=="
};

/* =========================
   🔁 FUNCIÓN REUTILIZABLE
========================= */
const postRequest = async (url, payload) => {
  const { data } = await axios.post(
    url,
    qs.stringify(payload),
    { headers: HEADERS, timeout: 30000 }
  );
  return data?.aaData || [];
};

/* =========================
   🎯 CONTROLLER PRINCIPAL
========================= */
async function ConsultaId(req, res) {
  try {
    const numero =
      (req.body?.sSearch || req.query?.sSearch || "").toString().trim();

    if (!numero) {
      return res.status(400).json({
        error: "Debe enviar el parámetro sSearch (número de admisión)"
      });
    }

    /* =========================
       ⚡ CONSULTAS EN PARALELO
    ========================= */
    const [
      admisiones,
      egresos,
      evoluciones,
      notasEnfermeria,
      ordenesMedicas
    ] = await Promise.all([

      // ADMISIONES
      postRequest(
        `${BASE_URL}/admisiones/BucardorAdmisionesDatos?fechaInicial=*&fechaFinal=*&idRecurso=0&SinCargo=False&idServicioIngreso=3&idCaracteristica=0&validarSede=True`,
        {
          sEcho: 1,
          iDisplayStart: 0,
          iDisplayLength: 10,
          sSearch: numero
        }
      ),

      // EGRESOS
      postRequest(
        `${BASE_URL}/egresosHistoria/BucardorEgresosDatos?fechaInicial=${FECHA_INICIAL}&fechaFinal=${FECHA_FINAL}`,
        {
          sEcho: 1,
          iColumns: 6,
          iDisplayStart: 0,
          iDisplayLength: 10,
          sSearch: numero
        }
      ),

      // EVOLUCIONES
      postRequest(
        `${BASE_URL}/evoluciones/BucardorEvolucionesDatos?fechaInicial=${FECHA_INICIAL}&fechaFinal=${FECHA_FINAL}`,
        {
          sEcho: 1,
          iColumns: 6,
          iDisplayStart: 0,
          iDisplayLength: 10,
          sSearch: numero
        }
      ),

      // NOTAS ENFERMERÍA
      postRequest(
        `${BASE_URL}/notasEnfermeria/BucardorNotasEnfermeriaDatos?fechaInicial=${FECHA_INICIAL}&fechaFinal=${FECHA_FINAL}`,
        {
          sEcho: 1,
          iColumns: 7,
          sColumns: ",HISTORIA,NOMBRE,FECHA,HORA,USUARIO,ESTADO",
          iDisplayStart: 0,
          iDisplayLength: 100,
          sSearch: numero,
          bRegex: false,
          iSortingCols: 1,
          iSortCol_0: 0,
          sSortDir_0: "asc"
        }
      ),

      // ÓRDENES MÉDICAS
      postRequest(
        `${BASE_URL}/ordenesMedicas/BucardorOrdenesMedicasDatos?fechaInicial=${FECHA_INICIAL}&fechaFinal=${FECHA_FINAL}`,
        {
          sEcho: 2,
          iColumns: 7,
          sColumns: ",HISTORIA,NOMBRE,FECHA,HORA,ELABORO,ESTADO",
          iDisplayStart: 0,
          iDisplayLength: 100,
          sSearch: numero,
          bRegex: false,
          iSortingCols: 1,
          iSortCol_0: 0,
          sSortDir_0: "asc"
        }
      )
    ]);

    /* =========================
       🧠 PROCESAMIENTO
    ========================= */
    const idAdmision =
      admisiones
        .map(r => ({ id: r[0], numero: r[1]?.split(" ")[0] }))
        .find(r => r.numero === numero)?.id || null;

    const idEgreso =
      egresos.find(r => r[6] === numero)?.[0] || null;

    const idEvolucion =
      evoluciones.find(r => r[1] === numero)?.[0] || null;

    const idsNotasEnfermeria = notasEnfermeria
      .filter(r => r[1] === numero)
      .map(r => Number(r[0]))
      .sort((a, b) => a - b)
      .map((id, i) => ({ numero: i + 1, id }));

    const idsOrdenesMedicas = ordenesMedicas
      .filter(r => r[1] === numero)
      .map(r => Number(r[0]))
      .sort((a, b) => a - b)
      .map((id, i) => ({ numero: i + 1, id }));

    /* =========================
       ✅ RESPUESTA FINAL
    ========================= */
    return res.json({
      numeroAdmision: numero,
      idAdmision,
      idEgreso,
      idEvolucion,
      totalNotasEnfermeria: idsNotasEnfermeria.length,
      totalOrdenesMedicas: idsOrdenesMedicas.length,
      idsNotasEnfermeria,
      idsOrdenesMedicas
    });

  } catch (error) {
    console.error("❌ Error ConsultaId:", error.message);
    return res.status(500).json({
      error: "Error consultando información",
      detalle: error.response?.data || error.message
    });
  }
}

module.exports = { ConsultaId };
