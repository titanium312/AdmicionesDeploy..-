const Tokenfijo14='4t8/ugObIEqPRBqgNMaqZgIcgbf1pWytKq44JFP/meo=.qSTbSfTuauUhk/PDAmMBhw==.W8yyMby3724tK/yRfaS43A==';

const TokenMio='qE+u6gALbCTcoaaZIVd9OLUyM1jBgsC4+YKt3ApDiVU=.1SS9/UCeyjpq9PyT8MBqPg==.wcFkBNOeMUO3EbN8I4nUXw==';

const usuariosInstitucion = [
  { idUsuario: 6874, nombre: 'Rbarreto', idInstitucion: 20 ,Tksesicion: TokenMio},

  { idUsuario: 8098, nombre: 'MIGUELMARINO', idInstitucion: 14 , Tksesicion: Tokenfijo14 },

  { idUsuario: 6853, nombre: 'JERONIMORTEGA', idInstitucion: 20 ,Tksesicion: TokenMio },

  { idUsuario: 10763, nombre: 'Ysalcedo', idInstitucion: 14 , Tksesicion: Tokenfijo14}, 

  { idUsuario: 10762, nombre: 'Miguelmartinez', idInstitucion: 14 ,Tksesicion: Tokenfijo14},

  { idUsuario: 11129, nombre: '1074011830', idInstitucion: 45 , Tksesicion: 'tuJL6kKcwcINYga8n3z2aYQpJNYwvrC8KfqWcUyfhQM=.zDnZgS1yR6oRFW9nEhJuKw==.SoEw/Rt/mGLWlraQIrBnbQ=='},

  // Medicos 

  { idUsuario: 6905, nombre: 'Abuelvas', idInstitucion: 20 , Tksesicion: "E1hEfZwRUGHkXJKDiaW+Bgm3jpdKLKQXsAuNlMUbZEo=.lGayPEg7GErPLTnqY9izNw==.wcFkBNOeMUO3EbN8I4nUXw==" ,contraseña: "1007734157"},
  { idUsuario: 6895, nombre: 'Ccermeno', idInstitucion: 20 , Tksesicion: "E1hEfZwRUGHkXJKDiaW+Bgm3jpdKLKQXsAuNlMUbZEo=.6xBgyEhLrIebPSUnxZhHYQ==.wcFkBNOeMUO3EbN8I4nUXw==" ,contraseña: "1233343217"}





];

const instituciones = [
  {
    idInstitucion: 20,
    nombre: 'ESE HOSPITAL SAN JORGE AYAPEL',
    nit: "812001219",
    
  },
  {
    idInstitucion: 14,
    nombre: 'CENTRO DE SALUD SAN JOSE DE TOLUVIEJO ESE',
    nit: "823000696",
    
  },
  {
    idInstitucion: 45,
    nombre: 'ESE CENTRO DE SALUD SANTA LUCIA',
    nit: "802006991",
    
  }
];

module.exports = { usuariosInstitucion, instituciones };
