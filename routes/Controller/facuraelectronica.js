const axios = require("axios");
const unzipper = require("unzipper");
const { pipeline } = require("stream/promises");
const { buscarFactura } = require("../Controller/Base/ids/buscarIdFactura");
// Importamos las instituciones para obtener el NIT
const { instituciones } = require("../Controller/Base/Instituciones"); 

async function FacturaElectronica(req, res) {
  try {
    console.log("=== Inicio FacturaElectronica ===");
    const { sSearch, numeroAdmision, idInstitucion } = req.query;
    const numeroBusqueda = sSearch || numeroAdmision;

    // 1. Validación básica
    if (!numeroBusqueda || !idInstitucion) {
      return res.status(400).json({
        ok: false,
        message: "Faltan parámetros requeridos: numeroAdmision e idInstitucion",
      });
    }

    // --- NUEVO: Obtener el NIT de la institución ---
    const infoInstitucion = instituciones.find(inst => inst.idInstitucion === Number(idInstitucion));
    const nitInstitucion = infoInstitucion ? infoInstitucion.nit : "000000000"; 
    // -----------------------------------------------

    // 2. Buscar el id interno de la factura
    const resultadoBusqueda = await new Promise((resolve, reject) => {
      const fakeReq = {
        body: {
          sSearch: numeroBusqueda.toString(),
          idInstitucion: Number(idInstitucion),
        },
      };

      const fakeRes = {
        json: (data) => resolve(data),
        status: (code) => ({ json: (data) => resolve({ ...data, statusCode: code }) }),
      };

      buscarFactura(fakeReq, fakeRes);
    });

    if (resultadoBusqueda?.error || !resultadoBusqueda?.id) {
      return res.status(404).json({
        ok: false,
        message: `No se encontró factura con número ${numeroBusqueda}`,
      });
    }

    const idInterno = resultadoBusqueda.id;

    // 3. Obtener información del archivo ZIP
    const infoZip = await axios.get(
      `https://balance.saludplus.co/facturasAdministar/GetZipFile?IdFactura=${idInterno}`,
      { timeout: 15000 }
    );

    if (infoZip.data?.valorRetorno !== 1 || !infoZip.data?.archivo) {
      return res.status(400).json({
        ok: false,
        message: "El servidor no devolvió el archivo ZIP de la factura",
      });
    }

    // 4. Descargar el ZIP
    const zipResponse = await axios.get(infoZip.data.archivo, {
      responseType: "arraybuffer",
      timeout: 30000
    });

    // 5. Procesar ZIP y buscar el PDF
    const zip = await unzipper.Open.buffer(zipResponse.data);
    const pdfFile = zip.files.find((file) => file.path.toLowerCase().endsWith(".pdf"));
    
    if (!pdfFile) {
      return res.status(400).json({
        ok: false,
        message: "No se encontró archivo PDF dentro del ZIP",
      });
    }

    // 6. Configurar nombre dinámico: FEV_NIT_NUMERO.pdf
    // Usamos el NIT obtenido y el número de búsqueda (o el número completo si viene en la respuesta)
    const nombreFinal = `FEV_${nitInstitucion}_${numeroBusqueda}.pdf`;
    console.log(`Genereando archivo: ${nombreFinal}`);

    // 7. Enviar PDF al cliente
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${nombreFinal}"`
    );
    res.setHeader("Content-Length", pdfFile.uncompressedSize);

    await pipeline(pdfFile.stream(), res);
    console.log("✅ PDF enviado correctamente");

  } catch (error) {
    console.error("❌ Error:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ ok: false, error: error.message });
    }
  }
}

module.exports = { FacturaElectronica };