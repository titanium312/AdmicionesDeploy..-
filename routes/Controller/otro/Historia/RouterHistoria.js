const express = require('express');
const routerHistoria = express.Router();

// AUDITORIA -----------------------------------------------------------
const { AdmisionBuscarConAscendientes } = require('./Controller/Buscadores/AdmisionBuscarConAscendientes');
const { HistoriaClinica } = require('./Controller/HistoriaClinica');

const { Histronico } = require('./Histronico/Histronico');

// AUDITORIA -----------------------------------------------------------
routerHistoria.get('/AdmisionBuscarConAscendientes', AdmisionBuscarConAscendientes);

routerHistoria.post('/HistoriaClinica', HistoriaClinica);

routerHistoria.post('/Histronico', Histronico);

module.exports = routerHistoria;