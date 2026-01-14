const path = require("path");

// ───────── IMPORT: solo Hs_Anx (handler Express) ─────────
const { Hs_Anx } = require("../Controller/historias");

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

// URL absoluta para factura electrónica
function buildFacturaURLAbsolute(req, { numeroAdmision, institucionId }) {
  const base = getBaseURL(req);
  const qs = new URLSearchParams({
    sSearch: String(numeroAdmision || ""),
    idInstitucion: String(institucionId),
  });
  return `${base}/facturaElectronica?${qs.toString()}`;
}

// ───────── Validar si factura existe ─────────
async function verificarFacturaExiste(req, { numeroAdmision, institucionId }) {
  try {
    const facturaUrl = buildFacturaURLAbsolute(req, { numeroAdmision, institucionId });
    const respuesta = await fetch(facturaUrl);

    if (!respuesta.ok) {
      return { existe: false, error: `HTTP ${respuesta.status}` };
    }

    const contentType = respuesta.headers.get("content-type") || "";

    // ✅ CASO CORRECTO: ES UN PDF
    if (contentType.includes("application/pdf")) {
      return { existe: true, url: facturaUrl };
    }

    // ⚠️ CASO JSON (no existe factura)
    if (contentType.includes("application/json")) {
      const data = await respuesta.json();

      if (data.ok === false) {
        return {
          existe: false,
          mensaje: data.message || data.detalle || "Factura no encontrada"
        };
      }
    }

    // ⚠️ Cualquier otro content-type inesperado
    return {
      existe: false,
      error: `Respuesta inesperada (${contentType})`
    };

  } catch (error) {
    console.error(`[ERROR] Validando factura para admisión ${numeroAdmision}:`, error.message);
    return { existe: false, error: error.message };
  }
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

function makeFacturaBlock({ folder, facturaUrl, admNumber }) {
  const FLAG = `${safeWinName(deaccent(folder))}_FACTURA_OK`;
  const pdfName = guessFileName(`factura-${admNumber}.pdf`, "factura-electronica.pdf");
  const out = `${folder}\\${pdfName}`;
  const curlBase = 'curl -L --retry 3 --retry-all-errors --retry-delay 3 --connect-timeout 15 --max-time 180 -A "!UA!" -H "Accept: application/pdf"';
  const urlEsc = escapeForBat(facturaUrl);

  return {
    flagInit: `echo ${FLAG}=0`,
    block: `
:: ====== Descargar FACTURA ELECTRONICA → ${folder} ======
if not "!${FLAG}!"=="1" (
    if not exist "${folder}" mkdir "${folder}"
    echo Descargando Factura Electronica ...
    set "URL=${urlEsc}"
    set "OUT=${out}"
    ${curlBase} -C - "!URL!" --output "!OUT!" --silent
    if not !errorlevel! equ 0 (
        echo  [WARN] Reintentando sin reanudacion...
        ${curlBase} "!URL!" --output "!OUT!" --silent
    )
    if !errorlevel! equ 0 (
        echo  [OK] Factura Electronica
        > "!progresoFile!.tmp" findstr /v /b "${FLAG}=" "!progresoFile!" 2>nul
        >> "!progresoFile!.tmp" echo ${FLAG}=1
        move /Y "!progresoFile!.tmp" "!progresoFile!" >nul
    ) else (
        echo  [ERROR] Factura Electronica
    )
) else (
    echo [SKIP] Factura Electronica ya estaba descargada.
)`.trim(),
  };
}

// ───────── Adaptador para llamar a Hs_Anx ─────────
async function callHsAnxAsFunction(query, authToken) {
  return new Promise((resolve, reject) => {
    // Crear un objeto request que cumpla con lo que espera Hs_Anx
    const req = {
      query,  // Parámetros por query string
      body: {
        token: authToken  // 🔴 Token EXCLUSIVAMENTE en body
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
async function getTrabajosViaController(params, authToken) {
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

  // Hs_Anx devuelve un objeto agrupado por clave
  for (const [folder, items] of Object.entries(data)) {
    if (!Array.isArray(items)) continue;
    
    for (const item of items) {
      const url = String(item.url || "");
      if (!url) continue;
      
      // Usar nombrepdf que ya viene formateado correctamente
      const pdfName = guessFileName(item.nombrepdf || "documento.pdf");
      jobs.push({ 
        folder: safeWinName(deaccent(folder)), 
        url, 
        pdfName,
        // Información adicional para mostrar
        nombreArchivo: item.nombreArchivo || pdfName
      });
    }
  }
  return jobs;
}

// ───────── Helpers de presentación ─────────
function displayTitleFromFolder(folder) {
  const clean = String(folder).replace(/^(factura|admision)[-_]/i, "");
  const m = clean.match(/(\d{3,})/);
  return m ? `${folder.startsWith('factura') ? 'FACTURA' : 'ADMISION'} ${m[1]}` : folder.toUpperCase();
}

// ───────── Controller principal (genera el .BAT) ─────────
const BatAuto = async (req, res) => {
  try {
    const {
      admisiones,
      numeroAdmision, idAdmision, numeroFactura, clave,
      institucionId, idUser, eps,
      tipos, modalidad,
      includeFactura = false,
    } = req.body || {};

    // Normalizar modalidad
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
    
    // 🔴 Obtener token de autenticación EXCLUSIVAMENTE del body
    const authToken = req.body?.token;
    
    if (!authToken) {
      return res.status(401).json({ 
        success: false,
        error: "Token de autorización requerido EXCLUSIVAMENTE en body" 
      });
    }

    // Validaciones
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

    // Acumular todos los trabajos
    const allJobs = [];
    for (const q of queries) {
      try {
        const jobs = await getTrabajosViaController(q, authToken);
        if (jobs && jobs.length > 0) {
          allJobs.push(...jobs);
        } else {
          console.warn(`No se encontraron trabajos para: ${JSON.stringify(q)}`);
        }
      } catch (error) {
        console.error(`Error obteniendo trabajos para consulta ${JSON.stringify(q)}:`, error);
        // Continuar con las siguientes consultas
      }
    }
    
    if (!allJobs.length) {
      return res.status(404).json({ 
        success: false,
        error: "No se encontraron documentos para esos parámetros" 
      });
    }

    // ───────── Preparar set de carpetas para factura ─────────
    const facturaFolders = new Set();
    const facturaExisteCache = new Map(); // Cache para evitar verificaciones repetidas
    
    if (includeFactura) {
      // Verificar existencia de facturas antes de agregarlas
      const admisionesParaVerificar = [];
      
      if (admList.length > 0) {
        admList.forEach(adm => {
          const folderName = safeWinName(deaccent(`admision-${adm}`));
          admisionesParaVerificar.push({ adm, folderName });
        });
      } else if (numeroAdmision) {
        const folderName = safeWinName(deaccent(`admision-${numeroAdmision}`));
        admisionesParaVerificar.push({ adm: numeroAdmision, folderName });
      } else if (idAdmision) {
        const folderName = safeWinName(deaccent(`admision-${idAdmision}`));
        admisionesParaVerificar.push({ adm: idAdmision, folderName });
      }
      
      // Verificar facturas en paralelo
      const verificaciones = await Promise.allSettled(
        admisionesParaVerificar.map(async ({ adm, folderName }) => {
          try {
            const resultado = await verificarFacturaExiste(req, {
              numeroAdmision: adm,
              institucionId,
            });
            
            if (resultado.existe) {
              facturaFolders.add(folderName);
              facturaExisteCache.set(folderName, resultado.url);
              console.log(`[INFO] Factura encontrada para admisión ${adm}`);
            } else {
              console.log(`[INFO] No se agregará factura para admisión ${adm}: ${resultado.mensaje || resultado.error || 'No encontrada'}`);
            }
          } catch (error) {
            console.error(`[ERROR] Verificando factura para admisión ${adm}:`, error.message);
          }
        })
      );
    }

    // ───────── Construcción de bloques BAT ─────────
    const blocks = [];
    const flagsInit = [];

    // Agrupar jobs por carpeta
    const groups = new Map();
    for (const j of allJobs) {
      if (!groups.has(j.folder)) groups.set(j.folder, []);
      groups.get(j.folder).push(j);
    }

    // Por cada carpeta: encabezado, lista, bloques de descarga
    for (const [folder, jobs] of groups.entries()) {
      // Encabezado
      blocks.push([
        "echo.",
        `echo ////////// ${displayTitleFromFolder(folder)} //////////////////`,
        "echo."
      ].join("\r\n"));

// Lista de nombres
for (const j of jobs) {
  blocks.push(`echo  ${j.nombreArchivo || j.pdfName}`);
}

// ✅ Mostrar factura electrónica en la lista si existe
if (includeFactura && facturaFolders.has(folder)) {
  blocks.push(`echo  Factura Electronica`);
}

blocks.push("echo.");

      // Bloques de descarga
      for (const j of jobs) {
        const { flagInit, block } = makeBlock(j);
        flagsInit.push(flagInit);
        blocks.push(block);
      }

      // Factura electrónica si existe
      if (includeFactura && facturaFolders.has(folder)) {
        const admNumber = folder.replace(/^admisi[oó]n[-_ ]*/i, "");
        const facturaUrl = facturaExisteCache.get(folder) || 
                          buildFacturaURLAbsolute(req, {
                            numeroAdmision: admNumber,
                            institucionId,
                          });
        
        const { flagInit, block } = makeFacturaBlock({
          folder: safeWinName(deaccent(folder)),
          facturaUrl,
          admNumber,
        });
        flagsInit.push(flagInit);
        blocks.push(block);
      } else if (includeFactura && facturaFolders.size > 0) {
        // Solo mostrar mensaje si estamos incluyendo facturas pero esta carpeta no tiene
        console.log(`[INFO] Carpeta ${folder} no tendrá factura (no existe o no se encontró)`);
      }

      blocks.push("");
    }

    // Nombre del BAT
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

    // Plantilla .bat
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

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(bat);
  } catch (err) {
    console.error("BatAuto error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message || "Error interno" 
    });
  }
};

module.exports = { BatAuto };



