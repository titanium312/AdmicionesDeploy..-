import { LitElement, html, css } from 'lit';
import '../Admiciones/documento-admicion.js';
import '../Loguin/loguin.js'; 
import styles from './main-styles.js';

class Main extends LitElement {
  static properties = {
    loginData: { type: Object },
  };

  static styles = styles;

  constructor() {
    super();
    this.loginData = null;
  }

  _initial(nombre) {
    if (!nombre || typeof nombre !== 'string') return '·';
    const n = nombre.trim();
    return n ? n.charAt(0).toUpperCase() : '·';
  }

  logout() {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_token_exp');
      localStorage.removeItem('auth_payload_b64');
      localStorage.removeItem('remember_flag');
      localStorage.removeItem('remember_username');
      
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_payload_b64');
    } catch (err) {
      console.warn('No se pudo limpiar el almacenamiento', err);
    }
    this.loginData = null;
  }

  render() {
    if (!this.loginData) {
      return html`<loguin-main @login-success=${e => this.loginData = e.detail}></loguin-main>`;
    }

    const usuario = this.loginData?.usuario || {};
    const institucion = this.loginData?.institucion || {};
    
    const nombre = usuario.nombre || 'Usuario invitado';
    
    // USANDO ESPECÍFICAMENTE id_usuario
    const idUsuario = usuario.id_usuario || 'Sin ID'; 

    const perfilesUsuario = Array.isArray(usuario.perfiles) ? usuario.perfiles : [];
    const perfilesGenerales = Array.isArray(this.loginData.perfiles) ? this.loginData.perfiles : [];
    
    const todosPerfiles = [...new Set([...perfilesUsuario, ...perfilesGenerales])];
    const perfilesTexto = todosPerfiles.length > 0 ? todosPerfiles.join(', ') : 'Sin perfil asignado';
    
    const nombreInstitucion = institucion.nombre || 'Institución no especificada';
    const idInstitucion = institucion.idInstitucion || '';

    return html`
      <div class="container">
        <header class="welcome">
          <h1 class="title">¡Bienvenido!</h1>
          <p class="subtitle">Sistema de gestión institucional</p>
          <button class="logout-btn" @click=${this.logout}>⎋ Cerrar sesión</button>
        </header>

        ${this._card(nombre, perfilesTexto, nombreInstitucion, idInstitucion, idUsuario)}

        <section class="section">
          <h3 class="section-title">Módulos de Admisiones</h3>
          <div class="module-card">
            <admiciones-archivos .loginData=${this.loginData}></admiciones-archivos>
          </div>
        </section>
      </div>
    `;
  }

  _card(nombre, perfiles, nombreInstitucion, idInstitucion, idUsuario) {
    const inicial = this._initial(nombre);
    return html`
      <article class="user-card">
        <div class="card-header">
          <div class="avatar">${inicial}</div>
          <div class="user-info">
            <h2>${nombre}</h2>
            <p>Información del usuario</p>
          </div>
          <span class="badge">Activo</span>
        </div>
        <div class="info-grid">
          ${this._infoItem('👤', 'Nombre completo', nombre)}
          ${this._infoItem('🆔', 'ID de Usuario', idUsuario)} 
          ${this._infoItem('💼', 'Perfiles asignados', perfiles)}
          ${this._infoItem('🏢', 'Institución', nombreInstitucion)}
          ${idInstitucion ? this._infoItem('🔢', 'ID Institución', idInstitucion) : ''}
          ${this._infoItem('🔑', 'Token', this.loginData?.token ? '✓ Presente' : '✗ No disponible')}
        </div>
      </article>
    `;
  }

  _infoItem(emoji, label, value) {
    return html`
      <div class="info-item">
        <div class="info-label"><span>${emoji}</span>${label}</div>
        <div class="info-value">${value}</div>
      </div>
    `;
  }
}

customElements.define('main-p', Main);