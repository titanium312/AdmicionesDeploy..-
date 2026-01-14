const axios = require("axios");
const unzipper = require("unzipper");
const { pipeline } = require("stream/promises");

// ⬇️ NO SE MODIFICA
const { ConsultaId } = require("./Base/consultaid");

/* =========================
   🧠 Helper: ejecutar ConsultaId internamente
========================= */
const ejecutarConsultaId = (sSearch, idInstitucion) =>
  new Promise((resolve, reject) => {
    const reqSim = {
      body: {
        sSearch,
        idInstitucion,
        include: ["facturas"],
      },
    };

    const resSim = {
      json: (data) => {
        if (data?.ok === false) {
          reject(data);
        } else {
          resolve(data);
        }
      },
      status: (code) => ({
        json: (err) => reject({ code, err }),
      }),
    };

    ConsultaId(reqSim, resSim);
  });

/* =========================
   🎯 CONTROLLER PRINCIPAL
========================= */
async function FacturaElectronica(req, res) {
  try {
    const { sSearch, idInstitucion } = req.query;

    /* =========================
       🔎 Validación inicial
    ========================= */
    if (!sSearch || !idInstitucion) {
      return res.status(400).json({
        ok: false,
        message: "Debe enviar sSearch e idInstitucion",
      });
    }

    /* =========================
       1️⃣ Ejecutar ConsultaId
    ========================= */
    const resultado = await ejecutarConsultaId(
      String(sSearch).trim(),
      Number(idInstitucion)
    );

    /* =========================
       2️⃣ Validación CRÍTICA
    ========================= */
    if (
      String(resultado?.numeroBusqueda).trim() !==
      String(sSearch).trim()
    ) {
      return res.status(409).json({
        ok: false,
        message:
          "El número buscado no coincide con el número confirmado",
      });
    }

    /* =========================
       3️⃣ Extraer ID de factura (CORREGIDO)
    ========================= */
    const facturas =
      resultado?.resultados?.ids?.factura;

    if (!Array.isArray(facturas) || facturas.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "No existen facturas para la admisión enviada",
        detalle:
          "ID de factura no encontrado en los resultados de la consulta",
      });
    }

    const idFactura = Number(facturas[0]);

    if (!idFactura || isNaN(idFactura) || idFactura <= 0) {
      return res.status(400).json({
        ok: false,
        message: "ID de factura inválido",
        detalle: `El ID de factura obtenido (${idFactura}) no es válido`,
      });
    }

    console.log(`✅ ID de factura encontrado: ${idFactura}`);

    /* =========================
       4️⃣ Obtener info del ZIP
    ========================= */
    const infoZip = await axios.get(
      `https://balance.saludplus.co/facturasAdministar/GetZipFile?IdFactura=${idFactura}`,
      { timeout: 15000 }
    );

    if (
      infoZip.data?.valorRetorno !== 1 ||
      !infoZip.data?.archivo
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "No se pudo obtener el archivo de la factura",
        detalle:
          "El servidor no devolvió información válida del ZIP",
      });
    }

    /* =========================
       5️⃣ Descargar ZIP
    ========================= */
    const zipResp = await axios.get(
      infoZip.data.archivo,
      {
        responseType: "arraybuffer",
        timeout: 20000,
      }
    );

    const zip = await unzipper.Open.buffer(zipResp.data);

    const pdf = zip.files.find((f) =>
      f.path.toLowerCase().endsWith(".pdf")
    );

    if (!pdf) {
      return res.status(400).json({
        ok: false,
        message: "El ZIP no contiene un PDF",
        detalle:
          "El archivo comprimido no incluye documentos PDF",
      });
    }

    /* =========================
       6️⃣ Enviar PDF
    ========================= */
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="factura_${idFactura}.pdf"`
    );

    await pipeline(pdf.stream(), res);
  } catch (error) {
    console.error("❌ FacturaElectronica:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        ok: false,
        message: "Error descargando la factura",
        detalle:
          error?.err ||
          error?.message ||
          "Error desconocido",
      });
    }
  }
}

module.exports = { FacturaElectronica };
