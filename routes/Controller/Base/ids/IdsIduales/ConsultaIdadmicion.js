const axios = require('axios');

/**
 * Consulta el ID de Admisión basado en el documento del paciente.
 * @param {string|number} documento - Documento de identidad.
 * @param {string} token - Token dinámico para el header 'data'.
 */
const ConsultaIdAdmision = async (documento, token) => {
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
            'sEcho': '2',
            'iColumns': '8',
            'sColumns': ',CODIGO,DOCUMENTO,NOMBRE,Entidad,FECHA,HORA,ESTADO',
            'iDisplayStart': '0',
            'iDisplayLength': '10',
            'sSearch': documento.toString(),
            'iSortingCols': '1',
            'iSortCol_0': '0',
            'sSortDir_0': 'asc'
        });

        const response = await axios({
            method: 'POST',
            url: 'https://balance.saludplus.co/admisiones/BucardorAdmisionesDatos',
            params: {
                fechaInicial: '01/01/2024',
                fechaFinal: '12/31/2026',
                idRecurso: '0',
                SinCargo: 'False',
                idServicioIngreso: '3', // Filtro por servicio específico
                idCaracteristica: '0',
                validarSede: 'True'
            },
            headers: headers,
            data: bodyData.toString(),
            timeout: 30000
        });

        if (response.data && response.data.aaData && response.data.aaData.length > 0) {
            // Buscamos en la columna 1 (DOCUMENTO)
            const registroEncontrado = response.data.aaData.find(admision => 
                admision[1] && admision[1].includes(documento.toString())
            );
            
            if (registroEncontrado) {
                // Retornamos el idAdmision (columna 0)
                return registroEncontrado[0];
            } else {
                throw new Error(`No se encontró admisión activa para el documento: ${documento}`);
            }
        } else {
            throw new Error('La consulta de admisiones no devolvió resultados');
        }

    } catch (error) {
        const errorMsg = error.response ? `Error API Admisiones (${error.response.status})` : error.message;
        console.error('Error en ConsultaIdAdmision:', errorMsg);
        throw new Error(errorMsg);
    }
};

module.exports = { ConsultaIdAdmision };