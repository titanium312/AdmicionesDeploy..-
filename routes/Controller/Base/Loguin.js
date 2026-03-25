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
      headers: { 
        'Content-Type': 'application/json', 
        'Accept': 'application/json' 
      },
      body: JSON.stringify({ username, password })
    });

    const data = await loginResponse.json();

    // Validamos si la respuesta de SaludPlus fue exitosa según su esquema
    if (!loginResponse.ok || !data.isSuccessful) {
      return res.status(loginResponse.status || 401).json({
        error: data.messages || 'Credenciales incorrectas'
      });
    }

    // Extraemos la información desde el objeto "result"
    const { result } = data;

    if (!result || !result.id) {
      return res.status(400).json({ error: 'No se recibió ID de usuario en la respuesta' });
    }

    /* ==========================
       2. INSTITUCIÓN
    =========================== */
    const institucion = await obtenerInstitucionPorUsuario(result.id);
    if (!institucion) {
      return res.status(404).json({ error: 'El usuario no tiene institución asignada en el sistema local' });
    }

    /* ==========================
       3. RESPUESTA FINAL (Mapeada)
    =========================== */
    // Nota: Se eliminaron los campos de "perfiles" según tu instrucción
    return res.json({
      token: result.token || null,
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