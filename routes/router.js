const express = require('express');
const router = express.Router();

// AUDITORIA -----------------------------------------------------------
const { Hs_Anx } = require('./Controller/historias');
const { obtenerDatosLogin } = require('./Controller/Base/Loguin');
const { BatAuto} = require('./descargar/descargar');
const {ConsultaIdIntermedio}  = require('./Controller/Base/ids/ConsultaIdIntermedio');

// LABORATORIO -----------------------------------------------------------
const { DescargarLaboratorio,DescargarLaboratorioTest } = require('./Controller/otro/LABORATORIO/laboratorio');
const { buscarPaciente } = require('./Controller/otro/LABORATORIO/herramientas/buscarPaciente');
const { buscarFechaNacimiento } = require('./Controller/otro/LABORATORIO/herramientas/BuscarPacienteFecha');
// HISTORIA CLINICA -----------------------------------------------------------
const routerHistoria = require('./Controller/otro/Historia/RouterHistoria');
// AMICIONES -----------------------------------------------------------
const routerAD = require('./Controller/otro/Admiciones/router');
//Router<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

// AUDITORIA -----------------------------------------------------------
router.get('/Hs_Anx', Hs_Anx);
router.post('/ConsultaIdIntermedio', ConsultaIdIntermedio);
router.post('/descargar', BatAuto);
// LABORATORIO -----------------------------------------------------------
router.post('/DescargarLaboratorio', DescargarLaboratorio);
router.post('/DescargarLaboratorioTest', DescargarLaboratorioTest);
router.post('/buscarPaciente', buscarPaciente);
router.get('/buscarFechaNacimiento', buscarFechaNacimiento);
// HISTORIA CLINICA -----------------------------------------------------------
router.use('/', routerHistoria);
// AMICIONES -----------------------------------------------------------
router.use('/', routerAD);


//area de consultas de datos login
router.post('/Loguin', obtenerDatosLogin);

// Route to test server
router.get('/router', (req, res) => {
  res.send('Hola Mundo'); // Send a response to the client
});

module.exports = router;
