import { LitElement, html, css } from 'lit';
import styles from './EstiloAdmiciones.js';

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
    _sesionStatus: { type: Object, state: true },
    _progresoActual: { type: Object, state: true },
    _progresoLogs: { type: Array, state: true },
    _mostrarLogs: { type: Boolean, state: true },
    _checkpoints: { type: Array, state: true },
    _mostrarCheckpoints: { type: Boolean, state: true },
    _recoveryId: { type: String, state: true }
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
    this._progresoActual = null;
    this._progresoLogs = [];
    this._mostrarLogs = false;
    this._checkpoints = [];
    this._mostrarCheckpoints = false;
    this._recoveryId = '';
    this._batParcial = null; // Guardar BAT parcial en caso de error
  }

  updated(changedProperties) {
    if (changedProperties.has('loginData')) {
      this._actualizarEstadoSesion();
      if (this.loginData?.token) {
        this._cargarCheckpoints();
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

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
    
    if (this._error && this._error.includes('sesión')) {
      this._error = '';
    }
  }

  async _cargarCheckpoints() {
    try {
      const response = await fetch('/list-checkpoints', {
        headers: {
          'Authorization': `Bearer ${this.loginData?.token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        this._checkpoints = data.checkpoints || [];
      }
    } catch (err) {
      console.error('Error cargando checkpoints:', err);
    }
  }

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

    if (!token) return { 
      ok: false, 
      msg: '❌ Token de autenticación no disponible. Por favor, inicie sesión nuevamente.'
    };
    
    if (!idUser) return { 
      ok: false, 
      msg: '❌ ID de usuario no disponible.'
    };
    
    if (!institucionId) return { 
      ok: false, 
      msg: '❌ ID de institución no disponible.'
    };
    
    if (ids.length === 0 && !this._recoveryId) { 
      return { ok: false, msg: '📝 Ingrese al menos un número de admisión o seleccione una recuperación.' };
    }
    
    if (!tipos && !this._recoveryId) { 
      return { ok: false, msg: '📄 Seleccione al menos un tipo de documento o "Todos".' };
    }
    
    return { ok: true, ids, idUser, institucionId, tipos, token };
  }

  _agregarLog(tipo, mensaje, data = null) {
    const log = {
      id: Date.now(),
      tipo,
      mensaje,
      data,
      timestamp: new Date()
    };
    
    this._progresoLogs = [log, ...this._progresoLogs].slice(0, 50);
    
    if (tipo === 'processing') {
      this._progresoActual = {
        tipo: 'procesando',
        admision: data?.query,
        actual: data?.current,
        total: data?.total,
        mensaje
      };
      this._pct = Math.floor((data?.current / data?.total) * 90);
    } else if (tipo === 'query_result') {
      this._progresoActual = {
        tipo: 'resultado',
        admision: data?.query,
        encontrados: data?.total_encontrados,
        mensaje
      };
    } else if (tipo === 'complete') {
      this._progresoActual = {
        tipo: 'completo',
        mensaje
      };
      this._pct = 100;
    }
    
    this.requestUpdate();
  }

  async _reanudarDescarga(recoveryId) {
    this._recoveryId = recoveryId;
    this.numeros = ''; // Limpiar números ya que usaremos recuperación
    await this._descargarBatConProgreso();
  }

  async _descargarBatConProgreso(e) {
    e?.preventDefault?.();
    if (this._cargando) return;

    this._error = '';
    const val = this._validar();
    if (!val.ok) { 
      this._error = val.msg; 
      return; 
    }

    const { ids, idUser, institucionId, tipos, token } = val;
    
    this._cargando = true;
    this._pct = 0;
    this._msg = 'Iniciando conexión...';
    this._progresoLogs = [];
    this._progresoActual = null;
    this._mostrarLogs = true;
    this._batParcial = null;
    
    if (this._recoveryId) {
      this._agregarLog('info', `🔄 Reanudando descarga con ID: ${this._recoveryId}`);
    } else {
      this._agregarLog('info', `🚀 Iniciando descarga para ${ids.length} admisión(es): ${ids.join(', ')}`);
    }
    
    const payload = {
      token: token,
      ...(this._recoveryId ? { recoveryId: this._recoveryId } : {
        admisiones: ids,
        institucionId,
        idUser,
        eps: this.eps,
        tipos: tipos,
        modalidad: this.modalidad
      }),
      stream: true
    };

    try {
      const response = await fetch('/descargar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              this._procesarEventoSSE(data);
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
      
    } catch (err) {
      this._error = err?.message || 'Error en la conexión.';
      this._msg = '❌ Error - Descarga incompleta';
      this._agregarLog('error', `Error: ${this._error}`);
      
      // Si hay BAT parcial, mostrar opción para descargar
      if (this._batParcial) {
        this._agregarLog('advertencia', '⚠️ La descarga quedó incompleta. Puedes descargar el BAT parcial o reanudar más tarde.');
        this._mostrarBotonRecuperacion = true;
      }
      
      console.error('[descargarBat] error', err);
    } finally {
      this._cargando = false;
    }
  }

  _procesarEventoSSE(data) {
    switch(data.type) {
      case 'start':
        this._msg = 'Iniciando proceso...';
        this._agregarLog('info', data.message);
        break;
        
      case 'processing':
        this._msg = `Procesando admisión ${data.current} de ${data.total}: ${data.query}`;
        this._pct = Math.floor((data.current / data.total) * 90);
        this._agregarLog('progreso', data.message, data);
        break;
        
      case 'query_start':
        this._agregarLog('info', data.message, data);
        break;
        
      case 'query_result':
        this._agregarLog('resultado', data.message, data);
        break;
        
      case 'documents_found':
        this._agregarLog('exito', data.message, data);
        break;
        
      case 'no_documents':
        this._agregarLog('advertencia', data.message, data);
        break;
        
      case 'summary':
        this._agregarLog('resumen', data.message, data);
        this._msg = `📊 ${data.message}`;
        break;
        
      case 'complete':
        this._msg = '✅ Proceso completado, descargando archivo...';
        this._pct = 100;
        this._agregarLog('exito', data.message, data);
        
        if (data.bat_content) {
          this._descargarBAT(data.bat_content, data.bat_filename);
          this._agregarLog('exito', `Archivo descargado: ${data.bat_filename}`);
        }
        break;
        
      case 'recovery_info':
        this._agregarLog('info', data.message, data);
        this._recoveryId = data.recovery_id;
        // Guardar el ID de recuperación en localStorage
        localStorage.setItem('last_recovery_id', data.recovery_id);
        break;
        
      case 'recovery_success':
        this._agregarLog('exito', data.message, data);
        break;
        
      case 'error':
        this._agregarLog('error', data.message, data);
        break;
        
      case 'end':
        this._agregarLog('info', 'Proceso finalizado');
        break;
        
      default:
        console.log('Evento no manejado:', data);
    }
  }

  _descargarBAT(content, filename) {
    const blob = new Blob([content], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  _descargarBATParcial() {
    if (this._batParcial) {
      this._descargarBAT(this._batParcial.content, this._batParcial.filename);
    }
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
    this._progresoLogs = [];
    this._progresoActual = null;
    this._mostrarLogs = false;
    this._recoveryId = '';
    this._batParcial = null;
  };

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

  _renderCheckpoints() {
    if (this._checkpoints.length === 0) return null;
    
    return html`
      <div class="col-12">
        <details class="checkpoints-container" ?open=${this._mostrarCheckpoints}>
          <summary @click=${() => this._mostrarCheckpoints = !this._mostrarCheckpoints}>
            📦 Descargas anteriores disponibles (${this._checkpoints.length})
          </summary>
          <div class="checkpoints-list">
            ${this._checkpoints.map(cp => html`
              <div class="checkpoint-item">
                <div class="checkpoint-info">
                  <strong>ID:</strong> ${cp.id}<br>
                  <strong>Fecha:</strong> ${new Date(cp.timestamp).toLocaleString()}<br>
                  <strong>Documentos:</strong> ${cp.total_jobs}
                </div>
                <button class="btn small primary" @click=${() => this._reanudarDescarga(cp.id)}>
                  🔄 Reanudar
                </button>
              </div>
            `)}
          </div>
        </details>
      </div>
    `;
  }

  _renderProgreso() {
    if (!this._cargando && this._pct === 0 && !this._mostrarLogs) return null;
    
    return html`
      <div class="col-12">
        <div class="progress">
          <div class="bar" style="width: ${this._pct}%"></div>
        </div>
        <div class="status">
          <span>${this._msg}</span>
          <span>${Math.round(this._pct)}%</span>
        </div>
        
        ${this._recoveryId && !this._cargando ? html`
          <div class="recovery-info">
            🔑 <strong>ID de recuperación:</strong> ${this._recoveryId}
            <button class="btn small" @click=${() => {
              navigator.clipboard.writeText(this._recoveryId);
              this._agregarLog('exito', 'ID de recuperación copiado al portapapeles');
            }}>
              📋 Copiar ID
            </button>
          </div>
        ` : ''}
        
        ${this._progresoActual && html`
          <div class="progreso-actual">
            ${this._progresoActual.tipo === 'procesando' ? html`
              <div class="progreso-admision">
                <strong>🔄 Procesando:</strong> ${this._progresoActual.admision}
                <span class="badge">${this._progresoActual.actual}/${this._progresoActual.total}</span>
              </div>
            ` : ''}
            ${this._progresoActual.tipo === 'resultado' && this._progresoActual.encontrados ? html`
              <div class="progreso-resultado">
                <strong>📄 ${this._progresoActual.admision}:</strong> 
                ${this._progresoActual.encontrados} documento(s) encontrado(s)
              </div>
            ` : ''}
          </div>
        `}
        
        ${this._mostrarLogs && this._progresoLogs.length > 0 ? html`
          <details class="logs-container" ?open=${this._cargando}>
            <summary>
              📋 Log de progreso (${this._progresoLogs.length} eventos)
              ${this._cargando ? html`<span class="live-badge">🔴 EN VIVO</span>` : ''}
            </summary>
            <div class="logs-list">
              ${this._progresoLogs.map(log => html`
                <div class="log-item ${log.tipo}">
                  <span class="log-time">${log.timestamp.toLocaleTimeString()}</span>
                  <span class="log-icon">${this._getIconForLog(log.tipo)}</span>
                  <span class="log-message">${log.mensaje}</span>
                </div>
              `)}
            </div>
          </details>
        ` : ''}
      </div>
    `;
  }

  _getIconForLog(tipo) {
    const icons = {
      'info': 'ℹ️',
      'progreso': '🔄',
      'resultado': '📊',
      'exito': '✅',
      'advertencia': '⚠️',
      'error': '❌',
      'resumen': '📈'
    };
    return icons[tipo] || '📌';
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
              idInstitucion: detalles.idInstitucion
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

        <form class="card" @submit=${this._descargarBatConProgreso}>
          <div class="grid">
            <div class="col-12">
              <label>
                Números de admisión
                <textarea .value=${this.numeros} 
                          @input=${e => this.numeros = e.target.value} 
                          placeholder="Ej: 123, 456&#10;O varios: 123, 456, 789&#10;Deja vacío si vas a reanudar una descarga anterior" 
                          rows="3"
                          ?disabled=${!sesionOk || this._cargando}></textarea>
                <div class="help">📊 ${ids.length} ID(s) detectado(s)</div>
              </label>
            </div>

            <div class="col-4">
              <label> EPS
                <select .value=${this.eps} @change=${e => this.eps = e.target.value} ?disabled=${!sesionOk || this._cargando}>
                  <option value="NUEVA_EPS">NUEVA_EPS</option>
                  <option value="SALUD_TOTAL">SALUD_TOTAL</option>
                  <option value="MUTUALSER">MUTUALSER</option>
                </select>
              </label>
            </div>

            <div class="col-4">
              <label> Modalidad
                <select .value=${this.modalidad} @change=${e => this.modalidad = e.target.value} ?disabled=${!sesionOk || this._cargando}>
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

            ${this._renderCheckpoints()}
            ${this._renderSesionStatus()}

            <div class="col-12 row">
              <button class="btn primary" ?disabled=${this._cargando || !sesionOk} type="submit">
                ${this._cargando ? '🔄 Generando...' : (this._recoveryId ? '🔄 Reanudar descarga' : '📥 Generar BAT con Progreso')}
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
                ${this._recoveryId ? html`
                  <div class="error-actions">
                    <button class="btn small" @click=${() => this._reanudarDescarga(this._recoveryId)}>
                      🔄 Reintentar reanudación
                    </button>
                  </div>
                ` : ''}
              </div>
            ` : null}
          </div>
        </form>
      </div>
    `;
  }
}

customElements.define('admiciones-archivos', AdmicionesArchivos);