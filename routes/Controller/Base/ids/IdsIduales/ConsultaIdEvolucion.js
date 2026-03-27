const axios = require('axios');

/**
 * Consulta el ID de evolución basado en el documento/admisión.
 * @param {string|number} documento - Documento o ID de admisión a buscar.
 * @param {string} token - Token dinámico para el header 'data'.
 */
const ConsultaIdEvolucion = async (documento, token) => {
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
            'data': token, // Token dinámico inyectado aquí
            'origin': 'https://balance.saludplus.co',
            'referer': 'https://balance.saludplus.co/instituciones/',
            'x-requested-with': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': cookies.join('; ')
        };

        const bodyData = new URLSearchParams({
            'sEcho': '2',
            'iColumns': '7',
            'sColumns': ',ADMISION,NOMBRE,FECHA,HORA,ELABORO,ESTADO',
            'iDisplayStart': '0',
            'iDisplayLength': '10',
            'sSearch': documento.toString(),
            'iSortingCols': '1',
            'iSortCol_0': '0',
            'sSortDir_0': 'asc'
        });

        const response = await axios({
            method: 'POST',
            url: 'https://balance.saludplus.co/evoluciones/BucardorEvolucionesDatos',
            params: {
                fechaInicial: '01/01/2024',
                fechaFinal: '12/31/2026'
            },
            headers: headers,
            data: bodyData.toString(),
            timeout: 30000
        });

        if (response.data && response.data.aaData && response.data.aaData.length > 0) {
            // Buscamos el registro donde la columna 1 coincida con el documento buscado
            const registroEncontrado = response.data.aaData.find(evolucion => 
                evolucion[1] && evolucion[1].toString() === documento.toString()
            );
            
            if (registroEncontrado) {
                return registroEncontrado[0]; // Retorna el ID de la evolución
            } else {
                throw new Error(`Documento ${documento} no encontrado en la lista de evoluciones`);
            }
        } else {
            throw new Error('No se encontraron resultados en la tabla de evoluciones');
        }

    } catch (error) {
        const errorMsg = error.response ? `Error API Evoluciones (${error.response.status})` : error.message;
        console.error('Error en ConsultaIdEvolucion:', errorMsg);
        throw new Error(errorMsg);
    }
};

module.exports = { ConsultaIdEvolucion };