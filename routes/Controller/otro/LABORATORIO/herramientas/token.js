const axios = require('axios');

const AUTH_URL = 'https://api.saludplus.co/api/auth/Login';
const CREDENTIALS = {
  username: 'rbarreto',
  password: '1235239398'
};

module.exports = {
  getToken: async () => {
    try {
      const response = await axios.post(AUTH_URL, CREDENTIALS, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      const data = response.data;
      // Intenta sacar el token de la raíz o del objeto result
      const token = data.token || (data.result && data.result.token);

      if (!token) {
        throw new Error('La API no devolvió un token válido');
      }

      return token;
    } catch (error) {
      console.error('🔥 Error Login:', error.response?.data || error.message);
      throw new Error('Error de autenticación con SaludPlus');
    }
  }
};