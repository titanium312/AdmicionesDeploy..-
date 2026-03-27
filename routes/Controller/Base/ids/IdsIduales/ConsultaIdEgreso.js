const axios = require('axios');

/**
 * Consulta el ID de egreso basado en el número de documento.
 * @param {string|number} documento - Documento del paciente.
 * @param {string} token - Token de sesión (valor para el header 'data').
 */
const ConsultaIdEgreso = async (documento, token) => {
    try {
        // Validación de campos requeridos
        if (!documento || !token) {
            throw new Error('Los campos "documento" y "token" son requeridos');
        }

        const cookies = [
            '_ga=GA1.1.1028655100.1772306648',
            '_clck=14vh75i%5E2%5Eg4k%5E0%5E2250',
            // PHPSESSID=... se podría añadir aquí si es necesario
        ];

        const headers = {
            'authority': 'balance.saludplus.co',
            'accept': 'application/json, text/javascript, */*; q=0.01',
            'accept-language': 'es-419,es;q=0.9,en;q=0.8',
            'cache': 'true',
            'data': token, // Ahora usa el token pasado por parámetro
            'origin': 'https://balance.saludplus.co',
            'referer': 'https://balance.saludplus.co/instituciones/',
            'x-requested-with': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': cookies.join('; ')
        };

        // Construcción del cuerpo para DataTables
        const bodyData = new URLSearchParams({
            'sEcho': '2',
            'iColumns': '7',
            'sColumns': ',HISTORIA,NOMBRE,FECHA,HORA,ESTADO,OTRO',
            'iDisplayStart': '0',
            'iDisplayLength': '10',
            'sSearch': documento.toString(),
            'iSortingCols': '1',
            'iSortCol_0': '0',
            'sSortDir_0': 'asc'
        });

        const response = await axios({
            method: 'POST',
            url: 'https://balance.saludplus.co/egresosHistoria/BucardorEgresosDatos',
            params: {
                fechaInicial: '01/01/2024',
                fechaFinal: '12/31/2026' // Ajustado a una fecha coherente
            },
            headers: headers,
            data: bodyData.toString(),
            timeout: 30000
        });

        // Verificación de la estructura aaData (estándar de DataTables antiguo)
        if (response.data && response.data.aaData && response.data.aaData.length > 0) {
            // Buscamos el registro donde la columna 6 coincida con el documento
            const registroEncontrado = response.data.aaData.find(egreso => 
                egreso[6] && egreso[6].toString() === documento.toString()
            );
            
            if (registroEncontrado) {
                // Retorna el ID (usualmente en la primera posición [0])
                return registroEncontrado[0];
            } else {
                throw new Error(`Documento ${documento} no encontrado en la lista de egresos`);
            }
        } else {
            throw new Error('La consulta no devolvió resultados (aaData vacío)');
        }

    } catch (error) {
        const errorMsg = error.response ? `Error Servidor (${error.response.status})` : error.message;
        console.error('Error en ConsultaIdEgreso:', errorMsg);
        throw new Error(errorMsg);
    }
};

module.exports = { ConsultaIdEgreso };