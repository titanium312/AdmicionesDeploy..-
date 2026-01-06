const fetch = require('node-fetch');
const { usuariosInstitucion, instituciones } = require('./Instituciones.js');

const LOGIN_URL = 'https://api.saludplus.co/api/Auth/login';

/* =====================================================
   FUNCIÓN: OBTENER INSTITUCIÓN POR USUARIO
===================================================== */
async function obtenerInstitucionPorUsuario(idUsuario) {
  const usuario = usuariosInstitucion.find(u => u.idUsuario === Number(idUsuario));
  if (!usuario) return null;
  const institucion = instituciones.find(i => i.idInstitucion === usuario.idInstitucion);
  return institucion || null;
}

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
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const loginData = await loginResponse.json();

    if (!loginResponse.ok) {
      return res.status(loginResponse.status).json({
        error: loginData.error || 'Credenciales incorrectas'
      });
    }

    if (!loginData.id) {
      return res.status(400).json({ error: 'No se recibió ID de usuario' });
    }

    /* ==========================
       2. INSTITUCIÓN
    =========================== */
    const institucion = await obtenerInstitucionPorUsuario(loginData.id);
    if (!institucion) {
      return res.status(404).json({ error: 'El usuario no tiene institución asignada' });
    }

    /* ==========================
       3. OBJETO USUARIO
    =========================== */
    const usuario = {
      id_usuario: loginData.id,
      nombre: loginData.nombre,
      usuario: loginData.usuario,
      perfiles: loginData.perfiles || []
    };

    /* ==========================
       4. RESPUESTA FINAL
    =========================== */
    return res.json({
      token: loginData.token || null,
      usuario,
      institucion,
      perfiles: loginData.perfiles || []
    });

  } catch (error) {
    console.error('❌ Error login:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { obtenerDatosLogin };


