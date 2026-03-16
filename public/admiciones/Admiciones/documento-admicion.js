import { LitElement, html, css } from 'lit';

/**
 * Mapeo de tipos de documentos para la interfaz
 */
const TIPOS = [
  { code: 'HAU',  name: 'Historia Clínica' },
  { code: 'ANX',  name: 'Anexo 2' },
  { code: 'EPI',  name: 'Epicrisis' },
  { code: 'HEV',  name: 'Evolución' },
  { code: 'NOT',  name: 'Notas de Enfermería' },
  { code: 'HAD',  name: 'Admisiones' },
  { code: 'PREF', name: 'Prefacturas' },
  { code: 'CRC',  name: 'Órdenes Médicas' },
  { code: 'PDX',  name: 'Hoja Adm. de Procedimientos' },
  { code: 'HAM',  name: 'Hoja Adm. de Medicamentos' },
  { code: 'INS',  name: 'Hoja de Gastos' },
  { code: 'HAU',  name: 'Historia Asistencial' },
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

  static styles = css`
    :host { display: block; font-family: system-ui, sans-serif; }
    .wrap { max-width: 900px; margin: 0 auto; padding: 20px; }
    .card { background: #fff; border-radius: 8px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #eee; }
    .grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px; }
    .col-12 { grid-column: span 12; }
    .col-4 { grid-column: span 4; }
    label { display: flex; flex-direction: column; gap: 4px; font-weight: 600; font-size: 0.9rem; color: #444; }
    textarea { min-height: 80px; padding: 10px; border: 1px solid #ccc; border-radius: 4px; resize: vertical; }
    select, input[type="text"] { padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .chip { 
      padding: 6px 12px; border: 1px solid #ddd; border-radius: 20px; background: #f9f9f9; 
      cursor: pointer; font-size: 0.8rem; transition: all 0.2s; display: flex; gap: 6px;
    }
    .chip[aria-pressed="true"] { background: #007bff; color: white; border-color: #0056b3; }
    .chip.all { border-style: dashed; border-color: #007bff; color: #007bff; }
    .chip.all[aria-pressed="true"] { background: #28a745; color: white; border-style: solid; }
    .code { opacity: 0.7; font-weight: bold; }
    .btn { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; transition: opacity 0.2s; }
    .btn.primary { background: #007bff; color: white; }
    .btn.ghost { background: transparent; color: #666; text-decoration: underline; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .progress { height: 8px; background: #eee; border-radius: 4px; overflow: hidden; margin-top: 15px; }
    .bar { height: 100%; background: #28a745; width: var(--w, 0%); transition: width 0.3s; }
    .status { display: flex; justify-content: space-between; font-size: 0.75rem; margin-top: 4px; color: #666; }
    .err { color: #dc3545; background: #fff5f5; padding: 10px; border-radius: 4px; margin-top: 10px; font-size: 0.85rem; border: 1px solid #f8d7da; }
    .help { font-size: 0.75rem; color: #888; font-weight: normal; margin-top: 2px; }
  `;

  constructor() {
    super();
    this.numeros = '';
    this.eps = 'NUEVA_EPS';
    this.modalidad = 'evento';
    this.incluirFactura = true;
    this.tiposSeleccionados = [];
    this.usarTodos = false;
    this._cargando = false;
    this._pct = 0;
  }

  // --- Lógica de procesamiento ---
  _parseIds() {
    return Array.from(new Set(String(this.numeros || '')
      .split(/[\s,;\n\t]+/).map(s => s.trim()).filter(Boolean)));
  }

  _getTiposParaPayload() {
    return this.usarTodos ? 'TODO' : this.tiposSeleccionados.join(',');
  }

  _validar() {
    const ids = this._parseIds();
    const idUser = this.loginData?.usuario?.id_usuario;
    const institucionId = this.loginData?.institucion?.idInstitucion;
    const tipos = this._getTiposParaPayload();

    if (!idUser || !institucionId) return { ok: false, msg: 'Faltan datos de sesión (ID Usuario/Institución).' };
    if (ids.length === 0) return { ok: false, msg: 'Ingrese al menos un número de admisión.' };
    if (!tipos) return { ok: false, msg: 'Seleccione al menos un tipo de documento.' };

    return { ok: true, ids, idUser, institucionId, tipos };
  }

  async _descargarBat(e) {
    e?.preventDefault();
    if (this._cargando) return;

    const val = this._validar();
    if (!val.ok) { this._error = val.msg; return; }

    this._error = '';
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
      this._startSim('Generando archivo BAT...');
      
      // Llamada al endpoint relativo (mismo servidor)
      const response = await fetch('/descargar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorTxt = await response.text();
        throw new Error(`Error ${response.status}: ${errorTxt}`);
      }

      const blob = await response.blob();
      this._finishSim('¡Listo!');
      this._saveBlob(blob, `descarga_${ids[0]}.bat`);
      
    } catch (err) {
      this._error = err.message;
      this._finishSim('Error');
    }
  }

  // --- Helpers de UI ---
  _startSim(msg) {
    this._cargando = true; this._pct = 0; this._msg = msg;
    this._simTimer = setInterval(() => {
      this._pct = Math.min(95, this._pct + (this._pct < 70 ? 5 : 1));
    }, 200);
  }

  _finishSim(msg) {
    this._pct = 100; this._msg = msg; this._cargando = false;
    clearInterval(this._simTimer);
  }

  _saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  _toggleChip(code) {
    this.usarTodos = false;
    const set = new Set(this.tiposSeleccionados);
    set.has(code) ? set.delete(code) : set.add(code);
    this.tiposSeleccionados = Array.from(set);
  }

  render() {
    const ids = this._parseIds();
    return html`
      <div class="wrap">
        <form class="card" @submit=${this._descargarBat}>
          <div class="grid">
            <div class="col-12">
              <label>
                IDs de Admisión / Facturas
                <textarea .value=${this.numeros} @input=${e => this.numeros = e.target.value} 
                  placeholder="Pega aquí los números separados por coma o espacio..."></textarea>
                <span class="help">${ids.length} detectados</span>
              </label>
            </div>

            <div class="col-4">
              <label>EPS
                <select .value=${this.eps} @change=${e => this.eps = e.target.value}>
                  <option value="NUEVA_EPS">NUEVA_EPS</option>
                  <option value="SALUD_TOTAL">SALUD_TOTAL</option>
                </select>
              </label>
            </div>

            <div class="col-4">
              <label>Modalidad
                <select .value=${this.modalidad} @change=${e => this.modalidad = e.target.value}>
                  <option value="evento">Evento</option>
                  <option value="capita">Cápita</option>
                </select>
              </label>
            </div>

            <div class="col-12">
              <label>Tipos de Documento</label>
              <div class="chips">
                <button type="button" class="chip all" aria-pressed=${this.usarTodos} @click=${() => {this.usarTodos = !this.usarTodos; this.tiposSeleccionados = [];}}>
                  TODOS
                </button>
                ${TIPOS.map(t => html`
                  <button type="button" class="chip" aria-pressed=${this.tiposSeleccionados.includes(t.code)} @click=${() => this._toggleChip(t.code)}>
                    ${t.name} <span class="code">${t.code}</span>
                  </button>
                `)}
              </div>
            </div>

            <div class="col-12">
              <label style="flex-direction:row; align-items:center; gap:10px; cursor:pointer;">
                <input type="checkbox" .checked=${this.incluirFactura} @change=${e => this.incluirFactura = e.target.checked}>
                Incluir Factura Electrónica
              </label>
            </div>

            <div class="col-12">
              <button class="btn primary" type="submit" ?disabled=${this._cargando}>
                ${this._cargando ? 'Procesando...' : 'Generar BAT'}
              </button>
              <button class="btn ghost" type="button" @click=${() => this.numeros = ''}>Limpiar</button>
            </div>

            ${this._renderProgreso()}
            ${this._error ? html`<div class="col-12 err">⚠️ ${this._error}</div>` : null}
          </div>
        </form>
      </div>
    `;
  }

  _renderProgreso() {
    if (this._pct === 0) return null;
    return html`
      <div class="col-12">
        <div class="progress"><div class="bar" style="--w: ${this._pct}%"></div></div>
        <div class="status"><span>${this._msg}</span><span>${this._pct}%</span></div>
      </div>
    `;
  }
}

customElements.define('admiciones-archivos', AdmicionesArchivos);