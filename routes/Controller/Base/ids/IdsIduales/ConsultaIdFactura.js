const axios = require('axios');

const ConsultaIdFactura = async (documento) => {
    try {
        if (!documento) {
            throw new Error('El campo "documento" es requerido');
        }

        const cookies = [
            '_ga=GA1.1.1028655100.1772306648',
            '_clck=14vh75i%5E2%5Eg4k%5E0%5E2250',
            '_ga_581YHK4S33=GS2.1.s1774205494`$o12`$g1`$t1774206490`$j59`$l0`$h0',
            '_clsk=t0lzit%5E1774206490744%5E8%5E1%5Eb.clarity.ms%2Fcollect'
        ];

        const headers = {
            'authority': 'balance.saludplus.co',
            'accept': 'application/json, text/javascript, */*; q=0.01',
            'accept-language': 'es-419,es;q=0.9,en;q=0.8',
            'cache': 'true',
            'data': 'qiT8/WA2snQC2ofRduY5QzyqKxGsueUOlPP2NAu7uiM=.1SS9/UCeyjpq9PyT8MBqPg==.wcFkBNOeMUO3EbN8I4nUXw==',
            'origin': 'https://balance.saludplus.co',
            'referer': 'https://balance.saludplus.co/instituciones/?origen=1&theme=false&time=1774206489536',
            'x-requested-with': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
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
                fechaInicial: '05/01/2024',
                fechaFinal: '03/22/2026',
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

        if (response.data && response.data.aaData) {
            const registroEncontrado = response.data.aaData.find(factura => 
                factura[2].includes(documento.toString())
            );
            
            if (registroEncontrado) {
                const numeroFacturaCompleto = registroEncontrado[2]; // "39842 - FEH28969"
                const partes = numeroFacturaCompleto.split(' - ');
                const numeroFactura = partes[1]; // "FEH28969"
                const idFactura = registroEncontrado[0]; // "3985802"
                
                return {
                    numeroFactura: numeroFactura,
                    idFactura: idFactura
                };
            } else {
                throw new Error('Factura no encontrada');
            }
        } else {
            throw new Error('No se encontraron resultados en facturas');
        }

    } catch (error) {
        console.error('Error en ConsultaIdFactura:', error.message);
        throw error;
    }
};

module.exports = { ConsultaIdFactura };