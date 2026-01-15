const axios = require("axios");
const unzipper = require("unzipper");
const { pipeline } = require("stream/promises");
const { buscarFactura } = require("../Controller/Base/ids/buscarIdFactura"); // AJUSTA la ruta si es necesario

async function FacturaElectronica(req, res) {
  try {
    console.log("=== Inicio FacturaElectronica ===");

    const { numeroAdmision, idInstitucion } = req.query; // también puedes usar req.body
    console.log("Parametros recibidos:", { numeroAdmision, idInstitucion });

    // 1. Validación básica
    if (!numeroAdmision || !idInstitucion) {
      console.log("❌ Faltan parámetros requeridos");
      return res.status(400).json({
        ok: false,
        message: "Faltan parámetros requeridos: numeroAdmision e idInstitucion",
      });
    }

    // 2. Buscar el id interno de la factura usando buscarFactura
    console.log("🔍 Buscando ID interno de la factura...");
    const resultadoBusqueda = await new Promise((resolve) => {
      const fakeReq = {
        body: {
          sSearch: numeroAdmision.toString(),   // buscamos por número de admisión
          idInstitucion: Number(idInstitucion),
        },
      };

      const fakeRes = {
        json: (data) => {
          console.log("✅ Resultado de buscarFactura:", data);
          resolve(data);
        },
        status: (code) => ({
          json: (data) => {
            console.log(`⚠️ Resultado de buscarFactura con status ${code}:`, data);
            resolve({ ...data, statusCode: code });
          },
        }),
      };

      buscarFactura(fakeReq, fakeRes);
    });

    if (resultadoBusqueda?.error || !resultadoBusqueda?.id) {
      console.log("❌ No se encontró factura");
      return res.status(400).json({
        ok: false,
        message: resultadoBusqueda?.error || "No se encontró la factura",
      });
    }

    const idInterno = resultadoBusqueda.id;
    console.log(`✔️ Factura encontrada → ID interno: ${idInterno}`);

    // 3. Obtener información del archivo ZIP
    console.log("📦 Solicitando info del ZIP...");
    const infoZip = await axios.get(
      `https://balance.saludplus.co/facturasAdministar/GetZipFile?IdFactura=${idInterno}`,
      { timeout: 15000 }
    );
    console.log("✅ Info ZIP recibida:", infoZip.data);

    if (infoZip.data?.valorRetorno !== 1 || !infoZip.data?.archivo) {
      console.log("❌ No se obtuvo archivo ZIP válido");
      return res.status(400).json({
        ok: false,
        message: "El servidor no devolvió el archivo ZIP de la factura",
      });
    }

    // 4. Descargar el ZIP
    console.log("⬇️ Descargando archivo ZIP...");
    const zipResponse = await axios.get(infoZip.data.archivo, {
      responseType: "arraybuffer",
      timeout: 20000,
    });
    console.log("✅ ZIP descargado, tamaño:", zipResponse.data.byteLength, "bytes");

    // 5. Procesar ZIP
    console.log("🔓 Abriendo ZIP...");
    const zip = await unzipper.Open.buffer(zipResponse.data);

    const pdfFile = zip.files.find((file) => file.path.toLowerCase().endsWith(".pdf"));
    if (!pdfFile) {
      console.log("❌ PDF no encontrado en el ZIP");
      return res.status(400).json({
        ok: false,
        message: "No se encontró archivo PDF dentro del ZIP",
      });
    }
    console.log(`✔️ PDF encontrado → ${pdfFile.path}`);

    // 6. Enviar PDF al cliente
    console.log("📤 Enviando PDF al cliente...");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="FE_${numeroAdmision}_${idInstitucion}.pdf"` // <-- CORREGIDO
    );

    await pipeline(pdfFile.stream(), res);
    console.log("✅ PDF enviado correctamente");

  } catch (error) {
    console.error("❌ Error al obtener factura electrónica:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        ok: false,
        message: "Error al procesar la factura electrónica",
        error: error.message,
      });
    }
  }
}

module.exports = {
  FacturaElectronica,
};
