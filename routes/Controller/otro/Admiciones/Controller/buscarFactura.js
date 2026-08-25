const axios = require("axios");
const { instituciones, usuariosInstitucion } = require("../../../Base/Instituciones");

const buscarFactura = async (req, res) => {
  try {
    // 1. Obtener parámetros desde la query string (ej: ?numero=FAC-001&idInstitucion=20)
    const { numero, idInstitucion } = req.query;

    // 2. Validaciones básicas
    if (!numero) {
      return res.status(400).json({
        ok: false,
        mensaje: "Debes enviar el número de factura"
      });
    }

    if (!idInstitucion) {
      return res.status(400).json({
        ok: false,
        mensaje: "Debes enviar el idInstitucion"
      });
    }

    // 3. Buscar la institución (usando string para comparar con seguridad)
    const institucion = instituciones.find(
      (inst) => String(inst.idInstitucion) === String(idInstitucion)
    );

    if (!institucion) {
      return res.status(404).json({
        ok: false,
        mensaje: "Institución no encontrada"
      });
    }

    // 4. Obtener un token válido para esta institución
    //    Tomamos el primer usuario que pertenezca a la institución.
    //    Si necesitas un usuario específico, podrías recibir también idUsuario en la query.
    const usuario = usuariosInstitucion.find(
      (u) => String(u.idInstitucion) === String(idInstitucion)
    );

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        mensaje: "No se encontró un usuario con token para esta institución"
      });
    }

    const Tksesicion = usuario.Tksesicion;

    // 5. Generar fecha de hoy en formato MM/DD/YYYY (requerido por la API externa)
    const hoy = new Date();
    const fechaHoy = `${String(hoy.getMonth() + 1).padStart(2, "0")}/${String(
      hoy.getDate()
    ).padStart(2, "0")}/${hoy.getFullYear()}`;

    // 6. Función interna para consultar la API externa
    const consultar = async (SinNumero) => {
      try {
        const response = await axios({
          method: "POST",
          url: "https://balance.saludplus.co/facturasAdministar/BuscarListadofacturasDatos",
          headers: {
            "data": Tksesicion   // El token va en la cabecera 'data'
          },
          data: new URLSearchParams({
            fechaInicial: "01/01/2020",
            fechaFinal: fechaHoy,
            idEntidad: "0",
            idContrato: "0",
            SinNumero: SinNumero,   // "False" o "True"
            duplicadas: "False",
            idCuentaCobro: "0",
            estadoFacturacionElectronica: "0",

            sEcho: "2",
            iColumns: "8",
            sColumns: ",CHECK,NUMERO,FECHA,RESOLUCION,PACIENTE,ENTIDAD,ESTADO",
            iDisplayStart: "0",
            iDisplayLength: "10",

            sSearch: numero,   // término de búsqueda

            iSortingCols: "1",
            iSortCol_0: "0",
            sSortDir_0: "asc"
          })
        });

        const data = response.data;

        // Si no hay datos, retornar null
        if (!data.aaData || data.aaData.length === 0) {
          return null;
        }

        // Buscar la fila que coincida exactamente con el número de factura
        // Se asume que la columna 2 (índice 2) contiene el número.
        // Ejemplo: "FAC-001" → dividimos por "-" y tomamos la primera parte.
        const facturaEncontrada = data.aaData.find(
          (fila) => fila[2]?.split("-")[0]?.trim() === numero
        );

        return facturaEncontrada || null;
      } catch (error) {
        // Si la API externa falla, lanzamos el error para que lo maneje el catch principal
        throw error;
      }
    };

    // 7. Intentar primero con SinNumero = "False", luego con "True"
    let factura = await consultar("False");

    if (!factura) {
      factura = await consultar("True");
    }

    // 8. Si no se encontró en ninguno de los modos
    if (!factura) {
      return res.status(404).json({
        ok: false,
        mensaje: "No se encontró la factura en ningún modo"
      });
    }

    // 9. Éxito: devolver el idFactura (primer elemento de la fila)
    return res.json({
      ok: true,
      idFactura: factura[0]   // El ID de la factura está en la columna 0
    });

  } catch (error) {
    // 10. Manejo de errores generales
    console.error("ERROR en buscarFactura:", {
      mensaje: error.message,
      respuesta: error.response?.data,
      status: error.response?.status
    });

    return res.status(500).json({
      ok: false,
      mensaje: "Error consultando factura",
      error: error.response?.data || error.message
    });
  }
};

module.exports = { buscarFactura };