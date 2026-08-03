// utils/dateUtils.js

/**
 * Convierte una fecha en formato "/Date(milisegundos)/" a un objeto Date.
 * @param {string} fechaStr - Ejemplo: "/Date(1231477200000)/"
 * @returns {Date|null}
 */
const parseDate = (fechaStr) => {
    if (!fechaStr) return null;
    const match = fechaStr.match(/\/Date\((\d+)\)\//);
    if (!match) return null;
    const milisegundos = parseInt(match[1], 10);
    return new Date(milisegundos);
};

/**
 * Calcula la edad en años a partir de una fecha de nacimiento.
 * @param {string} fechaNacimiento - Fecha en formato "/Date(...)/"
 * @returns {number|null} - Edad en años (entero) o null si no se puede calcular
 */
const calcularEdad = (fechaNacimiento) => {
    const fechaNac = parseDate(fechaNacimiento);
    if (!fechaNac) return null;

    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNac.getFullYear();
    const mes = hoy.getMonth() - fechaNac.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
        edad--;
    }
    return edad;
};

module.exports = { parseDate, calcularEdad };