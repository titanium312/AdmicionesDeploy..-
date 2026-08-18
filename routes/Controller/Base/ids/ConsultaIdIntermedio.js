const { usuariosInstitucion, instituciones } = require('../Instituciones');
const { ConsultaIdAdmision } = require('./IdsIduales/ConsultaIdadmicion');
const { ConsultaIdFactura } = require('./IdsIduales/ConsultaIdFactura');
const { ConsultaIdSeguimiento } = require('./consultaidSeguimiento');
const { consultaid } = require('./consultaid');

/**
 * Función interna para cruzar idUsuario con Tksesicion
 * Ahora toma el token directamente del usuario
 */
const obtenerTokenLocal = (idUsuario) => {
    const usuario = usuariosInstitucion.find(u => u.idUsuario === Number(idUsuario));
    if (!usuario) {
        console.log(`❌ Usuario ${idUsuario} no encontrado`);
        return null;
    }
    
    console.log(`✅ Usuario encontrado: ${usuario.nombre} (ID: ${usuario.idUsuario})`);
    console.log(`✅ Token: ${usuario.Tksesicion ? 'Presente ✓' : 'Ausente ✗'}`);
    
    return usuario.Tksesicion || null;
};


const ConsultaIdIntermedio = async (req, res) => {
    try {
        const { documento, id_usuario } = req.body;
        
        if (!documento || !id_usuario) {
            return res.status(400).json({
                ok: false,
                message: 'Los campos "documento" e "id_usuario" son requeridos'
            });
        }

        // 1. Obtener el token desde tus constantes importadas
        const token = obtenerTokenLocal(id_usuario);

        if (!token) {
            return res.status(401).json({
                ok: false,
                message: `No se encontró token para el usuario ${id_usuario}`
            });
        }
        
        console.log(`Iniciando búsqueda para Doc: ${documento} (Token: ${token.substring(0,15)}...)`);

        // 2. Ejecutar búsquedas base (Admisión y Factura)
        const idAdmision = await ConsultaIdAdmision(documento, token).catch(() => null);
        const facturaInfo = await ConsultaIdFactura(documento, token).catch(() => null);
        
        // 3. Ejecutar seguimiento si hay admisión
        let seguimientoInfo = null;
        if (idAdmision) {
            seguimientoInfo = await ConsultaIdSeguimiento(idAdmision, token).catch(() => null);
        }
        
        // 4. Llamar a consultaid (el que busca en tablas individuales)
        let consultaidInfo = null;
        try {
            const mockReq = { body: { documento, token } };
            const mockRes = { status: () => ({ json: (data) => data }) };
            consultaidInfo = await consultaid(mockReq, mockRes);
        } catch (err) {
            console.error('Error en consultaid:', err.message);
        }
        
        // 5. Consolidar resultados finales eliminando duplicados
        const resultado = {
            ok: true,
            id_usuario: id_usuario,
            idAdmision: idAdmision,
            numeroAdmision: idAdmision ? '20' + idAdmision : null,
            idHistoria: consultaidInfo?.idHistoria || seguimientoInfo?.idHistoria || null,
            idOrden: consultaidInfo?.idOrden || seguimientoInfo?.idOrden || null,
            idEvolucion: consultaidInfo?.idEvolucion || seguimientoInfo?.idEvolucion || null,
            
            // Unir notas de ambas fuentes y quitar repetidos
            idNotas: [...new Set([
                ...(consultaidInfo?.idNotas || []), 
                ...(seguimientoInfo?.idNotas || [])
            ])],
            
            // Datos de factura
            numeroFactura: facturaInfo?.numeroFactura || null,
            idFactura: facturaInfo?.idFactura || null,
            
            // Unir egresos/epicrisis
            idEgresos: [...new Set([
                ...(consultaidInfo?.idEgresos || []), 
                ...(seguimientoInfo?.idEgresos || [])
            ])],
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

module.exports = { ConsultaIdIntermedio };