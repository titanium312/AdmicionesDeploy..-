const path = require("path");

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

// ───────── Bloques BAT ─────────
function makeBlock({ folder, url, pdfName }) {
  const FLAG = `${safeWinName(deaccent(folder))}_${safeWinName(deaccent(pdfName)).replace(/\.pdf$/i, "")}_OK`;
  const out = `${folder}\\${pdfName}`;
  const curlBase = 'curl -L --retry 3 --retry-all-errors --retry-delay 3 --connect-timeout 15 --max-time 180 -A "!UA!" -H "Accept: application/pdf"';
  const urlEsc = escapeForBat(url);

  return {
    flagInit: `echo ${FLAG}=0`,
    block: `
:: ====== Descargar ${pdfName} → ${folder} ======
if not "!${FLAG}!"=="1" (
    if not exist "${folder}" mkdir "${folder}"
    echo Descargando ${pdfName} ...
    set "URL=${urlEsc}"
    set "OUT=${out}"
    ${curlBase} -C - "!URL!" --output "!OUT!" --silent
    if not !errorlevel! equ 0 (
        echo  [WARN] Reintentando sin reanudacion...
        ${curlBase} "!URL!" --output "!OUT!" --silent
    )
    if !errorlevel! equ 0 (
        echo  [OK] ${pdfName}
        > "!progresoFile!.tmp" findstr /v /b "${FLAG}=" "!progresoFile!" 2>nul
        >> "!progresoFile!.tmp" echo ${FLAG}=1
        move /Y "!progresoFile!.tmp" "!progresoFile!" >nul
    ) else (
        echo  [ERROR] ${pdfName}
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
        nombreArchivo: item.nombreArchivo || pdfName
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

// Controller principal con soporte SSE
const BatAuto = async (req, res) => {
  try {
    const {
      admisiones,
      numeroAdmision, idAdmision, numeroFactura, clave,
      institucionId, idUser, eps,
      tipos, modalidad,
      stream = false // Nuevo: si es true, usa SSE
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
    
    if (!haveSingleKey && admList.length === 0) {
      missing.push("admisiones[] | numeroAdmision | idAdmision | numeroFactura | clave");
    }
    
    if (missing.length) {
      return res.status(400).json({ 
        success: false,
        error: `Faltan parámetros: ${missing.join(", ")}` 
      });
    }

    // Configurar SSE si se solicita
    let sendProgress = null;
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.flushHeaders();
      
      sendProgress = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };
      
      sendProgress({
        type: 'start',
        total_queries: admList.length > 0 ? admList.length : 1,
        admisiones: admList.length > 0 ? admList : [numeroAdmision || numeroFactura || clave],
        message: `🚀 Iniciando descarga de documentos...`,
        timestamp: new Date().toISOString()
      });
    }

    // Construir consultas
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
    const allJobs = [];
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
    } else {
      label = "descargas";
    }
    
    const filename = `descargas-${safeWinName(deaccent(label))}.bat`;

    const bat = toCRLF(`@echo off
chcp 65001 > nul
setlocal EnableExtensions EnableDelayedExpansion
title Descarga de documentos (curl)

set "BASE=%~dp0"
set "mainFolder=%BASE%Documentos_Descargados"
set "progresoFile=descarga_progreso.txt"
set "UA=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

where curl >nul 2>&1 || (echo [ERROR] curl no esta en PATH & goto :EOF)

if not exist "!mainFolder!" mkdir "!mainFolder!"
pushd "!mainFolder!"

if not exist "!progresoFile!" (
  ${flagsInit.join("\n  ")}
) > "!progresoFile!"

for /f "tokens=1,2 delims==" %%A in ('type "!progresoFile!"') do set "%%A=%%B"

${blocks.join("\n\n")}

popd

set "CLEANUP=0"
for /f "tokens=1,2 delims==" %%A in ('type "!mainFolder!\\!progresoFile!"') do (
  if "%%B"=="0" set "CLEANUP=1"
)
if "!CLEANUP!"=="0" (
  echo Todo descargado. Abriendo carpeta...
  start "" explorer "!mainFolder!"
  echo Limpiando...
  del /f /q "!mainFolder!\\!progresoFile!" 2>nul
  ping 127.0.0.1 -n 2 >nul
  start "" /b cmd /c del /q "%~f0"
) else (
  echo Proceso incompleto. Puedes relanzar este BAT para reanudar.
)

pause
`);

    if (sendProgress) {
      sendProgress({
        type: 'complete',
        bat_filename: filename,
        total_documents: allJobs.length,
        bat_content: bat,
        message: `✅ Proceso completado. Archivo BAT generado: ${filename}`,
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

module.exports = { BatAuto };