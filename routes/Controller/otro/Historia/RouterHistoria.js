const express = require('express');
const routerHistoria = express.Router();

const { Histronico } = require('./Histronico');
const { descargarReporte  } = require('./Exel');



routerHistoria.post('/Histronico', Histronico);
routerHistoria.post('/descargarReporte', descargarReporte);


module.exports = routerHistoria;
