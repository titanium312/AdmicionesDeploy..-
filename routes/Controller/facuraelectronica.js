const axios = require("axios");
const unzipper = require("unzipper");
const { pipeline } = require("stream/promises");
const { buscarFactura } = require("../Controller/Base/ids/buscarIdFactura");

async function FacturaElectronica(req, res) {
  try {
    console.log("=== Inicio FacturaElectronica ===");
    console.log("URL:", req.url);
    console.log("Query params:", req.query);
    console.log("Headers:", req.headers);

    // Aceptar tanto 'sSearch' como 'numeroAdmision' para compatibilidad
    const { sSearch, numeroAdmision, idInstitucion } = req.query;
    
    // Usar sSearch si está presente, sino usar numeroAdmision
    const numeroBusqueda = sSearch || numeroAdmision;
    
    console.log("Parámetros recibidos:", { 
      sSearch, 
      numeroAdmision, 
      numeroBusqueda,
      idInstitucion 
    });

    // 1. Validación básica
    if (!numeroBusqueda || !idInstitucion) {
      console.log("❌ Faltan parámetros requeridos");
      return res.status(400).json({
        ok: false,
        message: "Faltan parámetros requeridos. Use: sSearch (o numeroAdmision) e idInstitucion",
        ejemplo: "/facturaElectronica?sSearch=241816&idInstitucion=14"
      });
    }

    // 2. Buscar el id interno de la factura usando buscarFactura
    console.log("🔍 Buscando ID interno de la factura...");
    const resultadoBusqueda = await new Promise((resolve, reject) => {
      try {
        const fakeReq = {
          body: {
            sSearch: numeroBusqueda.toString(),   // Usar el número de búsqueda
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
      } catch (error) {
        reject(error);
      }
    });

    if (resultadoBusqueda?.error || !resultadoBusqueda?.id) {
      console.log("❌ No se encontró factura");
      console.log("Resultado completo:", resultadoBusqueda);
      
      return res.status(404).json({
        ok: false,
        message: resultadoBusqueda?.error || `No se encontró factura con número ${numeroBusqueda}`,
        numeroBuscado: numeroBusqueda,
        idInstitucion: idInstitucion
      });
    }

    const idInterno = resultadoBusqueda.id;
    console.log(`✔️ Factura encontrada → ID interno: ${idInterno}`);
    console.log(`📋 Número completo: ${resultadoBusqueda.numeroCompleto || 'N/A'}`);

    // 3. Obtener información del archivo ZIP
    console.log("📦 Solicitando info del ZIP...");
    const infoZip = await axios.get(
      `https://balance.saludplus.co/facturasAdministar/GetZipFile?IdFactura=${idInterno}`,
      { 
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );
    console.log("✅ Info ZIP recibida:", {
      valorRetorno: infoZip.data?.valorRetorno,
      tieneArchivo: !!infoZip.data?.archivo,
      archivo: infoZip.data?.archivo ? 'URL presente' : 'Sin URL'
    });

    if (infoZip.data?.valorRetorno !== 1 || !infoZip.data?.archivo) {
      console.log("❌ No se obtuvo archivo ZIP válido");
      return res.status(400).json({
        ok: false,
        message: "El servidor no devolvió el archivo ZIP de la factura",
        respuestaServidor: infoZip.data
      });
    }

    // 4. Descargar el ZIP
    console.log("⬇️ Descargando archivo ZIP desde:", infoZip.data.archivo);
    const zipResponse = await axios.get(infoZip.data.archivo, {
      responseType: "arraybuffer",
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*'
      }
    });
    console.log("✅ ZIP descargado, tamaño:", zipResponse.data.byteLength, "bytes");

    // 5. Procesar ZIP
    console.log("🔓 Abriendo ZIP...");
    const zip = await unzipper.Open.buffer(zipResponse.data);

    // Listar todos los archivos en el ZIP para debugging
    console.log("📁 Archivos en el ZIP:");
    zip.files.forEach((file, i) => {
      console.log(`  ${i + 1}. ${file.path} (${file.uncompressedSize} bytes)`);
    });

    const pdfFile = zip.files.find((file) => 
      file.path.toLowerCase().endsWith(".pdf")
    );
    
    if (!pdfFile) {
      console.log("❌ PDF no encontrado en el ZIP");
      return res.status(400).json({
        ok: false,
        message: "No se encontró archivo PDF dentro del ZIP",
        archivosEnZip: zip.files.map(f => f.path)
      });
    }
    console.log(`✔️ PDF encontrado → ${pdfFile.path} (${pdfFile.uncompressedSize} bytes)`);

    // 6. Verificar si el cliente acepta PDF
    const acceptHeader = req.headers.accept || '';
    console.log("📋 Accept header:", acceptHeader);
    
    // Si el cliente pide JSON (por ejemplo, en caso de error), devolver JSON
    if (acceptHeader.includes('application/json') && req.headersSent === false) {
      console.log("📄 Cliente solicitó JSON, devolviendo metadatos...");
      return res.json({
        ok: true,
        message: "Factura encontrada, lista para descargar",
        metadata: {
          numeroFactura: numeroBusqueda,
          idInstitucion: idInstitucion,
          idInterno: idInterno,
          numeroCompleto: resultadoBusqueda.numeroCompleto,
          pdfNombre: pdfFile.path,
          pdfTamanio: pdfFile.uncompressedSize,
          urlDescarga: `/facturaElectronica?sSearch=${numeroBusqueda}&idInstitucion=${idInstitucion}&descargar=true`
        }
      });
    }

    // 7. Enviar PDF al cliente
    console.log("📤 Enviando PDF al cliente...");
    
    // Nombre del archivo (extraer del path o usar genérico)
    const nombreArchivo = pdfFile.path.split('/').pop() || 
                         `FE_${numeroBusqueda}_${idInstitucion}.pdf`;
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${nombreArchivo}"`
    );
    res.setHeader("Content-Length", pdfFile.uncompressedSize);
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Pragma", "no-cache");

    await pipeline(pdfFile.stream(), res);
    console.log("✅ PDF enviado correctamente");

  } catch (error) {
    console.error("❌ Error al obtener factura electrónica:");
    console.error("Mensaje:", error.message);
    console.error("Code:", error.code);
    console.error("Stack:", error.stack);
    
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }

    if (!res.headersSent) {
      // Verificar si el cliente espera JSON
      const acceptHeader = req.headers.accept || '';
      if (acceptHeader.includes('application/json')) {
        return res.status(500).json({
          ok: false,
          message: "Error al procesar la factura electrónica",
          error: error.message,
          code: error.code
        });
      } else {
        // Si no especifica, devolver error simple en texto
        return res.status(500).send(`Error: ${error.message}`);
      }
    }
  }
}

module.exports = {
  FacturaElectronica,
};