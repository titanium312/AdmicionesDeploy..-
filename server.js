const express = require('express');
const path = require('path');
const cors = require('cors');
const fileUpload = require('express-fileupload');

const app = express();
// Render provee el puerto en la variable de entorno PORT
const PORT = process.env.PORT || 3000;

// Servir estáticos desde 'public'
app.use(express.static(path.join(__dirname, 'public')));

// (Opcional) Servir node_modules. En producción no suele ser necesario.
// Si no lo necesitas, puedes comentar esta línea.
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// Middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload());

// Rutas
const router = require('./routes/router');
app.use(router);

// Ruta personalizada para laboratorio
app.get('/laboratorio', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/lab', 'lab.html'));
});


app.get('/cambiarFecha', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/otros', 'cambiar.html'));
});

app.get('/Historia', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/historia', 'Historia.html'));
});



// (Opcional) Respuesta simple en la raíz para health checks
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

// Iniciar servidor (en 0.0.0.0 para aceptar conexiones externas)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Página de laboratorio: http://localhost:${PORT}/laboratorio`);
  console.log(`Página de cambiar fecha: http://localhost:${PORT}/cambiarFecha`);
});
