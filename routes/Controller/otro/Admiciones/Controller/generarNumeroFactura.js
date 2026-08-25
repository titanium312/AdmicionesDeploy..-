const axios = require('axios');
const { instituciones, usuariosInstitucion } = require("../../../Base/Instituciones");

/**
 * Endpoint para generar número de factura (o consultar numeración)
 * Se usa GET con parámetros en query string.
 * Ejemplo de llamada:
 *   GET /api/ad/GenerarNumeroFactura?idFacturas=123&Idinstitucion=20&numeroFactura=FAC-001
 */
async function NumeroFactura(req, res) {
  try {
    // 1. Obtener parámetros desde la query string
    const { idFacturas, numeroFactura = '', Idinstitucion } = req.query;

    // 2. Validaciones
    if (!idFacturas) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El parámetro idFacturas es requerido'
      });
    }

    if (!Idinstitucion) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El parámetro Idinstitucion es requerido'
      });
    }

    // Convertir a número para comparar
    const idInst = Number(Idinstitucion);
    if (isNaN(idInst)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Idinstitucion debe ser un número válido'
      });
    }

    // 3. Buscar la institución en el arreglo 'instituciones'
    const institucion = instituciones.find(
      (inst) => String(inst.idInstitucion) === String(idInst)
    );

    if (!institucion) {
      return res.status(404).json({
        ok: false,
        mensaje: `Institución con id ${idInst} no encontrada`
      });
    }

    // 4. Obtener un token (Tksesicion) válido para esta institución
    //    Tomamos el primer usuario que pertenezca a la institución.
    //    Si necesitas un usuario específico, puedes recibir también idUsuario en la query.
    const usuario = usuariosInstitucion.find(
      (u) => String(u.idInstitucion) === String(idInst)
    );

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        mensaje: `No se encontró un usuario con token para la institución ${idInst}`
      });
    }

    const Tksesicion = usuario.Tksesicion;

    // 5. Construir la URL y headers
    const url = 'https://balance.saludplus.co/facturasAdministar/Numerarfacturas';

    const headers = {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Referer': 'https://balance.saludplus.co/instituciones/?origen=1',
      'data': Tksesicion  // Token extraído de usuariosInstitucion
    };

    // 6. Hacer la petición GET a la API externa
    const response = await axios.get(url, {
      headers,
      params: {
        idFacturas: idFacturas.toString().trim(),
        numeroFactura: numeroFactura.toString().trim()
      },
      timeout: 10000  // 10 segundos
    });

    // 7. Responder con éxito
    return res.json({
      ok: true,
      institucion: institucion.nombre,
      idInstitucion: idInst,
      resultado: response.data
    });

  } catch (error) {
    // 8. Manejo de errores
    console.error('Error en NumeroFactura:', {
      mensaje: error.message,
      response: error.response?.data,
      status: error.response?.status
    });

    // Si la API externa respondió con un error, lo devolvemos
    if (error.response) {
      return res.status(error.response.status || 500).json({
        ok: false,
        mensaje: 'Error al consultar el servicio de numeración',
        backend: error.response.data
      });
    }

    // Error de red o timeout
    return res.status(500).json({
      ok: false,
      mensaje: 'Error interno del servidor al generar número de factura',
      error: error.message
    });
  }
}

module.exports = { NumeroFactura };