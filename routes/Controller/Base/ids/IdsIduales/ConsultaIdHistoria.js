const axios = require('axios');

const ConsultaIdHistoria = async (documento, token) => {
    try {
        if (!documento || !token) {
            throw new Error('Los campos "documento" y "token" son requeridos');
        }

        // ── Fechas: últimos 3 meses (hoy - 3 meses → hoy) ──
        const fmt = (d) => {
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${mm}/${dd}/${d.getFullYear()}`;
        };

        const hoy = new Date();
        const desde = new Date(hoy);
        desde.setMonth(desde.getMonth() - 3);

        const fechaInicial = fmt(desde);
        const fechaFinal   = fmt(hoy);

        console.log(`📅 Rango fechas: ${fechaInicial} → ${fechaFinal}`);

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

        const response = await axios({
            method: 'POST',
            url: 'https://balance.saludplus.co/historiasClinicas/BuscardorHistoriasDatos',
            params: {
                estados: '',
                fechaInicial,                // ← hoy - 3 meses
                fechaFinal,                  // ← hoy
                idCaracteristica: '0',
                idActividad: '0',
                validarSede: 'True',
            },
            headers,
            data: bodyData.toString(),
            timeout: 30000,
        });

        const aaData = response.data && response.data.aaData;

        console.log(`🔎 BuscardorHistoriasDatos doc=${documento}:`, {
            total: response.data?.iTotalRecords,
            filas: Array.isArray(aaData) ? aaData.length : 0,
            muestra: Array.isArray(aaData) && aaData[0] ? aaData[0] : null,
        });

        if (!Array.isArray(aaData) || aaData.length === 0) {
            throw new Error(
                `La consulta no arrojó resultados en Historias Clínicas (rango ${fechaInicial} → ${fechaFinal})`
            );
        }

        // aaData row (10 columnas):
        //   [0]=idHistoria  [1]=CODIGO     [2]=DOCUMENTO  [3]=NOMBRE
        //   [4]=FECHA       [5]=HORA       [6]=INGRESO    [7]=ESTADO
        //   [8]=idAdmision  [9]=numeroAdmision
        const docStr = String(documento).trim();

        const registro = aaData.find(row =>
            String(row[9] || '').trim() === docStr ||
            String(row[2] || '').trim() === docStr ||
            String(row[8] || '').trim() === docStr ||
            String(row[1] || '').trim() === docStr
        ) || aaData[0];

        const idHistoria = registro[0];

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