const express = require('express');
const routerAD = express.Router();

// Controladores (asegúrate de que las rutas de importación sean correctas)
const { cambiarFechaEmision } = require('./Controller/cambiarF');
const { NumeroFactura } = require('./Controller/generarNumeroFactura');
const { EnviarADian } = require('./Controller/EnviarAdian');
const { buscarFactura } = require('./Controller/buscarFactura');

// Rutas
routerAD.post('/cambiar-fecha', cambiarFechaEmision);
routerAD.get('/GenerarNumeroFactura', NumeroFactura);
routerAD.post('/EnviarDian', EnviarADian);
routerAD.post('/buscarFactura', buscarFactura);

// Ruta de prueba
routerAD.get('/routerAD', (req, res) => {
  res.send('Ruta de prueba AD funcionando');
});

module.exports = routerAD;