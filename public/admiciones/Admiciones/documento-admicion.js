import { LitElement, html, css } from 'lit';
import styles from './EstiloAdmiciones.js';

// Mapeo con nombres legibles para el usuario
const TIPOS = [
  { code: 'HT',   name: 'Historia Clínica' },
  { code: 'ANX',  name: 'Anexo 2' },
  { code: 'EPI',  name: 'Epicrisis' },
  { code: 'EVL',  name: 'Evolución' },
  { code: 'ENF',  name: 'Notas de Enfermería' },
  { code: 'ADM',  name: 'Admisiones' },
  { code: 'PREF', name: 'Prefacturas' },
  { code: 'OM',   name: 'Órdenes Médicas' },
  { code: 'HAP',  name: 'Hoja Adm. de Procedimientos' },
  { code: 'HMD',  name: 'Hoja Adm. de Medicamentos' },
  { code: 'HGA',  name: 'Hoja de Gastos/Artículos' },
  { code: 'HAA',  name: 'Historia Asistencial' },
];

export class AdmicionesArchivos extends LitElement {
  static properties = {
    loginData: { type: Object },
    numeros: { type: String },
    eps: { type: String },
    modalidad: { type: String },
    incluirFactura: { type: Boolean },
    tiposSeleccionados: { type: Array },
    usarTodos: { type: Boolean },
    _cargando: { type: Boolean, state: true },
    _pct: { type: Number, state: true },
    _msg: { type: String, state: true },
    _error: { type: String, state: true },
  };

  static styles = styles;

  constructor() {
    super();
    this.loginData = null;
    this.numeros = '';
    this.eps = 'NUEVA_EPS';
    this.modalidad = 'evento';
    this.incluirFactura = true;
    this.tiposSeleccionados = [];
    this.usarTodos = false;
    this._cargando = false;
    this._pct = 0;
    this._msg = '';
    this._error = '';
    this._simTimer = null;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopSim();
  }

  // ---- helpers ----
  _parseIds() {
    return Array.from(new Set(String(this.numeros || '')
      .split(/[\s,;\n\t]+/).map(s => s.trim()).filter(Boolean)));
  }

  _getTiposParaPayload() {
    if (this.usarTodos) return 'TODO';
    if (this.tiposSeleccionados.length > 0) return this.tiposSeleccionados.join(',');
    return '';
  }

  _validar() {
    const ids = this._parseIds();
    const idUser = this.loginData?.usuario?.id_usuario;
    const institucionId = this.loginData?.institucion?.idInstitucion; 
    const tipos = this._getTiposParaPayload();

    if (!idUser || !institucionId) return { 
      ok: false, 
      msg: `Faltan datos de sesión. Usuario: ${idUser ? 'OK' : 'Falta'}, Institución: ${institucionId ? 'OK' : 'Falta'}`
    };
    if (ids.length === 0) return { ok: false, msg: 'Ingrese al menos un número de admisión.' };
    if (!tipos) return { ok: false, msg: 'Seleccione al menos un tipo o "Todos".' };
    
    return { ok: true, ids, idUser, institucionId, tipos };
  }

  // ---- progreso simulado ----
  _startSim(msg='Procesando…') {
    this._cargando = true; this._pct = 0; this._msg = msg; this._stopSim();
    this._simTimer = setInterval(() => {
      const inc = this._pct < 60 ? 6 : this._pct < 85 ? 3 : 1;
      this._pct = Math.min(90, this._pct + inc);
    }, 160);
  }
  _finishSim(msg='Listo') { this._msg = msg; this._pct = 100; this._cargando = false; this._stopSim(); }
  _stopSim() { if (this._simTimer) { clearInterval(this._simTimer); this._simTimer = null; } }

  // ---- UI ----
  _toggleChip(code) {
    if (this.usarTodos) this.usarTodos = false;
    const set = new Set(this.tiposSeleccionados);
    set.has(code) ? set.delete(code) : set.add(code);
    this.tiposSeleccionados = Array.from(set);
  }
  _activarTodos() { this.usarTodos = !this.usarTodos; if (this.usarTodos) this.tiposSeleccionados = []; }

  _limpiar = () => {
    this.numeros = '';
    this.tiposSeleccionados = [];
    this.usarTodos = false;
    this.eps = 'NUEVA_EPS';
    this.modalidad = 'evento';
    this.incluirFactura = true;
    this._error = ''; this._pct = 0; this._msg = '';
  };

  // ---- red ----
  async _descargarBat(e) {
    e?.preventDefault?.();
    if (this._cargando) return;

    this._error = '';
    const val = this._validar();
    if (!val.ok) { this._error = val.msg; return; }
    if (!this.loginData?.token) { this._error = 'Sesión inválida: token no disponible'; return; }

    const { ids, idUser, institucionId, tipos } = val;
    
    const payload = {
      token: this.loginData.token,
      admisiones: ids,
      institucionId,
      idUser,
      eps: this.eps,
      tipos,
      modalidad: this.modalidad,
      includeFactura: !!this.incluirFactura
    };

    try {
      this._startSim('Generando BAT…');

      // ✅ FETCH DIRECTO AL SERVIDOR USANDO RUTA RELATIVA
      const blob = await this._fetchWithAuth('/descargar', {
        method: 'POST',
        body: payload
      });

      this._finishSim('BAT generado');
      this._saveBlob(blob, 'descargas-admisiones.bat');
    } catch (err) {
      this._error = err?.message || 'No se pudo generar el BAT.';
      this._finishSim('Error');
      console.error('[descargarBat] error', err);
    }
  }

  async _fetchWithAuth(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    const init = { ...options, headers, cache: 'no-store' };

    if (options.body && typeof options.body === 'object') {
      init.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, init);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Error del servidor'}`);
    }
    return await response.blob();
  }

  _saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---- render ----
  _renderChips() {
    return html`
      <div class="chips" role="group" aria-label="Tipos de documento">
        ${TIPOS.map(t => html`
          <button type="button" class="chip" aria-pressed=${this.tiposSeleccionados.includes(t.code)} @click=${() => this._toggleChip(t.code)}>
            <span class="name">${t.name}</span>
            <span class="code">${t.code}</span>
          </button>
        `)}
        <button type="button" class="chip all" aria-pressed=${this.usarTodos} @click=${this._activarTodos}>
          <span class="name">Todos los tipos</span>
        </button>
      </div>
    `;
  }

  _renderProgreso() {
    if (!this._cargando && this._pct === 0) return null;
    return html`
      <div class="col-12">
        <div class="progress"><div class="bar" style="--w:${this._pct}%"></div></div>
        <div class="status"><span>${this._msg}</span><span>${this._pct}%</span></div>
      </div>
    `;
  }

  render() {
    const ids = this._parseIds();
    const idUser = this.loginData?.usuario?.id_usuario;
    const institucionId = this.loginData?.institucion?.idInstitucion;
    const sesionOk = Boolean(idUser && institucionId && this.loginData?.token);

    return html`
      <div class="wrap">
        <header class="header">
          <h1 class="title">⬇️ Descarga BAT de Admisiones</h1>
        </header>

        <form class="card" @submit=${this._descargarBat}>
          <div class="grid">
            <div class="col-12">
              <label>
                Números de admisión
                <textarea .value=${this.numeros} @input=${e => this.numeros = e.target.value} placeholder="Ej: 123, 456"></textarea>
                <div class="help">${ids.length} ID(s) detectado(s)</div>
              </label>
            </div>

            <div class="col-4">
              <label> EPS
                <select .value=${this.eps} @change=${e => this.eps = e.target.value}>
                  <option value="NUEVA_EPS">NUEVA_EPS</option>
                  <option value="SALUD_TOTAL">SALUD_TOTAL</option>
                </select>
              </label>
            </div>

            <div class="col-4">
              <label> Modalidad
                <select .value=${this.modalidad} @change=${e => this.modalidad = e.target.value}>
                  <option value="evento">evento</option>
                  <option value="capita">capita</option>
                </select>
              </label>
            </div>

            <div class="col-12">
              <label>Tipos de documento</label>
              ${this._renderChips()}
            </div>

            <div class="col-12 row">
              <label class="row" style="gap:8px;"><input type="checkbox" .checked=${this.incluirFactura} @change=${e => this.incluirFactura = e.target.checked} /> Incluir factura</label>
              <button class="btn primary" ?disabled=${this._cargando || !sesionOk} type="submit">Generar BAT</button>
            </div>

            ${this._renderProgreso()}
            ${this._error ? html`<div class="col-12 err">⚠️ ${this._error}</div>` : null}
          </div>
        </form>
      </div>
    `;
  }
}

customElements.define('admiciones-archivos', AdmicionesArchivos);