import { LitElement, html, css } from 'lit';
import styles from './EstiloAdmiciones.js';

// Mapeo con nombres legibles para el usuario
const TIPOS = [
  { code: 'HAU',   name: 'Historia Clínica' },
  { code: 'ANX',  name: 'Anexo 2' },
  { code: 'EPI',  name: 'Epicrisis' },
  { code: 'HEV',  name: 'Evolución' },
  { code: 'NOT',  name: 'Notas de Enfermería' },
  { code: 'HAD',  name: 'Admisiones' },
  { code: 'PREF', name: 'Prefacturas' },
  { code: 'CRC',  name: 'Órdenes Médicas' },
  { code: 'PDX',  name: 'Hoja Adm. de Procedimientos' },
  { code: 'HAM',  name: 'Hoja Adm. de Medicamentos' },
  { code: 'INS',  name: 'Hoja de Gastos/Artículos' },
  { code: 'FEV',  name: 'Factura Electrónica' },
];

export class AdmicionesArchivos extends LitElement {
  static properties = {
    loginData: { type: Object },
    numeros: { type: String },
    eps: { type: String },
    modalidad: { type: String },
    tiposSeleccionados: { type: Array },
    usarTodos: { type: Boolean },
    _cargando: { type: Boolean, state: true },
    _pct: { type: Number, state: true },
    _msg: { type: String, state: true },
    _error: { type: String, state: true },
    _sesionStatus: { type: Object, state: true }, // Nuevo: para mostrar estado de sesión
  };

  static styles = styles;

  constructor() {
    super();
    this.loginData = null;
    this.numeros = '';
    this.eps = 'NUEVA_EPS';
    this.modalidad = 'evento';
    this.tiposSeleccionados = [];
    this.usarTodos = false;
    this._cargando = false;
    this._pct = 0;
    this._msg = '';
    this._error = '';
    this._sesionStatus = {
      tieneToken: false,
      tieneUsuario: false,
      tieneIdUsuario: false,
      tieneInstitucion: false,
      tieneIdInstitucion: false,
      detalles: {}
    };
    this._simTimer = null;
  }

  updated(changedProperties) {
    if (changedProperties.has('loginData')) {
      this._actualizarEstadoSesion();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopSim();
  }

  // ---- Método para analizar estado de sesión ----
  _actualizarEstadoSesion() {
    const login = this.loginData || {};
    const usuario = login.usuario || {};
    const institucion = login.institucion || {};
    
    const estado = {
      tieneToken: !!login.token,
      tieneUsuario: !!login.usuario,
      tieneIdUsuario: !!usuario.id_usuario,
      tieneInstitucion: !!login.institucion,
      tieneIdInstitucion: !!institucion.idInstitucion,
      detalles: {
        token: login.token ? 'Presente' : 'Faltante',
        usuario: login.usuario ? 'Presente' : 'Faltante',
        id_usuario: usuario.id_usuario || 'Faltante',
        institucion: login.institucion ? 'Presente' : 'Faltante',
        idInstitucion: institucion.idInstitucion || 'Faltante'
      }
    };
    
    this._sesionStatus = estado;
    
    // Si hay error anterior relacionado con sesión, limpiarlo
    if (this._error && this._error.includes('sesión')) {
      this._error = '';
    }
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
    const token = this.loginData?.token;
    const tipos = this._getTiposParaPayload();

    // Validación detallada de sesión
    if (!token) return { 
      ok: false, 
      msg: '❌ Token de autenticación no disponible. Por favor, inicie sesión nuevamente.'
    };
    
    if (!idUser) return { 
      ok: false, 
      msg: '❌ ID de usuario no disponible. Verifique que los datos de sesión sean correctos.'
    };
    
    if (!institucionId) return { 
      ok: false, 
      msg: '❌ ID de institución no disponible. Verifique que los datos de sesión sean correctos.'
    };
    
    if (ids.length === 0) { 
      return { ok: false, msg: '📝 Ingrese al menos un número de admisión.' };
    }
    
    if (!tipos) { 
      return { ok: false, msg: '📄 Seleccione al menos un tipo de documento o "Todos".' };
    }
    
    return { ok: true, ids, idUser, institucionId, tipos, token };
  }

  // ---- progreso simulado ----
  _startSim(msg='Procesando…') {
    this._cargando = true; 
    this._pct = 0; 
    this._msg = msg; 
    this._stopSim();
    this._simTimer = setInterval(() => {
      const inc = this._pct < 60 ? 6 : this._pct < 85 ? 3 : 1;
      this._pct = Math.min(90, this._pct + inc);
    }, 160);
  }
  
  _finishSim(msg='Listo') { 
    this._msg = msg; 
    this._pct = 100; 
    this._cargando = false; 
    this._stopSim();
    setTimeout(() => {
      if (this._msg === msg) this._msg = '';
    }, 2000);
  }
  
  _stopSim() { 
    if (this._simTimer) { 
      clearInterval(this._simTimer); 
      this._simTimer = null; 
    } 
  }

  // ---- UI ----
  _toggleChip(code) {
    if (this.usarTodos) this.usarTodos = false;
    const set = new Set(this.tiposSeleccionados);
    set.has(code) ? set.delete(code) : set.add(code);
    this.tiposSeleccionados = Array.from(set);
  }
  
  _activarTodos() { 
    this.usarTodos = !this.usarTodos; 
    if (this.usarTodos) this.tiposSeleccionados = []; 
  }

  _limpiar = () => {
    this.numeros = '';
    this.tiposSeleccionados = [];
    this.usarTodos = false;
    this.eps = 'NUEVA_EPS';
    this.modalidad = 'evento';
    this._error = ''; 
    this._pct = 0; 
    this._msg = '';
  };

  // ---- red ----
  async _descargarBat(e) {
    e?.preventDefault?.();
    if (this._cargando) return;

    this._error = '';
    const val = this._validar();
    if (!val.ok) { 
      this._error = val.msg; 
      return; 
    }

    const { ids, idUser, institucionId, tipos, token } = val;
    
    const payload = {
      token: token,
      admisiones: ids,
      institucionId,
      idUser,
      eps: this.eps,
      tipos: tipos,
      modalidad: this.modalidad,
    };

    try {
      this._startSim('Generando BAT con documentos seleccionados…');

      const blob = await this._fetchWithAuth('/descargar', {
        method: 'POST',
        body: payload
      });

      this._finishSim('✅ BAT generado correctamente');
      this._saveBlob(blob, `descargas-${ids.length}-admisiones-${Date.now()}.bat`);
    } catch (err) {
      this._error = err?.message || 'No se pudo generar el BAT.';
      this._finishSim('❌ Error');
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
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.message || errorData.error || errorMsg;
      } catch {
        const errorText = await response.text();
        if (errorText) errorMsg = errorText;
      }
      throw new Error(errorMsg);
    }
    return await response.blob();
  }

  _saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; 
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---- Render métodos auxiliares ----
  _renderChips() {
    return html`
      <div class="chips" role="group" aria-label="Tipos de documento">
        ${TIPOS.map(t => html`
          <button type="button" 
                  class="chip ${this.tiposSeleccionados.includes(t.code) ? 'active' : ''}" 
                  aria-pressed=${this.tiposSeleccionados.includes(t.code)} 
                  @click=${() => this._toggleChip(t.code)}>
            <span class="name">${t.name}</span>
            <span class="code">${t.code}</span>
          </button>
        `)}
        <button type="button" 
                class="chip all ${this.usarTodos ? 'active' : ''}" 
                aria-pressed=${this.usarTodos} 
                @click=${this._activarTodos}>
          <span class="name">✅ Todos los tipos</span>
        </button>
      </div>
    `;
  }

  _renderProgreso() {
    if (!this._cargando && this._pct === 0) return null;
    return html`
      <div class="col-12">
        <div class="progress">
          <div class="bar" style="width: ${this._pct}%"></div>
        </div>
        <div class="status">
          <span>${this._msg}</span>
          <span>${Math.round(this._pct)}%</span>
        </div>
      </div>
    `;
  }

  _renderSesionStatus() {
    const { tieneToken, tieneUsuario, tieneIdUsuario, tieneInstitucion, tieneIdInstitucion, detalles } = this._sesionStatus;
    const todosOk = tieneToken && tieneUsuario && tieneIdUsuario && tieneInstitucion && tieneIdInstitucion;
    
    if (todosOk) return null;
    
    return html`
      <div class="col-12 sesion-warning">
        <div class="warning-header">
          ⚠️ <strong>Sesión incompleta</strong> - Faltan los siguientes datos:
        </div>
        <ul class="warning-list">
          ${!tieneToken ? html`<li>🔑 Token de autenticación</li>` : ''}
          ${!tieneUsuario ? html`<li>👤 Objeto usuario</li>` : ''}
          ${!tieneIdUsuario ? html`<li>🆔 ID de usuario (valor actual: ${detalles.id_usuario})</li>` : ''}
          ${!tieneInstitucion ? html`<li>🏢 Objeto institución</li>` : ''}
          ${!tieneIdInstitucion ? html`<li>🏛️ ID de institución (valor actual: ${detalles.idInstitucion})</li>` : ''}
        </ul>
        <div class="warning-details">
          <details>
            <summary>🔍 Ver detalles completos de sesión</summary>
            <pre class="debug-data">${JSON.stringify({
              token: detalles.token,
              usuario: detalles.usuario,
              id_usuario: detalles.id_usuario,
              institucion: detalles.institucion,
              idInstitucion: detalles.idInstitucion,
              loginData_completo: this.loginData
            }, null, 2)}</pre>
          </details>
        </div>
        <div class="warning-action">
          <button type="button" class="btn small" @click=${this._actualizarEstadoSesion}>
            🔄 Revisar sesión
          </button>
        </div>
      </div>
    `;
  }

  render() {
    const ids = this._parseIds();
    const sesionOk = this._sesionStatus.tieneToken && 
                     this._sesionStatus.tieneUsuario && 
                     this._sesionStatus.tieneIdUsuario && 
                     this._sesionStatus.tieneInstitucion && 
                     this._sesionStatus.tieneIdInstitucion;

    // Verificar si se seleccionó factura electrónica
    const facturaSeleccionada = this.tiposSeleccionados.includes('FEV') || this.usarTodos;

    return html`
      <div class="wrap">
        <header class="header">
          <h1 class="title">⬇️ Descarga BAT de Admisiones</h1>
          ${!sesionOk ? html`
            <div class="sesion-badge">
              🔴 Sesión incompleta
            </div>
          ` : html`
            <div class="sesion-badge ok">
              🟢 Sesión válida
            </div>
          `}
        </header>

        <form class="card" @submit=${this._descargarBat}>
          <div class="grid">
            <div class="col-12">
              <label>
                Números de admisión
                <textarea .value=${this.numeros} 
                          @input=${e => this.numeros = e.target.value} 
                          placeholder="Ej: 123, 456&#10;O varios: 123, 456, 789" 
                          rows="3"
                          ?disabled=${!sesionOk}></textarea>
                <div class="help">📊 ${ids.length} ID(s) detectado(s)</div>
              </label>
            </div>

            <div class="col-4">
              <label> EPS
                <select .value=${this.eps} @change=${e => this.eps = e.target.value} ?disabled=${!sesionOk}>
                  <option value="NUEVA_EPS">NUEVA_EPS</option>
                  <option value="SALUD_TOTAL">SALUD_TOTAL</option>
                  <option value="MUTUALSER">MUTUALSER</option>
                </select>
              </label>
            </div>

            <div class="col-4">
              <label> Modalidad
                <select .value=${this.modalidad} @change=${e => this.modalidad = e.target.value} ?disabled=${!sesionOk}>
                  <option value="evento">Evento</option>
                  <option value="capita">Cápita</option>
                </select>
              </label>
            </div>

            <div class="col-12">
              <label>Tipos de documento</label>
              ${this._renderChips()}
              ${facturaSeleccionada ? html`
                <div class="help success" style="margin-top: 8px; color: #2e7d32;">
                  ✅ La factura electrónica se generará automáticamente con el reporte ListadoFacturasDetallado
                </div>
              ` : ''}
            </div>

            ${this._renderSesionStatus()}

            <div class="col-12 row">
              <button class="btn primary" ?disabled=${this._cargando || !sesionOk} type="submit">
                ${this._cargando ? '🔄 Generando...' : '📥 Generar BAT'}
              </button>
              <button type="button" class="btn secondary" @click=${this._limpiar} ?disabled=${this._cargando}>
                🧹 Limpiar
              </button>
            </div>

            ${this._renderProgreso()}
            
            ${this._error ? html`
              <div class="col-12 error-message">
                <div class="error-icon">❌</div>
                <div class="error-text">${this._error}</div>
              </div>
            ` : null}
          </div>
        </form>
      </div>
    `;
  }
}

customElements.define('admiciones-archivos', AdmicionesArchivos);