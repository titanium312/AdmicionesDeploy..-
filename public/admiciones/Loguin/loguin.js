// loguin-main.js — Interfaz de login (actualizado con endpoint correcto)
import { LitElement, html } from 'lit';
import '../Main/main.js';
import styles from './loguin-styles.js';
import { BASE_URL, apiFetch } from '../api.js';

// Helpers seguros para Storage
const safeSet = (storage, k, v) => { try { storage.setItem(k, v); return true; } catch { return false; } };
const safeGet = (storage, k) => { try { return storage.getItem(k); } catch { return null; } };
const safeDel = (storage, k) => { try { storage.removeItem(k); } catch {} };
const storageOK = () => {
  try { const x='__t__'; localStorage.setItem(x,x); localStorage.removeItem(x); return true; }
  catch { return false; }
};

// Ofuscación simple (Base64)
const enc = new TextEncoder();
const dec = new TextDecoder();
const b64encode = (str) => {
  const bytes = enc.encode(str);
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin);
};
const b64decode = (b64) => {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, ch => ch.charCodeAt(0));
  return dec.decode(bytes);
};

// Claves
const KEYS = {
  REMEMBER_FLAG: 'remember_flag',
  REMEMBER_USER: 'remember_username',
  TOKEN_LS: 'auth_token',
  TOKEN_EXP: 'auth_token_exp',
  PAYLOAD_LS: 'auth_payload_b64'
};
const SESSION = {
  TOKEN: 'auth_token',
  PAYLOAD: 'auth_payload_b64'
};
const ONE_HOUR_MS = 60 * 60 * 1000;
const nowMs = () => Date.now();

class Loguin extends LitElement {
  static properties = {
    username: { type: String },
    password: { type: String },
    errorMessage: { type: String },
    loginData: { type: Object },
    loading: { type: Boolean },
    showPassword: { type: Boolean },
    remember: { type: Boolean },
    _year: { state: true },
  };

  static styles = styles;

  constructor() {
    super();
    this.username = '';
    this.password = '';
    this.errorMessage = '';
    this.loginData = null;
    this.loading = false;
    this.showPassword = false;
    this._year = new Date().getFullYear();
    this.remember = true;

    // Cargar usuario recordado
    if (storageOK()) {
      const rememberFlag = safeGet(localStorage, KEYS.REMEMBER_FLAG);
      if (rememberFlag !== null) this.remember = rememberFlag === '1';
      const savedUser = safeGet(localStorage, KEYS.REMEMBER_USER);
      if (savedUser) this.username = savedUser;
    }
  }

  firstUpdated() {
    // Auto-login si hay token válido
    if (!this.remember || !storageOK()) return;

    const encToken = safeGet(localStorage, KEYS.TOKEN_LS);
    const expStr   = safeGet(localStorage, KEYS.TOKEN_EXP);
    if (!encToken || !expStr) return;

    const exp = parseInt(expStr, 10);
    if (!Number.isFinite(exp)) {
      this.#clearPersistent();
      return;
    }

    if (nowMs() < exp) {
      let restored = null;
      const payloadB64 = safeGet(localStorage, KEYS.PAYLOAD_LS);
      if (payloadB64) {
        try { restored = JSON.parse(b64decode(payloadB64)); } catch { restored = null; }
      }
      const token = b64decode(encToken);
      this.loginData = restored && typeof restored === 'object' ? { ...restored, token } : { token };
      this.dispatchEvent(new CustomEvent('login-success', { detail: this.loginData, bubbles: true, composed: true }));
    } else {
      this.#clearPersistent();
    }
  }

  #clearPersistent() {
    safeDel(localStorage, KEYS.TOKEN_LS);
    safeDel(localStorage, KEYS.TOKEN_EXP);
    safeDel(localStorage, KEYS.PAYLOAD_LS);
  }
  #clearSession() {
    safeDel(sessionStorage, SESSION.TOKEN);
    safeDel(sessionStorage, SESSION.PAYLOAD);
  }

  handleInput(e) {
    const t = e.currentTarget;
    if (!t) return;
    const { name, value } = t;
    if (name in this) {
      this[name] = value;
      if (name === 'username' && this.remember && storageOK()) {
        safeSet(localStorage, KEYS.REMEMBER_USER, value);
      }
    }
  }

  onRememberChange = (e) => {
    const checked = !!e.target?.checked;
    this.remember = checked;

    if (storageOK()) {
      safeSet(localStorage, KEYS.REMEMBER_FLAG, checked ? '1' : '0');
      if (!checked) {
        this.#clearPersistent();
        safeDel(localStorage, KEYS.REMEMBER_USER);
      } else if (this.username) {
        safeSet(localStorage, KEYS.REMEMBER_USER, this.username);
      }
    }
  };

  toggleShowPassword() {
    this.showPassword = !this.showPassword;
    this.updateComplete.then(() => {
      const input = this.renderRoot?.querySelector('#password');
      if (input) input.focus();
    });
  }

  async handleSubmit(e) {
    e.preventDefault();
    if (this.loading) return;

    this.errorMessage = '';
    this.loginData = null;
    this.loading = true;

    try {
      // USAR EL ENDPOINT CORRECTO /Loguin (con "i")
      const payload = await apiFetch('/Loguin', {
        method: 'POST',
        body: { 
          username: this.username.trim(), 
          password: this.password 
        }
      });

      if (!payload || !payload.token) {
        throw new Error('Respuesta inválida del servidor (falta token)');
      }

      // La respuesta esperada es como la del curl:
      // {
      //   "token": "bxelyKFCq753YSacnxaU",
      //   "usuario": { "id_usuario": 6874, "nombre": "...", "usuario": "...", "perfiles": [...] },
      //   "institucion": { "idInstitucion": 20, "nombre": "..." },
      //   "perfiles": ["ADMINISTRADOR DE SISTEMAS 1", "..."]
      // }
      this.loginData = payload;

      this.dispatchEvent(new CustomEvent('login-success', {
        detail: this.loginData, 
        bubbles: true, 
        composed: true,
      }));

      if (storageOK()) {
        const payloadB64 = b64encode(JSON.stringify(this.loginData));
        if (this.remember) {
          const exp = nowMs() + ONE_HOUR_MS;
          safeSet(localStorage, KEYS.TOKEN_LS, b64encode(payload.token));
          safeSet(localStorage, KEYS.TOKEN_EXP, String(exp));
          safeSet(localStorage, KEYS.PAYLOAD_LS, payloadB64);
          safeSet(localStorage, KEYS.REMEMBER_USER, this.username.trim());
          safeSet(localStorage, KEYS.REMEMBER_FLAG, '1');
          this.#clearSession();
        } else {
          safeSet(sessionStorage, SESSION.TOKEN, this.loginData.token);
          safeSet(sessionStorage, SESSION.PAYLOAD, payloadB64);
          this.#clearPersistent();
          safeSet(localStorage, KEYS.REMEMBER_FLAG, '0');
          safeDel(localStorage, KEYS.REMEMBER_USER);
        }
      }

      this.password = ''; // Limpiar contraseña después del login exitoso
    } catch (err) {
      this.errorMessage = err?.message || 'Login incorrecto o error del servidor';
      console.error('[login] error:', err);
    } finally {
      this.loading = false;
    }
  }

  renderBrand() {
    return html`
      <div class="brand-wrap" aria-hidden="true">
        <svg class="brand" viewBox="0 0 64 64" fill="none" role="img">
          <defs>
            <linearGradient id="gptGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="var(--accent)"/>
              <stop offset="50%" stop-color="var(--accent-2)"/>
              <stop offset="100%" stop-color="var(--accent-cyan)"/>
            </linearGradient>
            <filter id="f1" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="1.2" />
            </filter>
          </defs>
          <g filter="url(#f1)">
            <path d="M14 46c0-12 10-22 22-22h6" stroke="url(#gptGrad)" stroke-width="6" stroke-linecap="round"/>
            <path d="M42 12v28a12 12 0 1 1-12-12h16" stroke="url(#gptGrad)" stroke-width="6" stroke-linecap="round"/>
            <path d="M20 26h18" stroke="url(#gptGrad)" stroke-width="6" stroke-linecap="round"/>
          </g>
        </svg>
        <span class="brand-text" aria-label="GPT">Salud plus</span>
      </div>
    `;
  }

  render() {
    if (this.loginData) {
      return html`<main-p .loginData=${this.loginData}></main-p>`;
    }

    return html`
      <div class="scene">
        <div class="bg-aurora" aria-hidden="true"></div>
        <div class="bg-orb orb-a" aria-hidden="true"></div>
        <div class="bg-orb orb-b" aria-hidden="true"></div>

        <section class="shell" aria-live="polite" aria-busy=${this.loading ? 'true' : 'false'}>
          <label class="remember-top" for="remember">
            <input
              id="remember"
              type="checkbox"
              name="remember"
              .checked=${!!this.remember}
              @change=${this.onRememberChange}
              ?disabled=${this.loading}
            />
            <span>Recordarme</span>
          </label>

          ${this.renderBrand()}

          <header class="header">
            <h1>Bienvenido</h1>
            <p class="muted">Accede para continuar</p>
          </header>

          <form class="form" @submit=${this.handleSubmit} novalidate>
            <div class="group">
              <div class="float">
                <input
                  id="username"
                  name="username"
                  type="text"
                  inputmode="text"
                  autocomplete="username"
                  placeholder=" "
                  .value=${this.username}
                  @input=${this.handleInput}
                  ?disabled=${this.loading}
                  required
                  aria-required="true"
                />
                <label for="username">Usuario</label>
                <div class="glow"></div>
              </div>
            </div>

            <div class="group">
              <div class="float">
                <input
                  id="password"
                  name="password"
                  type=${this.showPassword ? 'text' : 'password'}
                  autocomplete="current-password"
                  placeholder=" "
                  .value=${this.password}
                  @input=${this.handleInput}
                  ?disabled=${this.loading}
                  required
                  aria-required="true"
                />
                <label for="password">Contraseña</label>
                <button
                  type="button"
                  class="peek"
                  @click=${this.toggleShowPassword}
                  ?disabled=${this.loading}
                  aria-label=${this.showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >${this.showPassword ? '🙈' : '👁️'}</button>
                <div class="glow"></div>
              </div>
            </div>

            ${this.errorMessage ? html`
              <div class="error" role="alert">${this.errorMessage}</div>
            ` : null}

            <button class="cta" type="submit" ?disabled=${this.loading}>
              ${this.loading
                ? html`<span class="spinner" aria-hidden="true"></span> Cargando…`
                : 'Iniciar sesión'}
            </button>
          </form>

          <footer class="foot muted">© ${this._year} — Interfaz con cariño ✦</footer>
        </section>
      </div>
    `;
  }
}

customElements.define('loguin-main', Loguin);