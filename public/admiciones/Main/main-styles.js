// loguin-styles.js
import { css } from 'lit';

/* loguin-styles.js */
export default css`
.logout-btn {
      background: transparent;
      border: 1px solid var(--accent, #8b5cf6);
      color: var(--accent, #8b5cf6);
      padding: 0.4rem 0.7rem;
      border-radius: 6px;
      font-size: 0.9rem;
      cursor: pointer;
    }
    .logout-btn:hover {
      background: var(--accent, #8b5cf6);
      color: #fff;
    }
    :host {
      --bg-start: #0f172a; /* slate-900 */
      --bg-end: #1f2937;   /* gray-800 */
      --card-bg: rgba(255, 255, 255, 0.9);
      --text-strong: #111827; /* gray-900 */
      --text-muted: #6b7280;  /* gray-500 */
      --muted-1: #f3f4f6;     /* gray-100 */
      --muted-2: #e5e7eb;     /* gray-200 */
      --muted-3: #d1d5db;     /* gray-300 */
      --accent: #8b5cf6;      /* violet-500 (sutil) */
      --accent-soft: #ede9fe; /* violet-100 */
      --ring: rgba(139, 92, 246, 0.25);
      --shadow-xl: 0 24px 80px rgba(2, 6, 23, 0.25);

      display: block;
      min-height: 100vh;
      background: linear-gradient(135deg, var(--bg-start) 0%, var(--bg-end) 100%);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #fff;
      position: relative;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* Motas sutiles y luces suaves */
    :host::before,
    :host::after {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    :host::before {
      background: radial-gradient(1200px 600px at 100% -10%, rgba(255,255,255,0.06), transparent 70%),
                  radial-gradient(800px 400px at -10% 110%, rgba(255,255,255,0.04), transparent 70%);
      filter: blur(0.5px);
      animation: float 24s ease-in-out infinite;
    }
    :host::after {
      background-image: radial-gradient(circle at 20% 20%, rgba(139,92,246,0.08), transparent 35%);
      mix-blend-mode: screen;
      animation: float 28s ease-in-out infinite reverse;
    }

    .container {
      position: relative;
      z-index: 1;
      max-width: 1080px;
      margin: 0 auto;
      padding: 2.25rem 1.25rem 4rem;
    }

    header.welcome {
      text-align: center;
      margin: 0 0 2.5rem 0;
    }
    .title {
      font-size: clamp(2.2rem, 4.8vw, 3.6rem);
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0;
      background: linear-gradient(135deg, #ffffff 0%, #e5e7eb 100%);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
      text-shadow: 0 0 40px rgba(255,255,255,0.22);
      animation: fadeInDown 700ms ease-out both;
    }
    .subtitle {
      color: rgba(255,255,255,0.8);
      font-weight: 400;
      margin-top: 0.75rem;
      animation: fadeInDown 900ms ease-out both;
    }

    .user-card {
      background: var(--card-bg);
      backdrop-filter: blur(18px) saturate(1.1);
      border-radius: 22px;
      padding: 2rem;
      margin: 0 auto 2rem;
      box-shadow: var(--shadow-xl), 0 0 0 1px rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.2);
      color: var(--text-strong);
      overflow: hidden;
      animation: slideInUp 700ms cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    .user-card::before {
      content: '';
      position: absolute; inset: 0 0 auto 0; height: 3px;
      background: linear-gradient(90deg, var(--accent), #a78bfa, var(--accent));
      background-size: 260% 100%;
      animation: shimmer 3.2s ease-in-out infinite;
    }

    .card-header {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 1rem;
      align-items: center;
      margin-bottom: 1.25rem;
    }

    .avatar {
      width: 72px; height: 72px; border-radius: 50%;
      background: linear-gradient(135deg, #111827, #374151);
      display: grid; place-items: center;
      color: #fff; font-size: 1.8rem; font-weight: 800;
      position: relative; overflow: hidden;
      box-shadow: 0 12px 28px rgba(17,24,39,0.35);
      border: 1px solid rgba(255,255,255,0.12);
    }
    .avatar::after {
      content: '';
      position: absolute; inset: 0;
      background: linear-gradient(45deg, transparent, rgba(255,255,255,0.16), transparent);
      transform: translateX(-100%);
      animation: avatarShine 2.2s ease-in-out infinite;
    }

    .user-info h2 {
      font-size: 1.6rem; letter-spacing: -0.01em; margin: 0 0 0.15rem 0; font-weight: 750;
      color: var(--text-strong);
    }
    .user-info p { margin: 0; color: var(--text-muted); font-weight: 500; }

    .badge {
      justify-self: end;
      background: var(--accent-soft);
      color: #6d28d9;
      padding: 0.4rem 0.7rem;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 700;
      border: 1px solid rgba(139,92,246,0.2);
      box-shadow: 0 1px 0 rgba(255,255,255,0.7) inset;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }

    .info-item {
      background: linear-gradient(180deg, var(--muted-1), #ffffff);
      border: 1px solid rgba(17, 24, 39, 0.06);
      border-radius: 14px;
      padding: 1rem 1.1rem;
      position: relative;
      transition: transform 240ms ease, box-shadow 240ms ease;
      box-shadow: 0 1px 0 rgba(255,255,255,0.6) inset, 0 2px 16px rgba(17,24,39,0.05);
    }
    .info-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 2px 0 rgba(255,255,255,0.7) inset, 0 14px 36px rgba(17,24,39,0.09);
    }

    .info-label {
      display: inline-flex; align-items: center; gap: 0.5rem;
      font-size: 0.78rem; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase;
      color: #475569;
    }
    .info-value { margin-top: 0.35rem; font-size: 1.05rem; font-weight: 650; color: var(--text-strong); }

    .icon { width: 16px; height: 16px; display: inline-grid; place-items: center; }
    .icon-user::before { content: '👤'; font-size: 14px; }
    .icon-briefcase::before { content: '💼'; font-size: 14px; }
    .icon-building::before { content: '🏢'; font-size: 14px; }

    .section {
      margin-top: 2.25rem;
      animation: fadeInUp 700ms ease-out both;
    }
    .section-title {
      color: #e5e7eb; font-weight: 700; letter-spacing: 0.02em; margin: 0 0 0.9rem 0;
    }

    .module-card {
      background: var(--card-bg);
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 18px;
      padding: 1.25rem;
      box-shadow: var(--shadow-xl);
    }

    /* Skeleton */
    .skeleton {
      display: grid; gap: 1rem; grid-template-columns: 80px 1fr;
      background: var(--card-bg); border-radius: 22px; padding: 2rem; border: 1px solid rgba(255,255,255,0.16);
      overflow: hidden; position: relative;
    }
    .sk-box { background: linear-gradient(90deg, #e5e7eb, #f3f4f6, #e5e7eb); background-size: 200% 100%; animation: shimmer 2.2s infinite; }
    .sk-avatar { width: 72px; height: 72px; border-radius: 50%; }
    .sk-line { height: 14px; border-radius: 8px; }

    /* Preferencias de movimiento reducido */
    @media (prefers-reduced-motion: reduce) {
      * { animation: none !important; transition: none !important; }
    }

    /* Responsive */
    @media (max-width: 900px) {
      .info-grid { grid-template-columns: 1fr; }
      .card-header { grid-template-columns: auto 1fr; }
      .badge { display: none; }
    }

    /* Animaciones */
    @keyframes float { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-14px) } }
    @keyframes fadeInDown { from { opacity: 0; transform: translateY(-24px) } to { opacity: 1; transform: translateY(0) } }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }
    @keyframes slideInUp { from { opacity: 0; transform: translateY(36px) } to { opacity: 1; transform: translateY(0) } }
    @keyframes shimmer { 0% { background-position: 0% 50% } 50% { background-position: 100% 50% } 100% { background-position: 0% 50% } }
    @keyframes avatarShine { 0% { transform: translateX(-100%) } 50% { transform: translateX(100%) } 100% { transform: translateX(-100%) } }
  `;