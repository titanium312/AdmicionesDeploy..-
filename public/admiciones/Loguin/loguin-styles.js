// loguin-styles.js
import { css } from 'lit';

/* loguin-styles.js */
export default css`
  :host {
    --primary: #1a1a2e;
    --secondary: #16213e;
    --accent: #7f5af0;
    --accent-2: #b388ff;
    --accent-cyan: #2cb67d;
    --text: #fffffe;
    --text-muted: #94a1b2;
    --error: #ff3860;
    --success: #2cb67d;
    --radius: 12px;
    --ease: cubic-bezier(0.22, 1, 0.36, 1);
    --transition: all 0.4s var(--ease);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .scene {
    position: relative;
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: 2rem;
    background-color: var(--primary);
    color: var(--text);
    overflow: hidden;
    isolation: isolate;
  }

  /* Fondo */
  .bg-aurora {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 75% 30%, rgba(47, 33, 107, 0.3) 0%, transparent 60%);
    z-index: -2;
    animation: aurora 16s infinite alternate;
  }
  .bg-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.15;
    z-index: -1;
  }
  .orb-a { width: 300px; height: 300px; background: var(--accent); top: -100px; right: -100px; animation: float-a 24s infinite var(--ease); }
  .orb-b { width: 400px; height: 400px; background: var(--accent-cyan); bottom: -150px; left: -100px; animation: float-b 20s infinite var(--ease); }

  /* Contenedor */
  .shell {
    position: relative;
    width: 100%;
    max-width: 420px;
    background: rgba(26, 26, 46, 0.75);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: var(--radius);
    padding: 2.5rem;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25),
      0 2px 6px rgba(0, 0, 0, 0.1),
      inset 0 0 0 1px rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.05);
    transform: translateY(0);
    transition: var(--transition);
  }
  .shell:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.3),
      0 4px 12px rgba(0, 0, 0, 0.15),
      inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  }

  /* Esquina decorativa opcional (no usada ahora) */
  .che-icon {
    position: absolute;
    top: 10px; right: 10px; z-index: 20;
    pointer-events: none;
    user-select: none;
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 36px; min-height: 36px; padding: 6px 8px; border-radius: 10px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    transition: transform .25s var(--ease), opacity .25s var(--ease);
  }
  .che-icon:hover { transform: translateY(-1px) scale(1.02); }
  .che-icon img { width: 28px; height: 28px; object-fit: contain; border-radius: 6px; filter: drop-shadow(0 1px 3px rgba(0,0,0,0.35)); }
  .che-icon .che-text { font-size: 18px; line-height: 1; color: var(--text); opacity: 0.95; text-shadow: 0 1px 2px rgba(0,0,0,0.35); }

  /* Branding */
  .brand-wrap { display: flex; flex-direction: column; align-items: center; gap: 1rem; margin-bottom: 2.5rem; }
  .brand { width: 64px; height: 64px; animation: halo 6s infinite ease-in-out; }
  .brand-text {
    font-size: 1.5rem; font-weight: 600; letter-spacing: 0.05em;
    background: linear-gradient(90deg, var(--accent), var(--accent-cyan));
    -webkit-background-clip: text; background-clip: text; color: transparent; text-transform: uppercase;
  }

  /* Header */
  .header { text-align: center; margin-bottom: 2rem; }
  .header h1 { font-size: 1.75rem; font-weight: 600; margin-bottom: 0.5rem; letter-spacing: -0.01em; }
  .muted { color: var(--text-muted); font-size: 0.875rem; }

  /* Formulario */
  .form { display: flex; flex-direction: column; gap: 1.5rem; }
  .group { position: relative; }
  .float { position: relative; }

  /* SOLO inputs de texto/clave (no checkbox) */
  input[type="text"],
  input[type="password"] {
    width: 100%;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius);
    color: var(--text);
    font-size: 1rem;
    transition: var(--transition);
    outline: none;
  }
  input[type="text"]:focus,
  input[type="password"]:focus { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(127, 90, 240, 0.2); }
  input[type="text"]:disabled,
  input[type="password"]:disabled { opacity: 0.6; cursor: not-allowed; }

  /* Label flotante SOLO en .float */
  .float label {
    position: absolute; left: 1rem; top: 1rem; color: var(--text-muted);
    pointer-events: none; transition: var(--transition); transform-origin: left center;
  }
  .float input:focus + label,
  .float input:not(:placeholder-shown) + label { transform: translateY(-1.5rem) scale(0.85); color: var(--accent); }

  .peek {
    position: absolute; right: 1rem; top: 50%; transform: translateY(-50%);
    background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0.25rem; font-size: 1.25rem; transition: var(--transition);
  }
  .peek:hover { color: var(--accent); transform: translateY(-50%) scale(1.1); }
  .peek:disabled { opacity: 0.5; cursor: not-allowed; }

  .glow { position: absolute; inset: 0; border-radius: var(--radius); pointer-events: none; opacity: 0; box-shadow: 0 0 12px var(--accent); transition: var(--transition); }
  .float input:focus ~ .glow { opacity: 0.4; }

  /* Checkbox flotante en esquina superior derecha del formulario */
  .remember-top {
    position: absolute;
    top: 12px; right: 12px;
    display: inline-flex; align-items: center; gap: 0.5rem;
    background: rgba(255,255,255,0.06);
    padding: 0.25rem 0.5rem;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    z-index: 25; /* por encima del contenido del shell */
    user-select: none;
  }
  .remember-top input[type="checkbox"] {
    width: auto; height: auto; margin: 0; accent-color: var(--accent);
    background: initial; border: initial; border-radius: 3px;
  }
  .remember-top span { font-size: 0.75rem; color: var(--text-muted); }

  .cta {
    width: 100%;
    padding: 1rem;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: white; border: none; border-radius: var(--radius);
    font-size: 1rem; font-weight: 500; cursor: pointer; transition: var(--transition);
    display: flex; justify-content: center; align-items: center; gap: 0.5rem;
    box-shadow: 0 4px 12px rgba(127, 90, 240, 0.2);
  }
  .cta:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(127, 90, 240, 0.3); }
  .cta:disabled { opacity: 0.7; cursor: not-allowed; }

  .spinner {
    width: 1rem; height: 1rem; border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%; border-top-color: white; animation: spin 1s linear infinite;
  }

  .error {
    color: var(--error); background: rgba(255, 56, 96, 0.1);
    padding: 0.75rem 1rem; border-radius: var(--radius); font-size: 0.875rem; text-align: center; animation: shake 0.4s var(--ease);
  }

  .foot { text-align: center; margin-top: 2rem; font-size: 0.75rem; }

  /* Animaciones */
  @keyframes halo { 0%,100%{opacity:1} 50%{opacity:.8; filter: drop-shadow(0 0 8px var(--accent));} }
  @keyframes aurora { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }
  @keyframes float-a { 0%,100%{ transform: translate(0,0);} 50%{ transform: translate(-20px,20px);} }
  @keyframes float-b { 0%,100%{ transform: translate(0,0);} 50%{ transform: translate(20px,-20px);} }
  @keyframes spin { to { transform: rotate(360deg);} }
  @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-4px)} 40%,80%{transform:translateX(4px)} }

  /* Responsive */
  @media (max-width: 480px) {
    .shell { padding: 1.5rem; }
    .remember-top { top: 8px; right: 8px; }
  }


`;
