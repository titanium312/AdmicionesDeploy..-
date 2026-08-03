const axios = require('axios');
const querystring = require('querystring');
const { obtenerDatosAdmision } = require('./buscador/buscarIdAdmision');
const { adolescencia } = require('./catalogos/adolescencia');
const { calcularEdad } = require('./utils/dateUtils');

// ============================================================
// CONFIGURACIÓN
// ============================================================
const SALUDPLUS_URL = 'https://balance.saludplus.co/historiaClinicaUnificada/historiaCompletaEditar?auto=0';
const CONTADOR_URL = 'https://hospitalsanjorgeayapel.gov.co/BakenPhp/cositas/contadorhs.php';

const MIN_INTERVALO_MINUTOS = 30; // Duración de cada atención (30 min)
const HORA_INICIO = 6;            // 6:00 AM
const HORA_FIN = 17;              // 5:00 PM

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

/**
 * Convierte cualquier formato de fecha a 'YYYY-MM-DD'
 * Soporta: Date, "/Date(ms)/", ISO, string estándar
 */
function parsearFechaAdmision(fechaInput) {
    if (fechaInput instanceof Date) {
        return fechaInput.toISOString().split('T')[0];
    }
    if (typeof fechaInput === 'string' && fechaInput.startsWith('/Date(') && fechaInput.endsWith(')/')) {
        const ms = parseInt(fechaInput.slice(6, -2), 10);
        if (!isNaN(ms)) {
            return new Date(ms).toISOString().split('T')[0];
        }
    }
    if (typeof fechaInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(fechaInput)) {
        return fechaInput.split('T')[0];
    }
    const date = new Date(fechaInput);
    if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
    }
    // Fallback: fecha actual
    console.warn('Fecha no reconocida, usando hoy:', fechaInput);
    return new Date().toISOString().split('T')[0];
}

/**
 * Formatea un objeto Date a 'YYYY-MM-DD HH:MM:00'
 */
function formatearFechaHora(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${mins}:00`;
}

/**
 * Obtiene todos los registros del contador para una fecha específica.
 */
async function obtenerRegistrosDelDia(fecha) {
    try {
        const response = await axios.get(CONTADOR_URL, { params: { fecha } });
        if (response.data?.success && Array.isArray(response.data.datos)) {
            return response.data.datos;
        }
        return [];
    } catch (error) {
        console.error('Error al obtener registros del día:', error.message);
        return [];
    }
}

/**
 * Calcula los intervalos libres de 30 minutos en un día,
 * a partir de los registros ocupados.
 */
function calcularHuecosLibres(fecha, registros) {
    const diaInicio = new Date(`${fecha}T${String(HORA_INICIO).padStart(2, '0')}:00:00`);
    const diaFin = new Date(`${fecha}T${String(HORA_FIN).padStart(2, '0')}:00:00`);

    // Convertir registros a bloques ocupados (cada atención dura MIN_INTERVALO_MINUTOS)
    const ocupados = registros.map(reg => {
        const fechaHora = new Date(reg.fecha_hora.replace(' ', 'T'));
        const inicio = fechaHora;
        const fin = new Date(fechaHora.getTime() + MIN_INTERVALO_MINUTOS * 60000);
        return { inicio, fin };
    });
    ocupados.sort((a, b) => a.inicio - b.inicio);

    const huecos = [];
    let current = diaInicio;

    for (const bloque of ocupados) {
        if (bloque.inicio > current) {
            if (bloque.inicio - current >= MIN_INTERVALO_MINUTOS * 60000) {
                huecos.push({ inicio: current, fin: bloque.inicio });
            }
        }
        if (bloque.fin > current) current = bloque.fin;
    }

    if (diaFin > current && (diaFin - current) >= MIN_INTERVALO_MINUTOS * 60000) {
        huecos.push({ inicio: current, fin: diaFin });
    }

    return huecos;
}

/**
 * Elige el hueco más cercano a la hora solicitada (primero hacia adelante,
 * luego hacia atrás). Devuelve la fecha/hora de inicio del hueco elegido.
 */
function elegirHuecoCercano(huecos, horaSolicitada) {
    if (huecos.length === 0) return null;

    let huecoPosterior = null;
    let huecoAnterior = null;

    for (const hueco of huecos) {
        if (hueco.inicio >= horaSolicitada) {
            huecoPosterior = hueco;
            break;
        }
        huecoAnterior = hueco;
    }

    if (huecoPosterior) return huecoPosterior.inicio;
    if (huecoAnterior) return huecoAnterior.inicio;
    return null;
}

/**
 * Guarda un registro en el contador (POST).
 */
async function guardarEnContador(numeroAdmision, fechaHora, resultado) {
    const body = querystring.stringify({
        numero_admision: numeroAdmision,
        fecha_hora: fechaHora,
        resultado: resultado
    });

    const response = await axios.post(CONTADOR_URL, body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
}

// ============================================================
// CONTROLADOR PRINCIPAL
// ============================================================
const GeneradorHs = async (req, res) => {
    try {
        // 1. Obtener token del body
        const token = req.body.token;
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Token de autenticación requerido en el cuerpo de la solicitud (campo "token").'
            });
        }

        // 2. Obtener número de admisión
        const numeroAdmision = req.params.numeroAdmision ||
                               req.body.numeroAdmision ||
                               req.query.numeroAdmision;

        if (!numeroAdmision) {
            return res.status(400).json({
                success: false,
                error: 'Debe proporcionar el parámetro "numeroAdmision".'
            });
        }

        // 3. Obtener datos de admisión
        const resultado = await obtenerDatosAdmision(numeroAdmision);
        const data = resultado.data;

        // 4. Calcular edad y validar etapa
        const edad = calcularEdad(data.paciente.fecha_nacimiento);
        if (edad === null) {
            return res.status(400).json({
                success: false,
                error: 'No se pudo calcular la edad del paciente.'
            });
        }
        if (edad < 10 || edad > 19) {
            return res.status(400).json({
                success: false,
                error: `El paciente tiene ${edad} años. Solo se admite etapa de adolescencia (10-19 años).`
            });
        }

        // 5. Parsear fecha y hora de admisión
        const fechaAdmisionRaw = data.admision.fecha_admision;
        const fechaAdmision = parsearFechaAdmision(fechaAdmisionRaw);

        const horaAdmision = data.admision.hora_admision;
        let horaSolicitada = 0;
        let minutoSolicitado = 0;

        if (horaAdmision && typeof horaAdmision === 'object') {
            horaSolicitada = horaAdmision.Hours || 0;
            minutoSolicitado = horaAdmision.Minutes || 0;
        } else if (typeof horaAdmision === 'string' && horaAdmision.includes(':')) {
            const partes = horaAdmision.split(':');
            horaSolicitada = parseInt(partes[0], 10);
            minutoSolicitado = parseInt(partes[1], 10);
        } else {
            // Fallback: usar hora actual
            const ahora = new Date();
            horaSolicitada = ahora.getHours();
            minutoSolicitado = ahora.getMinutes();
        }

        // Validar rango horario básico
        if (horaSolicitada < HORA_INICIO || horaSolicitada > HORA_FIN || (horaSolicitada === HORA_FIN && minutoSolicitado > 0)) {
            return res.status(400).json({
                success: false,
                error: `La hora de atención (${String(horaSolicitada).padStart(2,'0')}:${String(minutoSolicitado).padStart(2,'0')}) está fuera del rango permitido (06:00 - 17:00).`
            });
        }

        // 6. Verificar que la misma admisión no esté ya registrada hoy
        const registrosHoy = await obtenerRegistrosDelDia(fechaAdmision);
        const yaExiste = registrosHoy.some(reg => reg.numero_admision === numeroAdmision);
        if (yaExiste) {
            return res.status(409).json({
                success: false,
                error: `La admisión ${numeroAdmision} ya fue registrada en la fecha ${fechaAdmision}. No se permite duplicado.`
            });
        }

        // 7. Calcular huecos libres
        const huecos = calcularHuecosLibres(fechaAdmision, registrosHoy);
        if (huecos.length === 0) {
            return res.status(409).json({
                success: false,
                error: `No hay espacios disponibles en el día ${fechaAdmision} (06:00 - 17:00).`
            });
        }

        // 8. Elegir el hueco más cercano a la hora solicitada
        const horaSolicitadaDate = new Date(`${fechaAdmision}T${String(horaSolicitada).padStart(2,'0')}:${String(minutoSolicitado).padStart(2,'0')}:00`);
        const inicioHueco = elegirHuecoCercano(huecos, horaSolicitadaDate);
        if (!inicioHueco) {
            return res.status(409).json({
                success: false,
                error: `No se encontró un hueco cercano en el día ${fechaAdmision}.`
            });
        }

        // 9. Extraer nueva hora y minuto
        const nuevaHora = inicioHueco.getHours();
        const nuevoMinuto = inicioHueco.getMinutes();
        const fechaHoraAsignada = formatearFechaHora(inicioHueco);

        // 10. Generar datos de adolescencia
        const genero = data.paciente.sexo;
        const admisionFormateada = adolescencia(data, genero, edad);

        // 11. Sobrescribir la hora de la historia con la nueva hora asignada
        admisionFormateada.hora_historia = `${String(nuevaHora).padStart(2, '0')}:${String(nuevoMinuto).padStart(2, '0')}`;

        // 12. Enviar a SaludPlus usando el token recibido en el body
        const responseExterna = await axios.post(SALUDPLUS_URL, admisionFormateada, {
            headers: {
                'Content-Type': 'application/json',
                'data': token
            }
        });

        // 13. Validar que la historia se haya guardado realmente
        const { valorRetorno, numeroHistoria, mensajeRetorno } = responseExterna.data || {};

        if (!valorRetorno || !numeroHistoria || valorRetorno === 0 || numeroHistoria === 0) {
            // La API no guardó la historia, lanzamos error con el mensaje devuelto
            const errorMsg = mensajeRetorno || 'La historia no pudo ser guardada (valorRetorno o numeroHistoria es 0)';
            throw new Error(errorMsg);
        }

        // 14. Guardar en el contador (solo si la historia se guardó correctamente)
        let contadorRespuesta = null;
        try {
            contadorRespuesta = await guardarEnContador(
                numeroAdmision,
                fechaHoraAsignada,
                'Historia generada exitosamente'
            );
        } catch (errorContador) {
            console.error('Error al guardar en contador:', errorContador.message);
            // No interrumpimos el flujo, solo registramos el error
        }

        // 15. Respuesta final exitosa
        return res.status(200).json({
            success: true,
            mensaje: `Historia guardada exitosamente (ID: ${valorRetorno}) y asignada al hueco: ${fechaHoraAsignada}`,
            hora_original_solicitada: `${String(horaSolicitada).padStart(2,'0')}:${String(minutoSolicitado).padStart(2,'0')}`,
            hora_asignada: `${String(nuevaHora).padStart(2, '0')}:${String(nuevoMinuto).padStart(2, '0')}`,
            admision: admisionFormateada,
            apiExterna: responseExterna.data,
            contador: contadorRespuesta || { success: false, message: 'No se pudo registrar en contador' }
        });

    } catch (error) {
        console.error('Error en GeneradorHs:', error.message);

        let errorMsg = error.message;
        let statusCode = 500;
        let externalData = null;

        if (error.response) {
            statusCode = error.response.status;
            errorMsg = error.response.data?.mensajeRetorno || error.response.statusText;
            externalData = error.response.data;
        } else if (error.request) {
            errorMsg = 'No se recibió respuesta de la API externa';
        }

        // Si el error es el que lanzamos manualmente (historia no guardada), devolvemos 400
        if (errorMsg.includes('La historia no pudo ser guardada')) {
            statusCode = 400;
        }

        return res.status(statusCode).json({
            success: false,
            error: 'Error al procesar la admisión o al enviar a SaludPlus',
            message: errorMsg,
            externalResponse: externalData
        });
    }
};

// ============================================================
// CONTROLADOR PARA DATOS CRUDOS (sin cambios)
// ============================================================
const getAdmissionRaw = async (req, res) => {
    try {
        const numeroAdmision = req.params.numeroAdmision ||
                               req.body.numeroAdmision ||
                               req.query.numeroAdmision;

        if (!numeroAdmision) {
            return res.status(400).json({
                success: false,
                error: 'Debe proporcionar el parámetro "numeroAdmision".'
            });
        }

        const resultado = await obtenerDatosAdmision(numeroAdmision);
        return res.status(200).json({
            success: true,
            admision: resultado.data
        });

    } catch (error) {
        console.error('Error en getAdmissionRaw:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Error interno en el servidor.',
            message: error.message
        });
    }
};

module.exports = { GeneradorHs, getAdmissionRaw };