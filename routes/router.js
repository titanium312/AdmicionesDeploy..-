const express = require('express');
const router = express.Router();

// AUDITORIA -----------------------------------------------------------
const { Hs_Anx } = require('./Controller/historias');
const { obtenerDatosLogin } = require('./Controller/Base/Loguin');
const { 
  BatAuto,

} = require('./descargar/descargar');

const {ConsultaIdIntermedio}  = require('./Controller/Base/ids/ConsultaIdIntermedio');








// AMICIONES -----------------------------------------------------------
const { cambiarFechaEmision  } = require('./Controller/otro/Admiciones/cambiarF');
const { NumeroFactura  } = require('./Controller/otro/Admiciones/generarNumeroFactura');
const { EnviarADian } = require('./Controller/otro/Admiciones/EnviarAdian');
const { buscarFactura } = require('./Controller/otro/Admiciones/buscarFactura');




// LABORATORIO -----------------------------------------------------------
const { DescargarLaboratorio,DescargarLaboratorioTest } = require('./Controller/otro/LABORATORIO/laboratorio');
const { buscarPaciente } = require('./Controller/otro/LABORATORIO/herramientas/buscarPaciente');
const { buscarFechaNacimiento } = require('./Controller/otro/LABORATORIO/herramientas/BuscarPacienteFecha');




//Router<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

// AUDITORIA -----------------------------------------------------------
router.get('/Hs_Anx', Hs_Anx);

router.post('/ConsultaIdIntermedio', ConsultaIdIntermedio);

router.post('/descargar', BatAuto);



// AMICIONES -----------------------------------------------------------
router.post('/cambiar-fecha', cambiarFechaEmision);
router.get('/GenerarNumeroFactura', NumeroFactura);
router.post('/EnviarDian', EnviarADian);
router.post('/buscarFactura', buscarFactura);





// LABORATORIO -----------------------------------------------------------
router.post('/DescargarLaboratorio', DescargarLaboratorio);
router.post('/DescargarLaboratorio/test', DescargarLaboratorioTest);
router.post('/buscarPaciente', buscarPaciente);
router.get('/buscarFechaNacimiento', buscarFechaNacimiento);



//area de consultas de datos login
router.post('/Loguin', obtenerDatosLogin);

// Route to test server
router.get('/router', (req, res) => {
  res.send('Hola Mundo'); // Send a response to the client
});

module.exports = router;
