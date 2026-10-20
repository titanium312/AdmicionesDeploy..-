// Archivo: IdsIduales/ConsultaIdHistoria.js
const axios = require('axios');

/**
 * Consulta el ID de la Historia Clínica basado en el documento del paciente.
 * 
 * - Prueba ventanas crecientes: 3m → 6m → 12m → 18m → 24m
 * - Se DETIENE al encontrar resultados o al llegar a 2 años (última ventana).
 * 
 * @param {string|number} documento - Cédula / numeroAdmision / idAdmision del paciente.
 * @param {string} token - Header `data` (ticket del login, ej: CfMcSyx1...).
 * @returns {Promise<string>} idHistoria (aaData[0][0])
 */
const ConsultaIdHistoria = async (documento, token) => {
    try {
        if (!documento || !token) {
            throw new Error('Los campos "documento" y "token" son requeridos');
        }

        // ── Helper de formato MM/DD/YYYY ──
        const fmt = (d) => {
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${mm}/${dd}/${d.getFullYear()}`;
        };

        // ── Headers (idénticos al cURL que funciona) ──
        const headers = {
            'accept': 'application/json, text/javascript, */*; q=0.01',
            'accept-language': 'es-419,es;q=0.9,en;q=0.8',
            'content-type': 'application/x-www-form-urlencoded',
            'data': token,
            'origin': 'https://balance.saludplus.co',
            'referer': 'https://balance.saludplus.co/instituciones/',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36',
            'x-requested-with': 'XMLHttpRequest',
        };

        // ── Body DataTables completo (obligatorio para el server) ──
        const bodyData = new URLSearchParams({
            sEcho: '2',
            iColumns: '8',
            sColumns: ',CODIGO,DOCUMENTO,NOMBRE,FECHA,HORA,INGRESO,ESTADO',
            iDisplayStart: '0',
            iDisplayLength: '10',
            mDataProp_0: '0', mDataProp_1: '1', mDataProp_2: '2', mDataProp_3: '3',
            mDataProp_4: '4', mDataProp_5: '5', mDataProp_6: '6', mDataProp_7: '7',
            sSearch: documento.toString(),
            bRegex: 'false',
            sSearch_0: '', bRegex_0: 'false', bSearchable_0: 'true',
            sSearch_1: '', bRegex_1: 'false', bSearchable_1: 'false',
            sSearch_2: '', bRegex_2: 'false', bSearchable_2: 'false',
            sSearch_3: '', bRegex_3: 'false', bSearchable_3: 'false',
            sSearch_4: '', bRegex_4: 'false', bSearchable_4: 'false',
            sSearch_5: '', bRegex_5: 'false', bSearchable_5: 'false',
            sSearch_6: '', bRegex_6: 'false', bSearchable_6: 'false',
            sSearch_7: '', bRegex_7: 'false', bSearchable_7: 'false',
            iSortingCols: '1', iSortCol_0: '0', sSortDir_0: 'asc',
            bSortable_0: 'true', bSortable_1: 'false', bSortable_2: 'false',
            bSortable_3: 'false', bSortable_4: 'false', bSortable_5: 'false',
            bSortable_6: 'false', bSortable_7: 'false',
        });

        // ══════════════════════════════════════════════════════
        //  BUCLE DE BÚSQUEDA — ventanas crecientes, MÁXIMO 2 AÑOS
        // ══════════════════════════════════════════════════════
        const hoy = new Date();
        const VENTANAS_MESES = [3, 6, 12, 18, 24]; // 24m = 2 años → aquí termina

        let aaData = null;
        let fechaInicialUsada = null;
        let fechaFinalUsada = null;

        for (let i = 0; i < VENTANAS_MESES.length; i++) {
            const meses = VENTANAS_MESES[i];
            const esUltimo = i === VENTANAS_MESES.length - 1;

            const desde = new Date(hoy);
            desde.setMonth(desde.getMonth() - meses);
            const fi = fmt(desde);
            const ff = fmt(hoy);

            const response = await axios({
                method: 'POST',
                url: 'https://balance.saludplus.co/historiasClinicas/BuscardorHistoriasDatos',
                params: {
                    estados: '',
                    fechaInicial: fi,
                    fechaFinal: ff,
                    idCaracteristica: '0',
                    idActividad: '0',
                    validarSede: 'True',
                },
                headers,
                data: bodyData.toString(),
                timeout: 30000,
            });

            const data = response.data?.aaData;
            const filas = Array.isArray(data) ? data.length : 0;

            console.log(`🔎 Ventana ${i + 1}/${VENTANAS_MESES.length} — ${meses}m (${fi} → ${ff}): ${filas} fila(s)`);

            if (filas > 0) {
                aaData = data;
                fechaInicialUsada = fi;
                fechaFinalUsada = ff;
                break;
            }

            // 🛑 Límite duro: 2 años sin resultados → fin
            if (esUltimo) {
                console.log(`🛑 Búsqueda agotada: 2 años revisados sin resultados para doc=${documento}`);
            }
        }

        if (!aaData || aaData.length === 0) {
            throw new Error(
                `La consulta no arrojó resultados en Historias Clínicas (ventanas probadas: ${VENTANAS_MESES.join('m, ')}m)`
            );
        }

        console.log(`✅ Encontrado en ventana ${fechaInicialUsada} → ${fechaFinalUsada}`);

        // ══════════════════════════════════════════════════════
        //  PARSEO — aaData row (10 columnas):
        //   [0]=idHistoria  [1]=CODIGO     [2]=DOCUMENTO  [3]=NOMBRE
        //   [4]=FECHA       [5]=HORA       [6]=INGRESO    [7]=ESTADO
        //   [8]=idAdmision  [9]=numeroAdmision
        // ══════════════════════════════════════════════════════
        const docStr = String(documento).trim();

        // Match flexible: numeroAdmision, documento, idAdmision, CODIGO
        const registro = aaData.find(row =>
            String(row[9] || '').trim() === docStr ||  // numeroAdmision
            String(row[2] || '').trim() === docStr ||  // DOCUMENTO
            String(row[8] || '').trim() === docStr ||  // idAdmision
            String(row[1] || '').trim() === docStr     // CODIGO
        ) || aaData[0]; // fallback: sSearch ya filtró server-side

        const idHistoria = registro[0]; // ← [0] = idHistoria

        if (!idHistoria) {
            throw new Error(`Registro encontrado para ${documento} pero sin idHistoria en [0]`);
        }

        console.log(`✅ ConsultaIdHistoria: doc=${documento} → idHistoria=${idHistoria} (numeroAdmision=${registro[9]}, idAdmision=${registro[8]})`);
        return idHistoria;

    } catch (error) {
        const errorMsg = error.response
            ? `Error API Historias (${error.response.status}): ${JSON.stringify(error.response.data).slice(0, 200)}`
            : error.message;
        console.error('Error en ConsultaIdHistoria:', errorMsg);
        throw new Error(errorMsg);
    }
};

module.exports = { ConsultaIdHistoria };