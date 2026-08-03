// buscador/buscarIdAdmision.js
const axios = require('axios');

// ==================== CONFIGURACIÓN ====================
const TOKEN_BUSQUEDA =
  process.env.TOKEN_BUSQUEDA ||
  'qE+u6gALbCTcoaaZIVd9OLUyM1jBgsC4+YKt3ApDiVU=.1SS9/UCeyjpq9PyT8MBqPg==.wcFkBNOeMUO3EbN8I4nUXw==';

const TOKEN_DETALLES =
  process.env.TOKEN_DETALLES ||
  'iiSj9OyW+uZO2ZL5WQFb3LXwLRXPEPFk2jdH5tVcV0Y=.lGayPEg7GErPLTnqY9izNw==.wcFkBNOeMUO3EbN8I4nUXw==';

const API_BASE_URL = process.env.API_BASE_URL || 'https://balance.saludplus.co';

// ==================== MAPEO DE SEXOS ====================
const MAPA_SEXO = {
  1: 'FEMENINO',
  2: 'MASCULINO',
  3: 'INDEFINIDO'
};

const obtenerNombreSexo = (fk_sexo) => {
  if (fk_sexo === null || fk_sexo === undefined) return 'No especificado';
  return MAPA_SEXO[fk_sexo] || 'No especificado';
};

// ==================== FUNCIÓN AUXILIAR DE BÚSQUEDA ====================
const consultarBuscadorExterno = async (valorBusqueda, tipoBusqueda = null) => {
  if (!valorBusqueda) {
    throw new Error('El campo "valorBusqueda" es requerido');
  }

  const headers = {
    data: TOKEN_BUSQUEDA,
  };

  const bodyData = new URLSearchParams({
    sEcho: '2',
    iColumns: '8',
    sColumns: ',CODIGO,DOCUMENTO,NOMBRE,Entidad,FECHA,HORA,ESTADO',
    iDisplayStart: '0',
    iDisplayLength: '10',
    sSearch: valorBusqueda.toString().trim(),
    iSortingCols: '1',
    iSortCol_0: '0',
    sSortDir_0: 'asc',
  });

  const response = await axios({
    method: 'POST',
    url: `${API_BASE_URL}/admisiones/BucardorAdmisionesDatos`,
    params: {
      fechaInicial: '01/01/2024',
      fechaFinal: '12/31/2026',
      idRecurso: '0',
      SinCargo: 'False',
      idServicioIngreso: '3',
      idCaracteristica: '0',
      validarSede: 'True',
    },
    headers,
    data: bodyData.toString(),
    timeout: 30000,
  });

  if (!response.data || !response.data.aaData || response.data.aaData.length === 0) {
    throw new Error('No se encontraron registros en el buscador.');
  }

  const busquedaStr = String(valorBusqueda).trim();
  let registroEncontrado = null;

  const buscarEnColumna = (fila, columnaIndex) => {
    if (!fila || fila.length <= columnaIndex) return false;
    const valorColumna = String(fila[columnaIndex] || '').trim();
    
    if (columnaIndex === 1) {
      const numeroAdmision = valorColumna.split(/\s+/)[0];
      return numeroAdmision === busquedaStr;
    } else if (columnaIndex === 2) {
      const numeroDocumento = valorColumna.replace(/\D/g, '');
      return numeroDocumento === busquedaStr;
    }
    return false;
  };

  if (tipoBusqueda === 'admision') {
    registroEncontrado = response.data.aaData.find((fila) => buscarEnColumna(fila, 1));
  } else if (tipoBusqueda === 'documento') {
    registroEncontrado = response.data.aaData.find((fila) => buscarEnColumna(fila, 2));
  } else {
    registroEncontrado = response.data.aaData.find((fila) => buscarEnColumna(fila, 1)) || 
                         response.data.aaData.find((fila) => buscarEnColumna(fila, 2));
  }

  if (!registroEncontrado) {
    throw new Error(`No se halló una coincidencia exacta para la admisión o documento: "${valorBusqueda}"`);
  }

  return registroEncontrado;
};

// ==================== FUNCIÓN PRINCIPAL (RETORNA DATOS) ====================
const obtenerDatosAdmision = async (numeroAdmision) => {
  if (!numeroAdmision) {
    throw new Error('El número de admisión es requerido');
  }

  // Buscar el ID de admisión
  let idAdmision;
  try {
    const filaRegistro = await consultarBuscadorExterno(numeroAdmision, 'admision');
    idAdmision = filaRegistro[0];

    if (!idAdmision || isNaN(parseInt(idAdmision))) {
      throw new Error('El ID de admisión recuperado no tiene un formato válido.');
    }
  } catch (e) {
    console.error('Error en la fase de indexación/búsqueda:', e.message);
    throw new Error(`No se pudo localizar la admisión: ${e.message}`);
  }

  // Obtener detalles
  const urlDetalles = `${API_BASE_URL}/admisiones/AdmisionBuscarConAscendientes?idAdmision=${idAdmision}`;
  let detalles;
  
  try {
    const resp = await axios.get(urlDetalles, {
      headers: { data: TOKEN_DETALLES },
    });
    detalles = resp.data;
  } catch (e) {
    console.error('Error al invocar API de detalles:', e.message);
    throw new Error('Error de comunicación con el servidor externo de historias clínicas');
  }

  // Procesar datos
  const admision = detalles.admision || {};
  const paciente = detalles.paciente || {};
  const entidad = detalles.entidad || {};
  const historia = detalles.historia || {};
  const primeraFactura = (admision.facturas && admision.facturas.length > 0) ? admision.facturas[0] : {};
  const primeraConsulta = (primeraFactura.facturas_consultas && primeraFactura.facturas_consultas.length > 0) ? primeraFactura.facturas_consultas[0] : {};

  // ==================== PROCESAR DATOS DEL PACIENTE CON SEXO CORREGIDO ====================
  const pacienteConGenero = {
    ...paciente,
    // El sexo viene en el campo fk_sexo
    sexo: paciente.fk_sexo || null,
    sexo_nombre: obtenerNombreSexo(paciente.fk_sexo),
    genero: paciente.Genero || null
  };

  // ==================== CONSTRUIR RESPUESTA ====================
  return {
    data: {
      admision: {
        id_admision: admision.id_admision || null,
        numero_admision: admision.numero_admision || null,
        fecha_admision: admision.fecha_admision || null,
        hora_admision: admision.hora_admision || null,
        fk_institucion: admision.fk_institucion || null,
        id_contrato_entidad: admision.fk_contrato_entidad || null,
        fk_usuario_admision: admision.fk_usuario || null,
        nombre_acompanante: admision.nombre_acompanante || null,
        telefono_acompanante: admision.telefono_acompanante || null,
        nombre_responsable: admision.nombre_responsable || null,
        parentesco_responsable: admision.parentesco_responsable || null,
        telefono_responsable: admision.telefono_responsable || null,
      },
      paciente: {
        id_paciente: pacienteConGenero.id_paciente || null,
        documento_paciente: pacienteConGenero.documento_paciente || null,
        tipo_documento: pacienteConGenero.tipo_documento_Paciente || null,
        nombres: `${pacienteConGenero.nombre1_paciente || ''} ${pacienteConGenero.nombre2_paciente || ''}`.trim() || null,
        apellidos: `${pacienteConGenero.apellido1_paciente || ''} ${pacienteConGenero.apellido2_paciente || ''}`.trim() || null,
        fecha_nacimiento: pacienteConGenero.fecha_nacimiento || null,
        telefono: pacienteConGenero.telefono_paciente || null,
        direccion: pacienteConGenero.direccion_paciente || null,
        // ===== CAMPOS DE SEXO CORREGIDOS =====
        sexo: pacienteConGenero.sexo,              // Valor numérico: 1, 2 o 3
        sexo_nombre: pacienteConGenero.sexo_nombre, // Texto: "FEMENINO", "MASCULINO" o "INDEFINIDO"
        genero: pacienteConGenero.genero || null,   // Género autopercibido (si existe)
      },
      entidad: {
        id_entidad: entidad.id_entidad || null,
        nombre_entidad: entidad.nombre_entidad || null,
        nit: entidad.nit_entidad || null,
      },
      historia: {
        id_historia: historia.id_historia || null,
        numero_historia: historia.numero_historia || null,
        fk_usuario_historia: historia.fk_usuario || null,
      },
      facturacion: {
        id_factura: primeraFactura.id_factura || null,
        numero_factura: primeraFactura.numero_factura || null,
        id_factura_consultas: primeraConsulta.id_factura_consultas || null
      }
    }
  };
};

// ==================== MIDDLEWARE PARA EXPRESS ====================
const buscarAdmisionMiddleware = async (req, res) => {
  try {
    const { documento, numeroAdmision } = { ...req.body, ...req.query };

    if (!documento && !numeroAdmision) {
      return res.status(400).json({
        success: false,
        error: 'Debe proporcionar el parámetro "documento" o "numeroAdmision"',
      });
    }

    const valor = documento || numeroAdmision;
    const resultado = await obtenerDatosAdmision(valor);
    
    return res.status(200).json({
      success: true,
      data: resultado.data,
    });

  } catch (error) {
    console.error('Error crítico no controlado en buscarAdmision:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error interno de servidor',
      message: error.message,
    });
  }
};

// ==================== EXPORTAR ====================
module.exports = {
  obtenerDatosAdmision,      // Función que retorna datos (para usar programáticamente)
  buscarAdmisionMiddleware,  // Middleware para Express
  // Mantener compatibilidad con código existente que espera la función
  default: obtenerDatosAdmision
};