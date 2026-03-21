// Archivo: Base/consultaidSeguimiento.js

const axios = require("axios");

/* ========= LIMPIAR NUMERO ========= */
const limpiarNumero = (texto) => {
  return texto
    .split("-")[0]  // Esto extrae solo la parte antes del guión
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

    /* ========= 1. BUSCAR EN FACTURAS ========= */
    // Calcular fechas (últimos 2 años o desde 2024)
    const fechaInicial = "01/01/2024";
    const fechaFinal = "03/21/2026";
    
    const buscar = await axios.post(
      `https://balance.saludplus.co/facturasAdministar/BuscarListadofacturasDatos?fechaInicial=${fechaInicial}&fechaFinal=${fechaFinal}&idEntidad=0&idContrato=0&SinNumero=False&duplicadas=False&idCuentaCobro=0&estadoFacturacionElectronica=0`,
      `sEcho=6&iColumns=8&iDisplayStart=0&iDisplayLength=10&sSearch=${numero}`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "accept": "application/json, text/javascript, */*; q=0.01",
          "x-requested-with": "XMLHttpRequest",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "data": token,
          "origin": "https://balance.saludplus.co",
          "referer": "https://balance.saludplus.co/instituciones/?origen=1&theme=false"
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
    let idFactura = null;

    for (const row of data.aaData) {
      // row[2] contiene el número de admisión con formato "191177 - FEH28947"
      const numeroCompleto = row[2] || "";
      const numeroLimpio = limpiarNumero(numeroCompleto);
      
      // También buscar en row[1] que puede tener solo el número
      const numeroSimple = row[1] ? limpiarNumero(row[1]) : "";

      if (numeroLimpio === numero || numeroSimple === numero) {
        matchRow = row;
        numeroAdmisionEncontrado = numeroLimpio;
        idFactura = row[0]; // ID de factura
        break;
      }
    }

    if (!matchRow) {
      throw new Error(`No se encontró coincidencia exacta para el número: ${numero}`);
    }

    // Ahora necesitas obtener el idAdmision real desde otro endpoint
    // Podrías usar el idFactura para consultar más detalles
    
    // Temporal: usando el idFactura como idAdmision o necesitas otra consulta
    const idAdmision = idFactura; // Esto podría ser incorrecto, necesitas mapear correctamente

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
      idEpicrisis: documentos.idEpicrisis,
      idFactura: idFactura, // Agregar el ID de factura encontrado
      facturaInfo: matchRow ? {
        id: matchRow[0],
        numero: matchRow[1],
        descripcion: matchRow[2],
        fecha: matchRow[3],
        paciente: matchRow[5],
        entidad: matchRow[6]
      } : null
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