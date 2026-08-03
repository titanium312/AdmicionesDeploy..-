const fetch = require('node-fetch');
const { usuariosInstitucion, instituciones } = require('./Instituciones.js');

const LOGIN_URL = 'https://api.saludplus.co/api/Auth/login';

/* =====================================================
   CONTROLLER LOGIN
===================================================== */
async function obtenerDatosLogin(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Faltan credenciales' });
    }

    /* ==========================
       1. LOGIN API EXTERNA
    =========================== */
    const loginResponse = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Accept': 'application/json' 
      },
      body: JSON.stringify({ username, password })
    });

    const data = await loginResponse.json();

    if (!loginResponse.ok || !data.isSuccessful) {
      return res.status(loginResponse.status || 401).json({
        error: data.messages || 'Credenciales incorrectas'
      });
    }

    const { result } = data;

    if (!result || !result.id) {
      return res.status(400).json({ error: 'No se recibió ID de usuario en la respuesta' });
    }

    /* ==========================
       2. BUSCAR USUARIO LOCAL Y SU INSTITUCIÓN
    =========================== */
    const usuarioLocal = usuariosInstitucion.find(u => u.idUsuario === Number(result.id));
    if (!usuarioLocal) {
      return res.status(404).json({ error: 'El usuario no está registrado en el sistema local' });
    }

    const institucion = instituciones.find(i => i.idInstitucion === usuarioLocal.idInstitucion);
    if (!institucion) {
      return res.status(404).json({ error: 'Institución no encontrada para este usuario' });
    }

    /* ==========================
       3. RESPUESTA FINAL (incluye tokSesion)
    =========================== */
    return res.json({
      token: result.token || null,
      tokSesion: usuarioLocal.Tksesicion,   // ← extraído del arreglo local
      usuario: {
        id_usuario: result.id,
        nombre: result.nombre,
        usuario: result.usuario,
        email: result.email
      },
      institucion
    });

  } catch (error) {
    console.error('❌ Error login:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { obtenerDatosLogin };