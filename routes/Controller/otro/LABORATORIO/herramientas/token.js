const axios = require('axios');

// 🔐 CONFIGURA AQUÍ
const AUTH_URL = 'https://api.saludplus.co/api/auth/Login';

const CREDENTIALS = {
  username: 'rbarreto',
  password: '1235239398'
};

module.exports = {
  getToken: async () => {
    try {
      const response = await axios.post(
        AUTH_URL,
        CREDENTIALS,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      const data = response.data;

      if (!data || !data.token) {
        throw new Error('Token no recibido desde SaludPlus');
      }

      // 🔹 AQUÍ SOLO RETORNA EL TOKEN
      return data.token;

    } catch (error) {
      console.error(
        '🔥 Error obteniendo token SaludPlus:',
        error.response?.data || error.message
      );
      throw new Error('No se pudo obtener token de autenticación');
    }
  }
};
