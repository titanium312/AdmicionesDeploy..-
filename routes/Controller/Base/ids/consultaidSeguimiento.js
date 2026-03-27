const axios = require('axios');

/**
 * Consulta los IDs de seguimiento para una admisión específica mediante el calendario.
 * @param {string|number} idAdmision - ID de la admisión a consultar.
 * @param {string} token - Token de sesión (PHPSESSID o header data).
 */
const ConsultaIdSeguimiento = async (idAdmision, token) => {
    try {
        if (!idAdmision || !token) {
            throw new Error('Los campos "idAdmision" y "token" son requeridos');
        }

        // En SaludPlus, a veces el token se requiere en la cookie PHPSESSID 
        // y otras veces en el header 'data'. Aquí cubrimos ambos.
        const cookies = [
            `PHPSESSID=${token}`, 
            '_ga=GA1.1.1028655100.1772306648',
            '_clck=14vh75i%5E2%5Eg4k%5E0%5E2250'
        ];

        const headers = {
            'authority': 'balance.saludplus.co',
            'accept': '*/*',
            'accept-language': 'es-419,es;q=0.9,en;q=0.8',
            'referer': 'https://balance.saludplus.co/instituciones/',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
            'x-requested-with': 'XMLHttpRequest',
            'data': token, // Añadido por consistencia con tus otros módulos
            'Cookie': cookies.join('; ')
        };

        const response = await axios({
            method: 'GET',
            url: `https://balance.saludplus.co/seguimientoDocumentos/BuscadorCalendario?idAdmision=${idAdmision}`,
            headers: headers,
            timeout: 30000
        });

        const htmlContent = response.data;
        
        // Regex mejorada para capturar IDs y Tipos de Documentos en el JS embebido
        const idPattern = /id:\s*(\d+)/g;
        const documentoPattern = /documento\s*:\s*'([^']*)'/g;
        
        const ids = [];
        const tipos = [];
        let match;
        
        // Extraer todos los IDs
        while ((match = idPattern.exec(htmlContent)) !== null) {
            ids.push(match[1]);
        }
        
        // Extraer todos los tipos de documento
        while ((match = documentoPattern.exec(htmlContent)) !== null) {
            tipos.push(match[1]);
        }
        
        const resultado = {
            idAdmision: idAdmision,
            idHistoria: null,
            idOrden: null,
            idEvolucion: null,
            idNotas: [],
            idEgresos: [],
            otros: [] // Para capturar tipos no mapeados
        };
        
        // Mapeo inteligente de resultados
        ids.forEach((id, index) => {
            const tipoOriginal = tipos[index] || '';
            const tipo = tipoOriginal.toLowerCase();

            if (tipo.includes('historia')) {
                resultado.idHistoria = id;
            } else if (tipo.includes('orden')) {
                resultado.idOrden = id;
            } else if (tipo.includes('evolucion')) {
                resultado.idEvolucion = id;
            } else if (tipo.includes('nota') || tipo.includes('enfermeria')) {
                if (!resultado.idNotas.includes(id)) resultado.idNotas.push(id);
            } else if (tipo.includes('egreso') || tipo.includes('epicrisis')) {
                if (!resultado.idEgresos.includes(id)) resultado.idEgresos.push(id);
            } else {
                resultado.otros.push({ id, tipo: tipoOriginal });
            }
        });
        
        return resultado;

    } catch (error) {
        const msg = error.response ? `Error API Seguimiento (${error.response.status})` : error.message;
        console.error('Error en ConsultaIdSeguimiento:', msg);
        throw new Error(msg);
    }
};

module.exports = { ConsultaIdSeguimiento };