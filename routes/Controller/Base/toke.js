
const CryptoJS = require('crypto-js');
// Ahora recibe el userId como parámetro, no intenta importar nada
function createToken(reportName, institucionId, idCaracteristica, userId) {
  let now = new Date();
  let dateini = new Date(now.getTime() + 15 * 60000); // Expira en 15 minutos

  let tokenOut = reportName;
  if (tokenOut.length < 16) {
    tokenOut = tokenOut.padEnd(16, '0');
  } else if (tokenOut.length > 16) {
    tokenOut = tokenOut.substring(0, 16);
  }

  let key = CryptoJS.enc.Utf8.parse(tokenOut);
  let iv = CryptoJS.enc.Utf8.parse(tokenOut);

  let data = {
    institucionId: Number(institucionId),
    userId: userId,
    expiration: dateini.getTime(),
    permiso: {
      Caracteristica: idCaracteristica,
    },
  };

  let dataToSend = JSON.stringify(data);

  let encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(dataToSend), key, {
    keySize: 128 / 8,
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  let dataSend = encrypted
    .toString()
    .replaceAll('+', 'xMl3Jk')
    .replaceAll('/', 'Por21Ld')
    .replaceAll('=', 'Ml32');

  return dataSend;
}

// Exporta con nombres correctos
module.exports = { createToken };









