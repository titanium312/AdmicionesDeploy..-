const { ConsultaIdAdmision } = require('./IdsIduales/ConsultaIdadmicion');
const { ConsultaIdFactura } = require('./IdsIduales/ConsultaIdFactura');
const { ConsultaIdSeguimiento } = require('./consultaidSeguimiento');
const { consultaid } = require('./consultaid');

const ConsultaIdIntermedio = async (req, res) => {
    try {
        const { documento } = req.body;
        
        if (!documento) {
            return res.status(400).json({
                ok: false,
                message: 'El campo "documento" es requerido'
            });
        }
        
        // Obtener todos los datos
        const idAdmision = await ConsultaIdAdmision(documento).catch(err => null);
        const facturaInfo = await ConsultaIdFactura(documento).catch(err => null);
        
        // Obtener seguimiento usando idAdmision
        let seguimientoInfo = null;
        if (idAdmision) {
            seguimientoInfo = await ConsultaIdSeguimiento(idAdmision).catch(err => null);
        }
        
        // Obtener los demás IDs de consultaid
        let consultaidInfo = null;
        if (documento) {
            try {
                const mockReq = { body: { documento } };
                const mockRes = {
                    status: (code) => ({
                        json: (data) => data
                    })
                };
                consultaidInfo = await consultaid(mockReq, mockRes);
            } catch (err) {
                console.log('Error en consultaid:', err.message);
            }
        }
        
        // Combinar IDs de ambas fuentes
        const resultado = {
            ok: true,
            numeroAdmision: idAdmision ? '20' + idAdmision : null,
            idAdmision: idAdmision,
            idHistoria: consultaidInfo?.idHistoria || seguimientoInfo?.idHistoria || null,
            idOrden: consultaidInfo?.idOrden || seguimientoInfo?.idOrden || null,
            idEvolucion: consultaidInfo?.idEvolucion || seguimientoInfo?.idEvolucion || null,
            idNotas: [...new Set([...(consultaidInfo?.idNotas || []), ...(seguimientoInfo?.idNotas || [])])],
            numeroFactura: facturaInfo?.numeroFactura || null,
            idFactura: facturaInfo?.idFactura || null,
            idEgresos: [...new Set([...(consultaidInfo?.idEgresos || []), ...(seguimientoInfo?.idEgresos || [])])],
            idAnexosDos: []
        };
        
        return res.status(200).json(resultado);
        
    } catch (error) {
        console.error('Error en ConsultaIdIntermedio:', error);
        return res.status(500).json({
            ok: false,
            message: error.message
        });
    }
};

module.exports = { 
    ConsultaIdIntermedio
};