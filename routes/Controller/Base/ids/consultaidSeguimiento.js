const axios = require('axios');

const ConsultaIdSeguimiento = async (idAdmision) => {
    try {
        if (!idAdmision) {
            throw new Error('El campo "idAdmision" es requerido');
        }

        console.log('Buscando seguimiento para idAdmision:', idAdmision);

        const cookies = [
            '_ga=GA1.1.1028655100.1772306648',
            '_clck=14vh75i%5E2%5Eg4k%5E0%5E2250',
            '_ga_581YHK4S33=GS2.1.s1774205494`$o12`$g1`$t1774211257`$j59`$l0`$h0',
            '_clsk=t0lzit%5E1774211692871%5E24%5E1%5Eb.clarity.ms%2Fcollect'
        ];

        const headers = {
            'authority': 'balance.saludplus.co',
            'accept': '*/*',
            'accept-language': 'es-419,es;q=0.9,en;q=0.8',
            'cache': 'true',
            'data': 'qiT8/WA2snQC2ofRduY5QzyqKxGsueUOlPP2NAu7uiM=.1SS9/UCeyjpq9PyT8MBqPg==.wcFkBNOeMUO3EbN8I4nUXw==',
            'origin': 'https://balance.saludplus.co',
            'priority': 'u=1, i',
            'referer': 'https://balance.saludplus.co/instituciones/?origen=1&theme=false&time=1774211256023',
            'sec-ch-ua': '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
            'x-requested-with': 'XMLHttpRequest',
            'Cookie': cookies.join('; ')
        };

        const response = await axios({
            method: 'GET',
            url: `https://balance.saludplus.co/seguimientoDocumentos/BuscadorCalendario?idAdmision=${idAdmision}`,
            headers: headers,
            timeout: 30000
        });

        const htmlContent = response.data;
        
        // Extraer los IDs directamente
        const idPattern = /id:\s*(\d+)\s*,/g;
        const titlePattern = /title:\s*'([^']*)'/g;
        const documentoPattern = /documento\s*:\s*'([^']*)'/g;
        
        const ids = [];
        let match;
        
        while ((match = idPattern.exec(htmlContent)) !== null) {
            ids.push(match[1]);
        }
        
        const titulos = [];
        while ((match = titlePattern.exec(htmlContent)) !== null) {
            titulos.push(match[1]);
        }
        
        const tipos = [];
        while ((match = documentoPattern.exec(htmlContent)) !== null) {
            tipos.push(match[1]);
        }
        
        // Organizar los eventos con los mismos nombres que consultaid
        let idHistoria = null;
        let idOrden = null;
        let idEvolucion = null;
        let idNotas = [];
        let idEgresos = [];
        
        ids.forEach((id, index) => {
            const tipo = tipos[index] || '';
            switch (tipo) {
                case 'historia':
                    idHistoria = id;
                    break;
                case 'orden':
                    idOrden = id;
                    break;
                case 'evolucion':
                    idEvolucion = id;
                    break;
                case 'nota':
                    idNotas.push(id);
                    break;
                case 'epicrisis':
                    idEgresos.push(id);
                    break;
            }
        });
        
        console.log('IDs extraídos del seguimiento:', {
            idHistoria,
            idOrden,
            idEvolucion,
            idNotas,
            idEgresos
        });
        
        if (ids.length > 0) {
            return {
                idAdmision: idAdmision,
                idHistoria: idHistoria,
                idOrden: idOrden,
                idEvolucion: idEvolucion,
                idNotas: idNotas,
                idEgresos: idEgresos
            };
        } else {
            throw new Error('No se encontraron eventos para esta admisión');
        }

    } catch (error) {
        console.error('Error en ConsultaIdSeguimiento:', error.message);
        throw error;
    }
};

module.exports = { ConsultaIdSeguimiento };