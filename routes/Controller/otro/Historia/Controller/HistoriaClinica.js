const axios = require('axios');
const { getHistoriaClinicaBody } = require('./JSON/odontologia'); // ajusta la ruta

// Función para recortar strings que excedan la longitud máxima de la BD
function trimStrings(obj, maxShort = 255, maxLong = 4000) {
    const longFields = [
        'observaciones_historia',
        'plan_tratamiento_descripcion_historia',
        'analisis_historia',
        'signos_de_alarma_educacion',
        'enfermedad_actual_historia',
        'motivo_consulta_historia',
        'motivo_consulta_consulta_externa',
        'hallazgos_fisicos_otros_cabeza_historia',
        'hallazgos_fisicos_otros_cuello_historia',
        'hallazgos_fisicos_otros_torax_historia',
        'hallazgos_fisicos_otros_abdomen_historia',
        'hallazgos_fisicos_otros_genitourinario_historia',
        'hallazgos_fisicos_otros_pelvis_historia',
        'hallazgos_fisicos_otros_dorso_historia',
        'hallazgos_fisicos_otros_neurologico_historia',
        'hallazgos_fisicos_otros_piel_historia',
        'hallazgos_fisicos_otros_otro_historia',
        'observaciones_odontograma',
        'observaciones_placa_bacteriana',
        'diagnostico_ingreso_observaciones_historia',
        'diagnostico_principales_observaciones_consulta_externa',
        'diagnostico_relacional_observaciones_historia',
        'examen_odontologico_observaciones',
        'antecedetes_personales_observaciones_historia',
        'antecedentes_familiares_observaciones_historia',
        'antecedentes_alergicos_observaciones_historia',
        'antecedetes_quirurgicos_observaciones_historia',
        'EntregaMedicamentosObservaciones',
        'materialesInsumosObservaciones'
    ];

    if (typeof obj === 'string') return obj;
    if (Array.isArray(obj)) return obj.map(item => trimStrings(item, maxShort, maxLong));
    if (obj && typeof obj === 'object') {
        const newObj = {};
        for (const [key, value] of Object.entries(obj)) {
            if (key === 'token') continue; // nunca enviar token en el body
            if (typeof value === 'string') {
                if (longFields.includes(key)) {
                    newObj[key] = value.length > maxLong ? value.substring(0, maxLong) : value;
                } else {
                    newObj[key] = value.length > maxShort ? value.substring(0, maxShort) : value;
                }
            } else {
                newObj[key] = trimStrings(value, maxShort, maxLong);
            }
        }
        return newObj;
    }
    return obj;
}

const HistoriaClinica = async (req, res) => {
    try {
        const authToken = req.headers.authorization?.replace('Bearer ', '') || '';
        if (!authToken) {
            return res.status(401).json({ error: 'Token de autorización requerido' });
        }

        const cookieString = [
            '_clck=1468m7e%5E2%5Eg5v%5E0%5E2319',
            '_ga=GA1.1.1563588238.1778248374',
            '_ga_581YHK4S33=GS2.1.s1778248374.o1.g1.t1778248411.j23.l0.h0',
            '_clsk=oreq1f%5E1778248413025%5E2%5E1%5Eb.clarity.ms%2Fcollect'
        ].join('; ');

        // Obtener el body base con talla y peso (ajusta según necesidad)
        let requestBody = getHistoriaClinicaBody({ talla: "170", peso: "68.5" });

        // Aplicar sanitización para evitar truncamiento
        requestBody = trimStrings(requestBody);

        const response = await axios.post(
            'https://balance.saludplus.co/historiaClinicaUnificada/historiaCompletaEditar?auto=0',
            requestBody,
            {
                headers: {
                    'authority': 'balance.saludplus.co',
                    'accept': 'application/json, text/javascript, */*; q=0.01',
                    'accept-encoding': 'gzip, deflate, br, zstd',
                    'accept-language': 'es-419,es;q=0.9',
                    'authorization': `Bearer ${authToken}`,
                    'cache': 'true',
                    'data': 'AYuGQdLQYom0PDkQJEBH8g1apmZrJbPsymDlpJMs/XI=.pNjdaOZN9Uyrfj1i7WTJiA==.wcFkBNOeMUO3EbN8I4nUXw==',
                    'origin': 'https://balance.saludplus.co',
                    'priority': 'u=1, i',
                    'referer': 'https://balance.saludplus.co/instituciones/?origen=1&theme=false&time=1778248410978',
                    'sec-ch-ua': '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-origin',
                    'x-requested-with': 'XMLHttpRequest',
                    'Cookie': cookieString,
                    'Content-Type': 'application/json; charset=UTF-8'
                }
            }
        );

        const { valorRetorno, mensajeRetorno, numeroHistoria } = response.data;
        if (valorRetorno < 0) {
            return res.status(422).json({
                success: false,
                valorRetorno,
                mensajeRetorno,
                data: response.data
            });
        }

        return res.status(200).json({
            success: true,
            valorRetorno,
            numeroHistoria,
            mensajeRetorno,
            data: response.data
        });

    } catch (error) {
        console.error('Error en HistoriaClinica:', error.message);
        return res.status(error.response?.status || 500).json({
            success: false,
            error: 'Request failed',
            details: error.response?.data || error.message
        });
    }
};

module.exports = { HistoriaClinica };