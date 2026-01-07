// ./descargar/descargar.js
const path = require("path");

// ───────── IMPORT: solo Hs_Anx (handler Express) ─────────

// ───────── Utils ─────────
const deaccent = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const safeWinName = (s) => s.replace(/[\\/:*?"<>|]/g, "_");
const guessFileName = (raw, fallback) => {
  let name = String(raw || fallback || "documento.pdf");
  if (!/\.pdf$/i.test(name)) name += ".pdf";
  return safeWinName(deaccent(name));
};
const escapeForBat = (str) => String(str).replace(/%/g, "%%");

// ───────── Helpers de URL base (toman la base desde el propio request) ─────────
function getBaseURL(req) {
  // Soporte para reverse proxies (Nginx/ALB/Cloudflare) y subpaths
  const xfProto  = (req.headers["x-forwarded-proto"] || "").split(",")[0]?.trim();
  const xfHost   = (req.headers["x-forwarded-host"]  || "").split(",")[0]?.trim();
  const xfPrefix = (req.headers["x-forwarded-prefix"] || "").trim();

  const proto = xfProto || req.protocol || "http";
  const host  = xfHost  || req.headers.host; // incluye puerto si aplica

  let prefix = "";
  if (xfPrefix) {
    prefix = xfPrefix.startsWith("/") ? xfPrefix : `/${xfPrefix}`;
    // normaliza: sin slash final
    prefix = prefix.replace(/\/+$/, "");
  }

  return `${proto}://${host}${prefix}`;
}

// URL absoluta para que el BAT baje la factura desde TU BACKEND (usando la base del request)
function buildFacturaURLAbsolute(req, { numeroAdmision, institucionId, idUser, eps }) {
  const base = getBaseURL(req);
  const qs = new URLSearchParams({
    numeroAdmision: String(numeroAdmision || ""),
    institucionId: String(institucionId),
    idUser: String(idUser),
    eps: String(eps),
  });
  return `${base}/facturaElectronica?${qs.toString()}`;
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
        rem Actualizar progreso de forma robusta (atomico)
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

function makeFacturaBlock({ folder, facturaUrl }) {
  const FLAG = `${safeWinName(deaccent(folder))}_FACTURA_OK`;
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
    pushd "${folder}"
    ${curlBase} -OJ "!URL!" --silent
    if not !errorlevel! equ 0 (
        echo  [WARN] Reintentando sin reanudacion...
        ${curlBase} -OJ "!URL!" --silent
    )
    if !errorlevel! equ 0 (
        echo  [OK] Factura Electronica
        rem Actualizar progreso de forma robusta (rutas relativas)
        > "..\\!progresoFile!.tmp" findstr /v /b "${FLAG}=" "..\\!progresoFile!" 2>nul
        >> "..\\!progresoFile!.tmp" echo ${FLAG}=1
        move /Y "..\\!progresoFile!.tmp" "..\\!progresoFile!" >nul
    ) else (
        echo  [ERROR] Factura Electronica
    )
    popd
) else (
    echo [SKIP] Factura Electronica ya estaba descargada.
)`.trim(),
  };
}

// ───────── Adaptador: ejecutar Hs_Anx (handler Express) SIN HTTP ─────────
async function callHsAnxAsFunction(query) {
  return new Promise((resolve, reject) => {
    const req = { query };
    const res = {
      json: (data) => resolve(data),
      send: (data) => resolve(data),
      status: (code) => ({
        json: (data) => reject(new Error(`Hs_Anx devolvió ${code}: ${JSON.stringify(data)}`)),
        send: (data) => reject(new Error(`Hs_Anx devolvió ${code}: ${data}`)),
      }),
    };
    try {
      const maybePromise = Hs_Anx(req, res);
      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise.then(() => void 0).catch(reject);
      }
    } catch (e) {
      reject(e);
    }
  });
}

// Usa la lógica de Hs_Anx via adaptador para obtener trabajos
async function getTrabajosViaController(params) {
  const data = await callHsAnxAsFunction({
    clave: params.clave,
    numeroFactura: params.numeroFactura,
    numeroAdmision: params.numeroAdmision,
    idAdmision: params.idAdmision,
    institucionId: params.institucionId,
    idUser: params.idUser,
    eps: params.eps,
    tipos: params.tipos,
    modalidad: params.modalidad, // importante para HAA evento/cápita
  });

  const jobs = [];
  if (!data || typeof data !== "object") return jobs;

  for (const key of Object.keys(data)) {
    const items = Array.isArray(data[key]) ? data[key] : [];
    const folder = safeWinName(deaccent(key));
    for (const it of items) {
      const url = String(it.url || "");
      if (!url) continue;
      const fallbackName = path.basename(new URL(url).pathname || "documento.pdf");
      const pdfName = guessFileName(it.nombrepdf || fallbackName, "documento.pdf");
      jobs.push({ folder, url, pdfName });
    }
  }
  return jobs;
}

// ───────── Helpers de presentación ─────────
function displayTitleFromFolder(folder) {
  // Quita prefijos comunes "admision-", "admision_", etc., y arma "ADMISION NNN" si hay número
  const clean = String(folder).replace(/^admisi[oó]n[-_ ]*/i, "");
  const m = clean.match(/(\d{3,})/);
  return m ? `ADMISION ${m[1]}` : folder.toUpperCase();
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

    // Normalizar modalidad a 'capita' | 'evento'
    const normalizeModalidad = (m) => {
      if (!m) return "";
      const s = String(m).trim().toLowerCase();
      if (["cápita","capita","capíta"].includes(s)) return "capita";
      if (["evento","eventos"].includes(s)) return "evento";
      // Abreviaturas
      if (["cap","c"].includes(s)) return "capita";
      if (["ev","e"].includes(s)) return "evento";
      return "";
    };
    const modalidadNorm = normalizeModalidad(modalidad);

    // Validaciones
    const missing = [];
    if (!institucionId) missing.push("institucionId");
    if (!idUser) missing.push("idUser");
    if (!eps) missing.push("eps");
    // Exigir modalidad explícita para el renombrado correcto (capita|evento)
    if (!modalidadNorm) missing.push("modalidad (capita|evento)");

    const haveSingleKey = !!(numeroAdmision || idAdmision || numeroFactura || clave);
    const admList = Array.isArray(admisiones) ? admisiones.filter(x => x != null && String(x).trim() !== "") : [];
    if (!haveSingleKey && admList.length === 0) {
      missing.push("admisiones[] | numeroAdmision | idAdmision | numeroFactura | clave");
    }
    if (missing.length) {
      return res.status(400).json({ error: `Faltan parámetros: ${missing.join(", ")}` });
    }

    // Construir consultas a la lógica interna (SIN HTTP)
    const queries = [];
    if (admList.length > 0) {
      for (const adm of admList) {
        queries.push({ numeroAdmision: String(adm), institucionId, idUser, eps, tipos, modalidad: modalidadNorm });
      }
    } else {
      queries.push({ numeroAdmision, idAdmision, numeroFactura, clave, institucionId, idUser, eps, tipos, modalidad: modalidadNorm });
    }

    // Acumular todos los trabajos
    const allJobs = [];
    for (const q of queries) {
      const jobs = await getTrabajosViaController(q);
      allJobs.push(...(jobs || []));
    }
    if (!allJobs.length) {
      return res.status(404).json({ error: "No se encontraron documentos para esos parámetros" });
    }

    // ───────── Preparar set de carpetas que deben llevar FACTURA dentro del grupo ─────────
    const facturaFolders = new Set();
    if (includeFactura) {
      const admsForFactura = admList.length > 0
        ? admList.map(String)
        : [numeroAdmision || idAdmision].filter(Boolean).map(String);
      for (const adm of admsForFactura) {
        facturaFolders.add(safeWinName(deaccent(`admision-${adm}`)));
      }
    }

    // ───────── Construcción de bloques BAT (agrupado, factura en su grupo) ─────────
    const blocks = [];
    const flagsInit = [];

    // 1) Agrupar jobs por carpeta
    const groups = new Map();
    for (const j of allJobs) {
      if (!groups.has(j.folder)) groups.set(j.folder, []);
      groups.get(j.folder).push(j);
    }

    // 2) Por cada carpeta: encabezado, lista, bloques de descarga y (si aplica) la factura al final del grupo
    for (const [folder, jobs] of groups.entries()) {
      // Encabezado sobrio por admisión/carpeta
      blocks.push([
        "echo.",
        `echo ////////// ${displayTitleFromFolder(folder)} //////////////////`,
        "echo."
      ].join("\r\n"));

      // Lista limpia de nombres
      for (const j of jobs) {
        blocks.push(`echo  ${j.pdfName}`);
      }

      // Línea en blanco
      blocks.push("echo.");

      // Bloques de descarga reales de la carpeta
      for (const j of jobs) {
        const { flagInit, block } = makeBlock(j);
        flagsInit.push(flagInit);
        blocks.push(block);
      }

      // Si corresponde, agregar Factura ELECTRÓNICA en este mismo grupo
      if (includeFactura && facturaFolders.has(folder)) {
        const admNumber = folder.replace(/^admisi[oó]n[-_ ]*/i, "");
        const facturaUrl = buildFacturaURLAbsolute(req, {
          numeroAdmision: admNumber,
          institucionId,
          idUser,
          eps,
        });
        const { flagInit, block } = makeFacturaBlock({
          folder: safeWinName(deaccent(folder)),
          facturaUrl,
        });
        flagsInit.push(flagInit);
        blocks.push(block);
      }

      // Separador visual entre grupos
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
    res.status(500).json({ error: err.message || "Error interno" });
  }
};

module.exports = { BatAuto };