const express = require('express');
const routerHistoria = express.Router();

// Importar el controlador CORRECTAMENTE
const { Histronico } = require('../Histronico/Histronico'); // Ajusta la ruta



// También importar el controlador de admisiones
const { GeneradorHs } = require('./Controller/GeneradorHs'); // Ajusta la ruta
const { buscarAdmisionMiddleware } = require('./Controller/buscador/buscarIdAdmision');

// Definir rutas

routerHistoria.post('/GeneradorHs', GeneradorHs);
routerHistoria.post('/buscar', buscarAdmisionMiddleware);








routerHistoria.post('/Histronico', Histronico);


module.exports = routerHistoria;