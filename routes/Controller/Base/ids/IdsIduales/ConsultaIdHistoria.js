const axios = require('axios');

/**
 * Consulta el ID de la Historia Clínica basado en el documento del paciente.
 * @param {string|number} documento - Número de identificación del paciente.
 * @param {string} token - Token dinámico de sesión (header 'data').
 */
const ConsultaIdHistoria = async (documento, token) => {
    try {
        // Validación de parámetros
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
            'sEcho': '5',
            'iColumns': '8',
            'sColumns': ',CODIGO,DOCUMENTO,NOMBRE,FECHA,HORA,INGRESO,ESTADO',
            'iDisplayStart': '0',
            'iDisplayLength': '10',
            'sSearch': documento.toString(),
            'iSortingCols': '1',
            'iSortCol_0': '0',
            'sSortDir_0': 'asc'
        });

        const response = await axios({
            method: 'POST',
            url: 'https://balance.saludplus.co/historiasClinicas/BuscardorHistoriasDatos',
            params: {
                estados: '',
                serviciosIngreso: '1,2,3,4',
                fechaInicial: '*',
                fechaFinal: '*',
                idCaracteristica: '0',
                idActividad: '0',
                validarSede: 'False'
            },
            headers: headers,
            data: bodyData.toString(),
            timeout: 30000
        });

        // Verificación de datos recibidos (DataTables aaData)
        if (response.data && response.data.aaData && response.data.aaData.length > 0) {
            // Buscamos el registro donde el DOCUMENTO (columna 2 según sColumns) coincida
            // Nota: En tu find anterior usabas historia[1], verifica si el documento está en la 1 o 2
            const registroEncontrado = response.data.aaData.find(historia => 
                historia[1] && historia[1].toString() === documento.toString()
            );
            
            if (registroEncontrado) {
                return registroEncontrado[0]; // Retorna el idHistoria (CODIGO)
            } else {
                throw new Error(`El documento ${documento} no se encuentra en el listado de Historias Clínicas`);
            }
        } else {
            throw new Error('La consulta no arrojó resultados en Historias Clínicas');
        }

    } catch (error) {
        const errorMsg = error.response ? `Error API Historias (${error.response.status})` : error.message;
        console.error('Error en ConsultaIdHistoria:', errorMsg);
        throw new Error(errorMsg);
    }
};

module.exports = { ConsultaIdHistoria };