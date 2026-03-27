const axios = require('axios');

/**
 * Consulta los IDs de las Notas de Enfermería basados en el documento/historia.
 * @param {string|number} documento - Número de documento o historia.
 * @param {string} token - Token dinámico para el header 'data'.
 */
const ConsultaIdNotaEnfermeria = async (documento, token) => {
    try {
        if (!documento || !token) {
            throw new Error('Los campos "documento" y "token" son requeridos');
        }

        const cookies = [
            '_ga=GA1.1.1028655100.1772306648',
            '_clck=14vh75i%5E2%5Eg4k%5E0%5E2250'
        ];

        const headers = {
            'authority': 'balance.saludplus.co',
            'accept': 'application/json, text/javascript, */*; q=0.01',
            'accept-language': 'es-419,es;q=0.9,en;q=0.8',
            'cache': 'true',
            'data': token, // Token dinámico inyectado
            'origin': 'https://balance.saludplus.co',
            'referer': 'https://balance.saludplus.co/instituciones/',
            'x-requested-with': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': cookies.join('; ')
        };

        const bodyData = new URLSearchParams({
            'sEcho': '4',
            'iColumns': '7',
            'sColumns': ',HISTORIA,NOMBRE,FECHA,HORA,USUARIO,ESTADO',
            'iDisplayStart': '0',
            'iDisplayLength': '10',
            'sSearch': documento.toString(),
            'iSortingCols': '1',
            'iSortCol_0': '0',
            'sSortDir_0': 'asc'
        });

        const response = await axios({
            method: 'POST',
            url: 'https://balance.saludplus.co/notasEnfermeria/BucardorNotasEnfermeriaDatos',
            params: {
                fechaInicial: '01/01/2024',
                fechaFinal: '12/31/2026'
            },
            headers: headers,
            data: bodyData.toString(),
            timeout: 30000
        });

        if (response.data && response.data.aaData && response.data.aaData.length > 0) {
            // Filtramos todos los registros que coincidan con el documento
            const registrosEncontrados = response.data.aaData.filter(nota => 
                nota[1] && nota[1].toString() === documento.toString()
            );
            
            if (registrosEncontrados.length > 0) {
                // Mapeamos para obtener solo los IDs (columna [0])
                const idsNotas = registrosEncontrados.map(nota => nota[0]);
                
                return {
                    documento: documento,
                    totalNotas: idsNotas.length,
                    ids: idsNotas // Retorna lista de IDs encontrados
                };
            } else {
                throw new Error(`No se encontraron notas de enfermería para el documento: ${documento}`);
            }
        } else {
            throw new Error('La consulta de notas de enfermería no devolvió resultados');
        }

    } catch (error) {
        const errorMsg = error.response ? `Error API Notas (${error.response.status})` : error.message;
        console.error('Error en ConsultaIdNotaEnfermeria:', errorMsg);
        throw new Error(errorMsg);
    }
};

module.exports = { ConsultaIdNotaEnfermeria };