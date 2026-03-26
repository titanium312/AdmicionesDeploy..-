const path = require("path");
const fs = require('fs').promises;

// ───────── IMPORT: solo Hs_Anx (handler Express) ─────────
const { Hs_Anx } = require("../Controller/historias");
// Importamos las instituciones para obtener el NIT
const { instituciones } = require("../Controller/Base/Instituciones"); 

// ───────── Utils ─────────
const toCRLF = (s) => String(s).replace(/\r?\n/g, "\r\n");
const deaccent = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const safeWinName = (s) => s.replace(/[\\/:*?"<>|]/g, "_");
const guessFileName = (raw, fallback) => {
  let name = String(raw || fallback || "documento.pdf");
  if (!/\.pdf$/i.test(name)) name += ".pdf";
  return safeWinName(deaccent(name));
};
const escapeForBat = (str) => String(str).replace(/%/g, "%%");

// ───────── Helpers de URL base ─────────
function getBaseURL(req) {
  const xfProto = (req.headers["x-forwarded-proto"] || "").split(",")[0]?.trim();
  const xfHost = (req.headers["x-forwarded-host"] || "").split(",")[0]?.trim();
  const xfPrefix = (req.headers["x-forwarded-prefix"] || "").trim();

  const proto = xfProto || req.protocol || "http";
  const host = xfHost || req.headers.host;

  let prefix = "";
  if (xfPrefix) {
    prefix = xfPrefix.startsWith("/") ? xfPrefix : `/${xfPrefix}`;
    prefix = prefix.replace(/\/+$/, "");
  }

  return `${proto}://${host}${prefix}`;
}

// ───────── Bloques BAT con mejor manejo de errores ─────────
function makeBlock({ folder, url, pdfName, retryCount = 3 }) {
  const FLAG = `${safeWinName(deaccent(folder))}_${safeWinName(deaccent(pdfName)).replace(/\.pdf$/i, "")}_OK`;
  const out = `${folder}\\${pdfName}`;
  const curlBase = 'curl -L --retry 3 --retry-all-errors --retry-delay 5 --connect-timeout 30 --max-time 300 -A "!UA!" -H "Accept: application/pdf"';
  const urlEsc = escapeForBat(url);

  return {
    flagInit: `echo ${FLAG}=0`,
    block: `
:: ====== Descargar ${pdfName} → ${folder} ======
if not "!${FLAG}!"=="1" (
    if not exist "${folder}" mkdir "${folder}"
    echo [${folder}] Descargando ${pdfName} ...
    set "URL=${urlEsc}"
    set "OUT=${out}"
    set "RETRY=0"
    
    :retry_${FLAG}
    set /a RETRY+=1
    echo [${folder}] Intento !RETRY! de ${retryCount}...
    
    ${curlBase} -C - "!URL!" --output "!OUT!" --silent --fail
    
    if !errorlevel! equ 0 (
        echo [OK] ${pdfName} descargado correctamente
        > "!progresoFile!.tmp" findstr /v /b "${FLAG}=" "!progresoFile!" 2>nul
        >> "!progresoFile!.tmp" echo ${FLAG}=1
        move /Y "!progresoFile!.tmp" "!progresoFile!" >nul
    ) else (
        if !RETRY! lss ${retryCount} (
            echo [WARN] Error en descarga, reintentando en 3 segundos...
            ping 127.0.0.1 -n 4 >nul
            goto retry_${FLAG}
        ) else (
            echo [ERROR] ${pdfName} - Fallo despues de ${retryCount} intentos
            echo [ERROR] URL: !URL! >> "!errorLogFile!"
            echo [ERROR] Fecha: %date% %time% >> "!errorLogFile!"
        )
    )
) else (
    echo [SKIP] ${pdfName} ya estaba descargado.
)`.trim(),
  };
}

// ───────── Adaptador para llamar a Hs_Anx ─────────
async function callHsAnxAsFunction(query, authToken) {
  return new Promise((resolve, reject) => {
    const req = {
      query,
      body: {
        token: authToken
      },
      headers: {}
    };
    
    const res = {
      json: (data) => resolve(data),
      send: (data) => resolve(data),
      status: (code) => ({
        json: (data) => {
          if (code >= 400) {
            reject(new Error(`Hs_Anx devolvió ${code}: ${JSON.stringify(data)}`));
          } else {
            resolve(data);
          }
        },
        send: (data) => {
          if (code >= 400) {
            reject(new Error(`Hs_Anx devolvió ${code}: ${data}`));
          } else {
            resolve(data);
          }
        },
      }),
    };
    
    try {
      Hs_Anx(req, res).catch(reject);
    } catch (e) {
      reject(e);
    }
  });
}

// Obtener trabajos desde Hs_Anx
async function getTrabajosViaController(params, authToken, sendProgress) {
  if (sendProgress) {
    const queryInfo = params.numeroAdmision || params.numeroFactura || params.clave || 'desconocido';
    sendProgress({
      type: 'query_start',
      query: queryInfo,
      message: `🔍 Consultando documentos para: ${queryInfo}`,
      timestamp: new Date().toISOString()
    });
  }
  
  const data = await callHsAnxAsFunction({
    clave: params.clave,
    numeroFactura: params.numeroFactura,
    numeroAdmision: params.numeroAdmision,
    idAdmision: params.idAdmision,
    institucionId: params.institucionId,
    idUser: params.idUser,
    eps: params.eps,
    tipos: params.tipos,
    modalidad: params.modalidad,
  }, authToken);

  const jobs = [];
  if (!data || typeof data !== "object") return jobs;

  let totalEncontrados = 0;
  for (const [folder, items] of Object.entries(data)) {
    if (!Array.isArray(items)) continue;
    
    for (const item of items) {
      const url = String(item.url || "");
      if (!url) continue;
      
      const pdfName = guessFileName(item.nombrepdf || "documento.pdf");
      jobs.push({ 
        folder: safeWinName(deaccent(folder)), 
        url, 
        pdfName,
        nombreArchivo: item.nombreArchivo || pdfName,
        // Guardar metadatos para recuperación
        admision: params.numeroAdmision,
        tipo: item.tipo || 'desconocido'
      });
      totalEncontrados++;
    }
  }
  
  if (sendProgress) {
    const queryInfo = params.numeroAdmision || params.numeroFactura || params.clave || 'desconocido';
    sendProgress({
      type: 'query_result',
      query: queryInfo,
      total_encontrados: totalEncontrados,
      message: totalEncontrados > 0 
        ? `✅ Encontrados ${totalEncontrados} documentos para: ${queryInfo}`
        : `⚠️ No se encontraron documentos para: ${queryInfo}`,
      timestamp: new Date().toISOString()
    });
  }
  
  return jobs;
}

function displayTitleFromFolder(folder) {
  const clean = String(folder).replace(/^(factura|admision)[-_]/i, "");
  const m = clean.match(/(\d{3,})/);
  return m ? `${folder.startsWith('factura') ? 'FACTURA' : 'ADMISION'} ${m[1]}` : folder.toUpperCase();
}

// ───────── Guardar checkpoint para recuperación ─────────
async function saveCheckpoint(jobs, filename, metadata) {
  try {
    const checkpoint = {
      timestamp: new Date().toISOString(),
      total_jobs: jobs.length,
      jobs: jobs.map(j => ({
        folder: j.folder,
        pdfName: j.pdfName,
        url: j.url,
        nombreArchivo: j.nombreArchivo,
        admision: j.admision,
        tipo: j.tipo
      })),
      metadata
    };
    
    const checkpointPath = path.join(__dirname, '..', 'checkpoints', `${filename}.checkpoint.json`);
    const dir = path.dirname(checkpointPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2));
    
    return checkpointPath;
  } catch (err) {
    console.error('Error guardando checkpoint:', err);
    return null;
  }
}

// Controller principal con soporte SSE y recuperación
const BatAuto = async (req, res) => {
  try {
    const {
      admisiones,
      numeroAdmision, idAdmision, numeroFactura, clave,
      institucionId, idUser, eps,
      tipos, modalidad,
      stream = false,
      recoveryId = null // ID de recuperación para continuar descarga
    } = req.body || {};

    const normalizeModalidad = (m) => {
      if (!m) return "";
      const s = String(m).trim().toLowerCase();
      if (["cápita", "capita", "capíta"].includes(s)) return "capita";
      if (["evento", "eventos"].includes(s)) return "evento";
      if (["cap", "c"].includes(s)) return "capita";
      if (["ev", "e"].includes(s)) return "evento";
      return "";
    };
    
    const modalidadNorm = normalizeModalidad(modalidad);
    const authToken = req.body?.token;
    
    if (!authToken) {
      return res.status(401).json({ 
        success: false,
        error: "Token de autorización requerido EXCLUSIVAMENTE en body" 
      });
    }

    const missing = [];
    if (!institucionId) missing.push("institucionId");
    if (!idUser) missing.push("idUser");
    if (!eps) missing.push("eps");

    const haveSingleKey = !!(numeroAdmision || idAdmision || numeroFactura || clave);
    const admList = Array.isArray(admisiones) ? admisiones.filter(x => x != null && String(x).trim() !== "") : [];
    
    if (!haveSingleKey && admList.length === 0 && !recoveryId) {
      missing.push("admisiones[] | numeroAdmision | idAdmision | numeroFactura | clave | recoveryId");
    }
    
    if (missing.length) {
      return res.status(400).json({ 
        success: false,
        error: `Faltan parámetros: ${missing.join(", ")}` 
      });
    }

    // Configurar SSE si se solicita
    let sendProgress = null;
    let allJobs = [];
    let jobsMetadata = {};
    
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.flushHeaders();
      
      sendProgress = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };
    }

    // Si es recuperación, cargar jobs desde checkpoint
    if (recoveryId) {
      sendProgress && sendProgress({
        type: 'recovery',
        recoveryId,
        message: `🔄 Recuperando descarga anterior: ${recoveryId}`,
        timestamp: new Date().toISOString()
      });
      
      try {
        const checkpointPath = path.join(__dirname, '..', 'checkpoints', `${recoveryId}.checkpoint.json`);
        const checkpointData = await fs.readFile(checkpointPath, 'utf8');
        const checkpoint = JSON.parse(checkpointData);
        allJobs = checkpoint.jobs;
        jobsMetadata = checkpoint.metadata;
        
        sendProgress && sendProgress({
          type: 'recovery_success',
          total_jobs: allJobs.length,
          message: `✅ Recuperados ${allJobs.length} documentos para descargar`,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        sendProgress && sendProgress({
          type: 'recovery_error',
          error: err.message,
          message: `❌ No se pudo recuperar la descarga: ${err.message}`,
          timestamp: new Date().toISOString()
        });
        if (sendProgress) {
          res.end();
        } else {
          return res.status(404).json({ 
            success: false,
            error: `No se encontró el checkpoint: ${recoveryId}` 
          });
        }
        return;
      }
    } else {
      // Construir consultas normalmente
      const queries = [];
      if (admList.length > 0) {
        for (const adm of admList) {
          queries.push({ 
            numeroAdmision: String(adm), 
            institucionId, 
            idUser, 
            eps, 
            tipos, 
            modalidad: modalidadNorm 
          });
        }
      } else {
        queries.push({ 
          numeroAdmision, 
          idAdmision, 
          numeroFactura, 
          clave, 
          institucionId, 
          idUser, 
          eps, 
          tipos, 
          modalidad: modalidadNorm 
        });
      }

      // Acumular todos los trabajos con progreso
      let processedQueries = 0;
      const totalQueries = queries.length;
      
      for (const q of queries) {
        processedQueries++;
        const currentQuery = q.numeroAdmision || q.numeroFactura || q.clave || 'desconocido';
        
        if (sendProgress) {
          sendProgress({
            type: 'processing',
            current: processedQueries,
            total: totalQueries,
            query: currentQuery,
            message: `📋 Procesando admisión ${processedQueries} de ${totalQueries}: ${currentQuery}`,
            timestamp: new Date().toISOString()
          });
        }
        
        try {
          const jobs = await getTrabajosViaController(q, authToken, sendProgress);
          if (jobs && jobs.length > 0) {
            allJobs.push(...jobs);
            
            if (sendProgress) {
              sendProgress({
                type: 'documents_found',
                query: currentQuery,
                count: jobs.length,
                message: `📄 Se encontraron ${jobs.length} documentos para admisión ${currentQuery}`,
                timestamp: new Date().toISOString()
              });
            }
          } else if (sendProgress) {
            sendProgress({
              type: 'no_documents',
              query: currentQuery,
              message: `⚠️ No se encontraron documentos para admisión ${currentQuery}`,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error(`Error obteniendo trabajos para consulta ${JSON.stringify(q)}:`, error);
          if (sendProgress) {
            sendProgress({
              type: 'error',
              query: currentQuery,
              error: error.message,
              message: `❌ Error procesando admisión ${currentQuery}: ${error.message}`,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
      
      if (!allJobs.length) {
        if (sendProgress) {
          sendProgress({
            type: 'no_documents',
            message: '❌ No se encontraron documentos para los parámetros especificados',
            timestamp: new Date().toISOString()
          });
          sendProgress({
            type: 'end',
            message: 'Proceso finalizado sin resultados',
            timestamp: new Date().toISOString()
          });
          res.end();
        } else {
          return res.status(404).json({ 
            success: false,
            error: "No se encontraron documentos para esos parámetros" 
          });
        }
        return;
      }
      
      // Guardar metadata
      jobsMetadata = {
        institucionId,
        idUser,
        eps,
        tipos,
        modalidad: modalidadNorm,
        admisiones: admList,
        created: new Date().toISOString()
      };
    }

    if (sendProgress) {
      const folderSummary = {};
      for (const job of allJobs) {
        folderSummary[job.folder] = (folderSummary[job.folder] || 0) + 1;
      }
      
      sendProgress({
        type: 'summary',
        total_documents: allJobs.length,
        folders: folderSummary,
        message: `📊 Resumen: Total ${allJobs.length} documentos encontrados en ${Object.keys(folderSummary).length} carpetas`,
        timestamp: new Date().toISOString()
      });
    }

    // Construcción de bloques BAT
    const blocks = [];
    const flagsInit = [];

    const groups = new Map();
    for (const j of allJobs) {
      if (!groups.has(j.folder)) groups.set(j.folder, []);
      groups.get(j.folder).push(j);
    }

    for (const [folder, jobs] of groups.entries()) {
      blocks.push([
        "echo.",
        `echo ////////// ${displayTitleFromFolder(folder)} //////////////////`,
        "echo."
      ].join("\r\n"));

      for (const j of jobs) {
        blocks.push(`echo  ${j.nombreArchivo || j.pdfName}`);
      }
      blocks.push("echo.");

      for (const j of jobs) {
        const { flagInit, block } = makeBlock(j);
        flagsInit.push(flagInit);
        blocks.push(block);
      }

      blocks.push("");
    }

    let label;
    if (admList.length > 0) {
      const preview = admList.slice(0, 4).map(a => String(a)).join("_");
      label = `admisiones-${preview}${admList.length > 4 ? `_y_${admList.length - 4}_mas` : ""}`;
    } else if (numeroFactura) {
      label = `factura-${numeroFactura}`;
    } else if (numeroAdmision) {
      label = `admision-${numeroAdmision}`;
    } else if (idAdmision) {
      label = `admision-${idAdmision}`;
    } else if (clave) {
      label = `clave-${clave}`;
    } else if (recoveryId) {
      label = `recuperacion-${recoveryId}`;
    } else {
      label = "descargas";
    }
    
    const filename = `descargas-${safeWinName(deaccent(label))}.bat`;
    // ✅ CORRECCIÓN: Renombrar la variable para evitar conflicto
    const newRecoveryId = Date.now().toString();
    
    // Guardar checkpoint para recuperación futura
    const checkpointPath = await saveCheckpoint(allJobs, filename, jobsMetadata);
    
    const bat = toCRLF(`@echo off
chcp 65001 > nul
setlocal EnableExtensions EnableDelayedExpansion
title Descarga de documentos (curl) - RECUPERABLE

set "BASE=%~dp0"
set "mainFolder=%BASE%Documentos_Descargados"
set "progresoFile=descarga_progreso.txt"
set "errorLogFile=errores_descarga.log"
set "UA=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
set "RECOVERY_ID=${newRecoveryId}"

echo.
echo ==========================================
echo   DESCARGADOR DE DOCUMENTOS
echo   ID Recuperación: %RECOVERY_ID%
echo ==========================================
echo.

where curl >nul 2>&1 || (
    echo [ERROR] curl no esta en PATH
    echo.
    echo Para instalar curl:
    echo   1. Descargar de https://curl.se/windows/
    echo   2. Agregar a PATH del sistema
    pause
    goto :EOF
)

if not exist "!mainFolder!" mkdir "!mainFolder!"
pushd "!mainFolder!"

if not exist "!progresoFile!" (
  ${flagsInit.join("\n  ")}
) > "!progresoFile!"

for /f "tokens=1,2 delims==" %%A in ('type "!progresoFile!"') do set "%%A=%%B"

echo.
echo [INFO] Iniciando descarga de ${allJobs.length} documento(s)...
echo [INFO] Para reanudar en caso de fallo, guarda este ID: %RECOVERY_ID%
echo.

${blocks.join("\n\n")}

popd

:: Contar documentos completados
set "COMPLETED=0"
set "TOTAL=${allJobs.length}"
for /f "tokens=1,2 delims==" %%A in ('type "!mainFolder!\\!progresoFile!"') do (
    if "%%B"=="1" set /a COMPLETED+=1
)

echo.
echo ==========================================
echo   RESUMEN DE DESCARGA
echo ==========================================
echo   Documentos totales: %TOTAL%
echo   Descargados: %COMPLETED%
echo   Pendientes: $((TOTAL - COMPLETED))
echo.

if %COMPLETED% equ %TOTAL% (
    echo ✅ TODO COMPLETADO CORRECTAMENTE
    echo.
    echo Abriendo carpeta de descargas...
    start "" explorer "!mainFolder!"
    echo Limpiando archivos temporales...
    del /f /q "!mainFolder!\\!progresoFile!" 2>nul
    del /f /q "!mainFolder!\\!errorLogFile!" 2>nul
    ping 127.0.0.1 -n 2 >nul
    start "" /b cmd /c del /q "%~f0"
) else (
    echo ⚠️ DESCARGA INCOMPLETA
    echo.
    echo Para reanudar, guarda este ID: %RECOVERY_ID%
    echo.
    echo Puedes reanudar ejecutando:
    echo   %~nx0
    echo.
    if exist "!errorLogFile!" (
        echo Errores encontrados:
        type "!errorLogFile!"
        echo.
    )
)

echo.
echo Presiona cualquier tecla para salir...
pause >nul
`);

    if (sendProgress) {
      sendProgress({
        type: 'complete',
        bat_filename: filename,
        recovery_id: newRecoveryId,
        checkpoint_path: checkpointPath,
        total_documents: allJobs.length,
        bat_content: bat,
        message: `✅ Proceso completado. Archivo BAT generado: ${filename}`,
        timestamp: new Date().toISOString()
      });
      
      sendProgress({
        type: 'recovery_info',
        recovery_id: newRecoveryId,
        message: `🔑 ID de recuperación: ${newRecoveryId}. Guarda este ID para reanudar descargas fallidas.`,
        timestamp: new Date().toISOString()
      });
      
      sendProgress({
        type: 'end',
        message: 'Proceso finalizado exitosamente',
        timestamp: new Date().toISOString()
      });
      
      res.end();
    } else {
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("X-Recovery-Id", newRecoveryId);
      res.setHeader("X-Total-Documents", allJobs.length);
      res.send(bat);
    }
  } catch (err) {
    console.error("BatAuto error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message || "Error interno" 
    });
  }
};

// Endpoint para listar checkpoints disponibles
const ListCheckpoints = async (req, res) => {
  try {
    const checkpointsDir = path.join(__dirname, '..', 'checkpoints');
    const files = await fs.readdir(checkpointsDir).catch(() => []);
    const checkpoints = [];
    
    for (const file of files) {
      if (file.endsWith('.checkpoint.json')) {
        try {
          const data = await fs.readFile(path.join(checkpointsDir, file), 'utf8');
          const checkpoint = JSON.parse(data);
          checkpoints.push({
            id: file.replace('.checkpoint.json', ''),
            timestamp: checkpoint.timestamp,
            total_jobs: checkpoint.total_jobs,
            metadata: checkpoint.metadata
          });
        } catch (err) {
          console.error('Error leyendo checkpoint:', err);
        }
      }
    }
    
    res.json({ success: true, checkpoints });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { BatAuto, ListCheckpoints };