const { ConsultaIdEgreso } = require('./IdsIduales/ConsultaIdEgreso');
const { ConsultaIdEvolucion } = require('./IdsIduales/ConsultaIdEvolucion');
const { ConsultaIdHistoria } = require('./IdsIduales/ConsultaIdHistoria');
const { ConsultaIdNotaEnfermeria } = require('./IdsIduales/ConsultaIdNotaEnfermeria');
const { ConsultaIdOrdenMedicas } = require('./IdsIduales/ConsultaidsOrdenMedicas');

/**
 * Endpoint unificado para consolidar todos los IDs de un paciente.
 * Recibe directamente documento y token.
 */
const consultaid = async (req, res) => {
    try {
        // Pedimos directamente el token en el body
        const { documento, token } = req.body;
        
        if (!documento || !token) {
            return res.status(400).json({
                ok: false,
                message: 'Los campos "documento" y "token" son requeridos'
            });
        }
        
        console.log(`Ejecutando búsqueda masiva para Doc: ${documento}`);

        // 1. Llamar todas las funciones en paralelo pasando el token recibido
        const [idEgreso, idEvolucion, idHistoria, notasInfo, idOrden] = await Promise.all([
            ConsultaIdEgreso(documento, token).catch(err => { console.error('Error Egreso:', err.message); return null; }),
            ConsultaIdEvolucion(documento, token).catch(err => { console.error('Error Evolucion:', err.message); return null; }),
            ConsultaIdHistoria(documento, token).catch(err => { console.error('Error Historia:', err.message); return null; }),
            ConsultaIdNotaEnfermeria(documento, token).catch(err => { console.error('Error Notas:', err.message); return null; }),
            ConsultaIdOrdenMedicas(documento, token).catch(err => { console.error('Error Orden:', err.message); return null; })
        ]);
        
        // 2. Estructurar el resultado final consolidado
        const resultado = {
            ok: true,
            idHistoria: idHistoria || null,
            idOrden: idOrden || null,
            idEvolucion: idEvolucion || null,
            idNotas: [],
            idEgresos: []
        };
        
        // Procesar Egresos
        if (idEgreso) {
            resultado.idEgresos = Array.isArray(idEgreso) ? idEgreso : [idEgreso];
        }
        
        // Procesar Notas de Enfermería
        if (notasInfo && notasInfo.ids) {
            resultado.idNotas = notasInfo.ids;
        } else if (notasInfo && notasInfo.notas) {
            // Compatibilidad con versiones anteriores que devolvían .notas
            resultado.idNotas = notasInfo.notas.map(n => n.idNotaEnfermeria);
        }
        
        // 3. Verificación de contenido
        const tieneResultados = resultado.idHistoria || 
                               resultado.idOrden || 
                               resultado.idEvolucion || 
                               resultado.idNotas.length > 0 || 
                               resultado.idEgresos.length > 0;
        
        if (!tieneResultados) {
            return res.status(404).json({
                ok: false,
                message: 'No se encontró ninguna información para este documento con el token proporcionado'
            });
        }

        return res.status(200).json(resultado);
        
    } catch (error) {
        console.error('Error crítico en consultaid:', error.message);
        return res.status(500).json({
            ok: false,
            message: 'Error interno al procesar los IDs'
        });
    }
};

module.exports = { consultaid };