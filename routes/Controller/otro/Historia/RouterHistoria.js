const express = require('express');
const routerHistoria = express.Router();

const { Hs_Anx } = require('../../historias');

routerHistoria.post('/Histronico', Hs_Anx);


module.exports = routerHistoria;
