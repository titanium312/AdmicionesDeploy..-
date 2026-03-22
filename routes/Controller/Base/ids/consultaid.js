const { ConsultaIdEgreso } = require('./IdsIduales/ConsultaIdEgreso');
const { ConsultaIdEvolucion } = require('./IdsIduales/ConsultaIdEvolucion');
const { ConsultaIdHistoria } = require('./IdsIduales/ConsultaIdHistoria');
const { ConsultaIdNotaEnfermeria } = require('./IdsIduales/ConsultaIdNotaEnfermeria');
const { ConsultaIdOrdenMedicas } = require('./IdsIduales/ConsultaidsOrdenMedicas');

// Endpoint unificado
const consultaid = async (req, res) => {
    try {
        const { documento } = req.body;
        
        if (!documento) {
            return res.status(400).json({
                ok: false,
                message: 'El campo "documento" es requerido'
            });
        }
        
        // Llamar todas las funciones en paralelo
        const [idEgreso, idEvolucion, idHistoria, notasInfo, idOrden] = await Promise.all([
            ConsultaIdEgreso(documento).catch(err => null),
            ConsultaIdEvolucion(documento).catch(err => null),
            ConsultaIdHistoria(documento).catch(err => null),
            ConsultaIdNotaEnfermeria(documento).catch(err => null),
            ConsultaIdOrdenMedicas(documento).catch(err => null)
        ]);
        
        const resultado = {
            ok: true,
            idHistoria: null,
            idOrden: null,
            idEvolucion: null,
            idNotas: [],
            idEgresos: []
        };
        
        if (idHistoria) resultado.idHistoria = idHistoria;
        if (idEvolucion) resultado.idEvolucion = idEvolucion;
        if (idOrden) resultado.idOrden = idOrden;
        if (idEgreso) resultado.idEgresos = Array.isArray(idEgreso) ? idEgreso : [idEgreso];
        
        // Procesar notas de enfermería
        if (notasInfo && notasInfo.notas) {
            resultado.idNotas = notasInfo.notas.map(nota => nota.idNotaEnfermeria);
        }
        
        return res.status(200).json(resultado);
        
    } catch (error) {
        return res.status(500).json({
            ok: false,
            message: error.message
        });
    }
};

module.exports = { consultaid };