const fetch = require("node-fetch");
const token = require("../otro/LABORATORIO/herramientas/token");

async function ConsultaId(req, res) {
  try {
    const authToken = token.getToken();

    const url = "https://api.saludplus.co/api/anexoUrgencia/ListadoAnexos" +
      "?pageSize=30" +
      "&pageNumber=1" +
      "&properties=numeroAdmision,documento,nombre1Paciente,nombre2Paciente,apellido1Paciente,apellido2Paciente,fecha" +
      "&filter=191731" +
      "&filterAudit=3";

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${authToken}`,
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: true,
        message: "Error consultando la API"
      });
    }

    const data = await response.json();

    // 👉 Solo nos interesa el primer resultado
    if (!data.result || data.result.length === 0) {
      return res.json({
        id: null,
        numeroAdmision: null
      });
    }

    const { id, numeroAdmision } = data.result[0];

return res.json({
  idanexo: id,
  numeroAdmision
});

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: true,
      message: "Error interno",
      detalle: error.message
    });
  }
}

module.exports = ConsultaId;
