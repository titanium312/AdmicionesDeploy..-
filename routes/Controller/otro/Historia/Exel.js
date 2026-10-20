// src/controllers/reporte.controller.js
const axios = require('axios').default;
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

const { createToken } = require('../../Base/toke');

// ============================================================
// Config fija del visor SSRS
// ============================================================
const VISOR = {
    reportName: 'ListadoProcedimientosFacturados',
    institucionId: 20,
    idCaracteristica: 83,
    userId: 6874,
    engine: 1,
    environment: 1,
};

// ============================================================
// Helpers de logging
// ============================================================
const T0 = Date.now();
const dt = () => `+${String(Date.now() - T0).padStart(5)}ms`;
function step(n, msg, extra) {
    console.log(`\n[${dt()}] ═══ PASO ${n} ═══ ${msg}`);
    if (extra !== undefined) console.log(`         ${JSON.stringify(extra)}`);
}
function info(msg, extra) {
    console.log(`[${dt()}]    ${msg}` + (extra !== undefined ? ` → ${JSON.stringify(extra)}` : ''));
}
function fail(n, msg, extra) {
    console.log(`\n[${dt()}] ❌ PASO ${n} FALLÓ: ${msg}`);
    if (extra !== undefined) console.log(`         ${JSON.stringify(extra, null, 2)}`);
}

// ============================================================
// Fechas dd-MM-yyyy
// ============================================================
function toDDMMYYYY(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
}
function hoyDDMMYYYY() {
    return toDDMMYYYY(new Date());
}

// ============================================================
// Extractores del HTML del visor
// ============================================================
function extractHidden(html, name) {
    const re = new RegExp(`<input[^>]+name="${name}"[^>]+value="([^"]*)"`, 'i');
    const m = html.match(re);
    return m ? m[1] : null;
}
function extractReportSession(text) {
    let m = text.match(/ReportSession=([a-z0-9]+)/i);
    if (m) return m[1];
    m = text.match(/["']ReportSession["']\s*[:=]\s*["']?([a-z0-9]{20,40})/i);
    return m ? m[1] : null;
}
function extractControlId(text) {
    let m = text.match(/ControlID=([a-f0-9]{32})/i);
    if (m) return m[1];
    m = text.match(/["']ControlID["']\s*[:=]\s*["']?([a-f0-9]{32})/i);
    return m ? m[1] : null;
}

// ============================================================
// Handler HTTP
// ============================================================
async function descargarReporte(req, res) {
    global.__t0_ = Date.now();
    const tStart = Date.now();
    console.log('\n\n');
    console.log('████████████████████████████████████████████████████████');
    console.log('█  NUEVA PETICIÓN: descargarReporte (Procedimientos)');
    console.log('████████████████████████████████████████████████████████');

    let token;

    try {
        // ══════════════════════════════════════════════════════
        // PASO 1 — Validar entrada (solo fechas)
        // ══════════════════════════════════════════════════════
        step(1, 'Validar entrada', {
            'req.query': req.query,
            'req.body': req.body,
        });

        const fechaInicial = req.query.fechaInicial || req.body?.fechaInicial || hoyDDMMYYYY();
        const fechaFinal   = req.query.fechaFinal   || req.body?.fechaFinal   || hoyDDMMYYYY();

        // Validación básica de formato dd-MM-yyyy
        const reFecha = /^\d{2}-\d{2}-\d{4}$/;
        if (!reFecha.test(fechaInicial) || !reFecha.test(fechaFinal)) {
            fail(1, 'Formato de fecha inválido (esperado dd-MM-yyyy)', { fechaInicial, fechaFinal });
            return res.status(400).json({
                step: 1,
                error: 'Formato de fecha inválido. Usa dd-MM-yyyy',
                fechaInicial,
                fechaFinal,
            });
        }
        info('fechas', { fechaInicial, fechaFinal });

        // ══════════════════════════════════════════════════════
        // PASO 2 — Generar token AES
        // ══════════════════════════════════════════════════════
        step(2, 'Generar token AES con createToken()', {
            reportName: VISOR.reportName,
            institucionId: VISOR.institucionId,
            idCaracteristica: VISOR.idCaracteristica,
            userId: VISOR.userId,
        });
        try {
            token = createToken(
                VISOR.reportName, VISOR.institucionId,
                VISOR.idCaracteristica, VISOR.userId
            );
        } catch (e) {
            fail(2, 'createToken() lanzó excepción', { message: e.message });
            return res.status(500).json({ step: 2, error: 'createToken falló: ' + e.message });
        }
        info('token generado', {
            length: token.length,
            head: token.slice(0, 40) + '...',
            tail: '...' + token.slice(-20),
        });
        if (!token || token.length < 20) {
            fail(2, 'Token sospechosamente corto', { length: token ? token.length : 0 });
            return res.status(500).json({ step: 2, error: 'Token inválido' });
        }

        // ══════════════════════════════════════════════════════
        // PASO 3 — Construir URL del visor
        // ══════════════════════════════════════════════════════
        const baseUrl = `https://reportes.saludplus.co/View.aspx/?modulo=Facturacion`
            + `&reporte=${VISOR.reportName}`
            + `&hideTool=true`
            + `&engine=${VISOR.engine}`
            + `&fechaInicial=${fechaInicial}`
            + `&fechaFinal=${fechaFinal}`
            + `&environment=${VISOR.environment}`
            + `&userId=${VISOR.userId}`
            + `&token=${token}`;
        step(3, 'URL del visor construida', {
            length: baseUrl.length,
            preview: baseUrl.slice(0, 200) + '...',
        });

        // ══════════════════════════════════════════════════════
        // PASO 4 — Crear cliente con cookie jar
        // ══════════════════════════════════════════════════════
        step(4, 'Crear axios + CookieJar');
        const jar = new CookieJar();
        const client = wrapper(axios.create({
            jar,
            baseURL: 'https://reportes.saludplus.co',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36',
                'Accept-Language': 'es-419,es;q=0.9',
                'Referer': 'https://reportes.saludplus.co/',
            },
            withCredentials: true,
            timeout: 30000,
        }));
        info('cliente listo');

        // ══════════════════════════════════════════════════════
        // PASO 5 — GET View.aspx
        // ══════════════════════════════════════════════════════
        step(5, 'GET View.aspx (HTML inicial del visor)');
        const t5 = Date.now();
        let r1;
        try {
            r1 = await client.get(baseUrl, { validateStatus: () => true });
        } catch (e) {
            fail(5, 'GET lanzó excepción', { message: e.message });
            return res.status(500).json({ step: 5, error: e.message });
        }
        info('GET respuesta', {
            status: r1.status,
            contentType: r1.headers['content-type'],
            bytes: String(r1.data).length,
            ms: Date.now() - t5,
            cookies: jar.serializeSync().cookies.map(c => c.key),
        });
        if (r1.status !== 200) {
            fail(5, `GET devolvió ${r1.status}`, {
                preview: String(r1.data).slice(0, 300),
            });
            return res.status(500).json({ step: 5, error: `GET status ${r1.status}`, preview: String(r1.data).slice(0, 300) });
        }

        // ══════════════════════════════════════════════════════
        // PASO 6 — Extraer __VIEWSTATE, etc.
        // ══════════════════════════════════════════════════════
        step(6, 'Extraer campos ocultos del HTML');
        const viewState    = extractHidden(r1.data, '__VIEWSTATE');
        const eventVal     = extractHidden(r1.data, '__EVENTVALIDATION');
        const viewStateGen = extractHidden(r1.data, '__VIEWSTATEGENERATOR');
        info('campos encontrados', {
            __VIEWSTATE_len: viewState ? viewState.length : 0,
            __EVENTVALIDATION_len: eventVal ? eventVal.length : 0,
            __VIEWSTATEGENERATOR: viewStateGen || null,
        });
        if (!viewState) {
            fail(6, 'No se encontró __VIEWSTATE en el HTML', {
                htmlHead: String(r1.data).slice(0, 500),
                hint: 'Puede ser que el token sea rechazado o el visor devolvió otra página',
            });
            return res.status(500).json({ step: 6, error: 'Sin __VIEWSTATE' });
        }

        // ══════════════════════════════════════════════════════
        // PASO 7 — POST View.aspx (carga del reporte)
        // ══════════════════════════════════════════════════════
        step(7, 'POST View.aspx (carga real del reporte)');
        const t7 = Date.now();
        const body = new URLSearchParams({
            'ScriptManager1':       'ScriptManager1|ReportViewer1$ctl13$Reserved_AsyncLoadTarget',
            '__EVENTTARGET':        'ReportViewer1$ctl13$Reserved_AsyncLoadTarget',
            '__EVENTARGUMENT':      '',
            '__VIEWSTATE':          viewState,
            '__EVENTVALIDATION':    eventVal || '',
            '__VIEWSTATEGENERATOR': viewStateGen || '',
        });
        let r2;
        try {
            r2 = await client.post(baseUrl, body.toString(), {
                headers: {
                    'Content-Type':     'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-MicrosoftAjax':  'Delta=true',
                    'Referer':          baseUrl,
                },
                validateStatus: () => true,
            });
        } catch (e) {
            fail(7, 'POST lanzó excepción', { message: e.message });
            return res.status(500).json({ step: 7, error: e.message });
        }
        info('POST respuesta', {
            status: r2.status,
            contentType: r2.headers['content-type'],
            bytes: String(r2.data).length,
            ms: Date.now() - t7,
            cookies: jar.serializeSync().cookies.map(c => c.key),
        });

        // ══════════════════════════════════════════════════════
        // PASO 8 — Extraer ReportSession / ControlID
        // ══════════════════════════════════════════════════════
        step(8, 'Extraer ReportSession y ControlID del POST');
        const reportSession = extractReportSession(String(r2.data));
        const controlId     = extractControlId(String(r2.data));
        info('valores extraídos', {
            ReportSession: reportSession,
            ControlID: controlId,
            postPreview: String(r2.data).slice(0, 300).replace(/\s+/g, ' '),
        });
        if (!reportSession || !controlId) {
            fail(8, 'No se pudo extraer ReportSession/ControlID', {
                hint: 'El POST devolvió HTML sin esos valores. Ver postPreview arriba.',
            });
            return res.status(500).json({
                step: 8,
                error: 'Sin ReportSession/ControlID',
                postPreview: String(r2.data).slice(0, 500),
            });
        }

        // ══════════════════════════════════════════════════════
        // PASO 9 — GET exportación Excel
        // ══════════════════════════════════════════════════════
        step(9, 'GET exportación Excel (Reserved.ReportViewerWebControl.axd)');
        const exportUrl = `/Reserved.ReportViewerWebControl.axd`
            + `?ReportSession=${reportSession}`
            + `&Culture=9226&CultureOverrides=True&UICulture=9226&UICultureOverrides=True`
            + `&ReportStack=1&ControlID=${controlId}`
            + `&RSProxy=http%3a%2f%2flocalhost%2fReportServer`
            + `&OpType=Export&FileName=${VISOR.reportName}`
            + `&ContentDisposition=OnlyHtmlInline&Format=EXCELOPENXML`;
        const t9 = Date.now();
        const r3 = await client.get(exportUrl, {
            responseType: 'arraybuffer',
            headers: { 'Referer': baseUrl, 'Accept': '*/*' },
            validateStatus: () => true,
        });
        info('export respuesta', {
            status: r3.status,
            contentType: r3.headers['content-type'],
            contentDisposition: r3.headers['content-disposition'],
            bytes: r3.data.length,
            ms: Date.now() - t9,
        });

        // ══════════════════════════════════════════════════════
        // PASO 10 — Validar que sea un .xlsx real (ZIP)
        // ══════════════════════════════════════════════════════
        step(10, 'Validar firma ZIP del archivo (PK\\x03\\x04)');
        const buffer = Buffer.from(r3.data);
        const header4 = buffer.slice(0, 4);
        const isZip = header4[0] === 0x50 && header4[1] === 0x4B
                   && header4[2] === 0x03 && header4[3] === 0x04;
        info('primeros 4 bytes', {
            hex: header4.toString('hex'),
            ascii: header4.toString('ascii'),
            isZip,
        });
        if (!isZip) {
            const snippet = buffer.toString('utf-8').slice(0, 400);
            fail(10, 'La respuesta NO es un XLSX válido', {
                contentType: r3.headers['content-type'],
                bodySnippet: snippet,
                hint: 'El servidor devolvió HTML/error en lugar de Excel',
            });
            return res.status(500).json({
                step: 10,
                error: 'Respuesta no es XLSX',
                contentType: r3.headers['content-type'],
                snippet,
            });
        }

        // ══════════════════════════════════════════════════════
        // PASO 11 — Enviar al cliente
        // ══════════════════════════════════════════════════════
        step(11, 'Enviar .xlsx al cliente');
        const filename = `ListadoProcedimientosFacturados-${fechaInicial}_a_${fechaFinal}.xlsx`;
        info('filename', filename);
        info('bytes a enviar', buffer.length);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('X-Elapsed-Ms', String(Date.now() - tStart));
        res.setHeader('X-Fecha-Inicial', fechaInicial);
        res.setHeader('X-Fecha-Final', fechaFinal);
        console.log(`\n[${dt()}] ✅ TODO OK — ${buffer.length} bytes en ${Date.now() - tStart}ms\n`);
        return res.send(buffer);

    } catch (err) {
        fail('?', 'Excepción no controlada', {
            message: err.message,
            stack: (err.stack || '').split('\n').slice(0, 5),
        });
        return res.status(500).json({
            step: 'unknown',
            error: err.message,
            stack: (err.stack || '').split('\n').slice(0, 5),
        });
    }
}

module.exports = { descargarReporte };