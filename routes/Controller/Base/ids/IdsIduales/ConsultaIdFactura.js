const axios = require('axios');

/**
 * Consulta el ID y el número de factura basado en el documento del paciente.
 * @param {string|number} documento - Documento del paciente.
 * @param {string} token - Token dinámico para el header 'data'.
 */
const ConsultaIdFactura = async (documento, token) => {
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
            'sColumns': ',CHECK,NUMERO,FECHA,RESOLUCION,PACIENTE,ENTIDAD,ESTADO',
            'iDisplayStart': '0',
            'iDisplayLength': '10',
            'sSearch': documento.toString(),
            'iSortingCols': '1',
            'iSortCol_0': '0',
            'sSortDir_0': 'asc'
        });

        const response = await axios({
            method: 'POST',
            url: 'https://balance.saludplus.co/facturasAdministar/BuscarListadofacturasDatos',
            params: {
                fechaInicial: '01/01/2024',
                fechaFinal: '12/31/2026',
                idEntidad: '0',
                idContrato: '0',
                SinNumero: 'False',
                duplicadas: 'False',
                idCuentaCobro: '0',
                estadoFacturacionElectronica: '0'
            },
            headers: headers,
            data: bodyData.toString(),
            timeout: 30000
        });

        if (response.data && response.data.aaData && response.data.aaData.length > 0) {
            // Buscamos en la columna de PACIENTE o NUMERO (ajustado según tu lógica de .includes)
            const registroEncontrado = response.data.aaData.find(factura => 
                factura[2] && factura[2].includes(documento.toString())
            );
            
            if (registroEncontrado) {
                // Formato esperado: "39842 - FEH28969"
                const numeroFacturaCompleto = registroEncontrado[2]; 
                const partes = numeroFacturaCompleto.split(' - ');
                
                return {
                    idFactura: registroEncontrado[0], // "3985802"
                    numeroFactura: partes[1] || partes[0], // "FEH28969"
                    infoCompleta: numeroFacturaCompleto
                };
            } else {
                throw new Error(`No se encontró factura activa para el documento: ${documento}`);
            }
        } else {
            throw new Error('La consulta de facturas no devolvió resultados');
        }

    } catch (error) {
        const errorMsg = error.response ? `Error API Facturas (${error.response.status})` : error.message;
        console.error('Error en ConsultaIdFactura:', errorMsg);
        throw new Error(errorMsg);
    }
};

module.exports = { ConsultaIdFactura };