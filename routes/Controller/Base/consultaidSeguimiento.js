// Archivo: Base/consultaidSeguimiento.js

const axios = require("axios");

/* ========= LIMPIAR NUMERO ========= */
const limpiarNumero = (texto) => {
  return texto
    .split("-")[0]
    .replace(/\s+/g, "")
    .trim();
};

// Token fijo (deberías moverlo a variables de entorno)
const TOKEN = "E4zDmiOYyZy8kSz18voWF21jnSB9ZCcxdPduDxK+vpA=.1SS9/UCeyjpq9PyT8MBqPg==.wcFkBNOeMUO3EbN8I4nUXw==";

/**
 * Obtiene los IDs de seguimiento usando número de admisión o cualquier clave
 * @param {Object} params - Parámetros de consulta
 * @param {string} params.clave - Número de admisión, factura o cualquier identificador
 * @param {number} params.institucionId - ID de la institución (opcional)
 * @param {string} params.token - Token de autenticación (opcional, se usa el fijo si no se provee)
 * @returns {Promise<Object>} - Objeto con todos los IDs formateados
 */
async function obtenerIdsConConsultaId({ clave, institucionId, token = TOKEN }) {
  try {
    const numero = String(clave || "").trim();

    if (!numero) {
      throw new Error("Falta el parámetro 'clave'");
    }

    /* ========= 1. BUSCAR ADMISION ========= */
    const buscar = await axios.post(
      "https://balance.saludplus.co/seguimientoDocumentos/BucardorAdmisionesDatos?fechaInicial=01/01/2024&fechaFinal=03/20/2026&idEntidad=0&idContrato=0&idServicioIngreso=0",
      `sEcho=6&iColumns=2&iDisplayStart=0&iDisplayLength=50&sSearch=${numero}`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "accept": "application/json, text/javascript, */*; q=0.01",
          "x-requested-with": "XMLHttpRequest",
          "user-agent": "Mozilla/5.0",
          "data": token
        }
      }
    );

    const data = buscar.data;

    if (!data?.aaData || data.aaData.length === 0) {
      throw new Error("No se encontraron resultados para la consulta");
    }

    /* ========= 2. MATCH EXACTO ========= */
    let matchRow = null;
    let numeroAdmisionEncontrado = null;

    for (const row of data.aaData) {
      const numeroLimpio = limpiarNumero(row[1]);

      if (numeroLimpio === numero) {
        matchRow = row;
        numeroAdmisionEncontrado = numeroLimpio;
        break;
      }
    }

    if (!matchRow) {
      throw new Error(`No se encontró coincidencia exacta para el número: ${numero}`);
    }

    const idAdmision = matchRow[0];

    /* ========= 3. CONSULTAR CALENDARIO ========= */
    const calendario = await axios.get(
      "https://balance.saludplus.co/seguimientoDocumentos/BuscadorCalendario",
      {
        params: { idAdmision },
        headers: {
          "accept": "*/*",
          "x-requested-with": "XMLHttpRequest",
          "user-agent": "Mozilla/5.0",
          "data": token
        }
      }
    );

    const html = calendario.data;

    /* ========= 4. EXTRAER EVENTOS ========= */
    const regex = /id:\s*(\d+)[\s\S]*?documento\s*:\s*'([^']+)'/g;
    let match;

    // Inicializar estructura de documentos
    const documentos = {
      idAdmision: null,
      idHistoria: null,
      idOrden: null,
      idEvolucion: null,
      idEpicrisis: null,
      idsNotas: []
    };

    while ((match = regex.exec(html)) !== null) {
      const id = parseInt(match[1]);
      const tipo = match[2];

      switch (tipo) {
        case "admision":
          documentos.idAdmision = id;
          break;
        case "historia":
          documentos.idHistoria = id;
          break;
        case "orden":
          documentos.idOrden = id;
          break;
        case "evolucion":
          documentos.idEvolucion = id;
          break;
        case "epicrisis":
          documentos.idEpicrisis = id;
          break;
        case "nota":
          documentos.idsNotas.push(id);
          break;
      }
    }

    /* ========= 5. FORMATO FINAL ========= */
    const resultado = {
      numeroAdmision: numeroAdmisionEncontrado || numero,
      idAdmision: String(documentos.idAdmision),
      idAdmisionDoc: documentos.idAdmision,
      idHistoria: documentos.idHistoria,
      idOrden: documentos.idOrden,
      idEvolucion: documentos.idEvolucion,
      idNotas: documentos.idsNotas,
      idEpicrisis: documentos.idEpicrisis
    };

    // También agregar las versiones con guión bajo para compatibilidad
    resultado.id_admision = documentos.idAdmision;
    resultado.id_historia = documentos.idHistoria;
    resultado.id_orden = documentos.idOrden;
    resultado.id_evolucion = documentos.idEvolucion;
    resultado.id_epicrisis = documentos.idEpicrisis;
    resultado.ids_notas = documentos.idsNotas;
    resultado.idNotasEnfermeria = documentos.idsNotas;
    resultado.evoluciones = [documentos.idEvolucion].filter(id => id);
    resultado.ordenes_medicas = [documentos.idOrden].filter(id => id);
    resultado.idsHistorias = [documentos.idHistoria].filter(id => id);
    resultado.idEgresos = [documentos.idEpicrisis].filter(id => id);
    resultado.idAnexosDos = [];
    resultado.idsAdmisiones = [documentos.idAdmision].filter(id => id);
    resultado.idsOrdenMedicas = [documentos.idOrden].filter(id => id);
    
    // Estructuras de facturación vacías por ahora
    resultado.facturasDetalle = [];
    resultado.facturasPorDocumento = {};

    return resultado;

  } catch (error) {
    console.error("ERROR en obtenerIdsConConsultaId:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * Función para el endpoint original de ConsultaIdSeguiminto
 */
const ConsultaIdSeguiminto = async (req, res) => {
  try {
    const numero = String(req.query.numero || "").trim();

    if (!numero) {
      return res.status(400).json({
        ok: false,
        msg: "Falta numero"
      });
    }

    const token = req.query.token || TOKEN;
    
    const resultado = await obtenerIdsConConsultaId({
      clave: numero,
      institucionId: req.query.institucionId,
      token
    });

    return res.json({
      ok: true,
      ...resultado
    });

  } catch (error) {
    console.error("ERROR en ConsultaIdSeguiminto:", error.message);

    return res.status(500).json({
      ok: false,
      msg: "Error consultando API",
      detalle: error.message
    });
  }
};

module.exports = { 
  ConsultaIdSeguiminto,
  obtenerIdsConConsultaId,
  limpiarNumero
};