const axios = require("axios");
const { instituciones } = require("../../Base/Instituciones");

const buscarFactura = async (req, res) => {
  try {
    const { numero, idInstitucion } = req.query;

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

    // 🔥 Buscar institución
    const institucion = instituciones.find(
      (inst) => inst.idInstitucion == idInstitucion
    );

    if (!institucion) {
      return res.status(404).json({
        ok: false,
        mensaje: "Institución no encontrada"
      });
    }

    const Tksesicion = institucion.Tksesicion;

    // 🔥 generar fecha de hoy en formato MM/DD/YYYY
    const hoy = new Date();
    const fechaHoy = `${String(hoy.getMonth() + 1).padStart(2, "0")}/${String(
      hoy.getDate()
    ).padStart(2, "0")}/${hoy.getFullYear()}`;

    // 🔥 función para consultar
    const consultar = async (SinNumero) => {
      const response = await axios({
        method: "POST",
        url: "https://balance.saludplus.co/facturasAdministar/BuscarListadofacturasDatos",
        headers: {
          "data": Tksesicion
        },
        data: new URLSearchParams({
          fechaInicial: "01/01/2020",
          fechaFinal: fechaHoy, // ✅ dinámica
          idEntidad: "0",
          idContrato: "0",
          SinNumero: SinNumero,
          duplicadas: "False",
          idCuentaCobro: "0",
          estadoFacturacionElectronica: "0",

          sEcho: "2",
          iColumns: "8",
          sColumns: ",CHECK,NUMERO,FECHA,RESOLUCION,PACIENTE,ENTIDAD,ESTADO",
          iDisplayStart: "0",
          iDisplayLength: "10",

          sSearch: numero,

          iSortingCols: "1",
          iSortCol_0: "0",
          sSortDir_0: "asc"
        })
      });

      const data = response.data;

      if (!data.aaData || data.aaData.length === 0) return null;

      return data.aaData.find(f =>
        f[2].split("-")[0].trim() === numero
      );
    };

    // 🔥 intento 1
    let factura = await consultar("False");

    // 🔥 intento 2
    if (!factura) {
      factura = await consultar("True");
    }

    if (!factura) {
      return res.json({
        ok: false,
        mensaje: "No se encontró la factura en ningún modo"
      });
    }

    return res.json({
      ok: true,
      idFactura: factura[0]
    });

  } catch (error) {
    console.error("ERROR:", error.response?.data || error.message);

    return res.status(500).json({
      ok: false,
      error: "Error consultando factura"
    });
  }
};

module.exports = { buscarFactura };