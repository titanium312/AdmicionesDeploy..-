// loguin-styles.js
import { css } from 'lit';

/* loguin-styles.js */
export default css`

          
    :host {
      all: initial; display: block; box-sizing: border-box; width: 100%;
      --bg:#0a0f1f; --panel:#0f1730; --panel-2:#0d1429; --muted:#9aa6c2; --fg:#e6edf7;
      --primary:#6aa8ff; --primary-2:#98c2ff; --accent:#8b5cf6; --danger:#ef4444;
      font: 14px/1.45 ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
      color: var(--fg); background: var(--bg);
    }
    :host *, :host *::before, :host *::after { box-sizing: inherit; }

    .wrap { max-width: 1280px; width: 100%; margin: 0 auto; padding: 16px; }
    .header { display: grid; gap: 6px; margin-bottom: 12px; }
    .title { margin:0; font-size:22px; font-weight:800; letter-spacing:.2px;
      background: linear-gradient(90deg, var(--primary), var(--accent));
      -webkit-background-clip:text; background-clip:text; color:transparent; }
    .subtitle { margin:0; color: var(--muted); }

    .card {
      background: linear-gradient(180deg, var(--panel), var(--panel-2));
      border: 1px solid #1b2545; border-radius: 14px; padding: 14px;
      box-shadow: 0 12px 40px rgba(10,15,31,.35);
    }

    .grid { display: grid; gap: 12px; grid-template-columns: repeat(12, minmax(0,1fr)); }
    .col-4 { grid-column: span 4; } .col-12 { grid-column: 1 / -1; }

    label { display: grid; gap: 6px; font-weight: 700; }
    .help { color: var(--muted); font-weight: 500; font-size: 12px; }
    .err { color: var(--danger); font-weight: 700; }

    textarea, select, input[type="text"] {
      all: unset; width: 100%; border: 1px solid #243159; background: #0e162b; color: var(--fg);
      border-radius: 10px; padding: 10px 12px; font: inherit;
    }
    textarea { min-height: 96px; resize: vertical; }
    select { cursor: pointer; }

    .row { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
    .btn { all: unset; border:1px solid #2a3a6b; background:#0e1b3b; color:#eaf2ff; border-radius:999px;
      padding:10px 14px; cursor:pointer; transition: box-shadow .15s, transform .05s; display:inline-flex; gap:8px; font-weight:900; }
    .btn:hover { box-shadow: 0 10px 28px rgba(106,168,255,.18); }
    .btn:active { transform: translateY(1px); }
    .btn.primary { background: linear-gradient(90deg, var(--primary), var(--accent)); border-color: transparent; color:#0a0f1f; }
    .btn.ghost { background: transparent; }
    .btn:disabled { opacity:.55; cursor:not-allowed; box-shadow:none; transform:none; }

    /* Chips con nombres + código pequeño */
    .chips { display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:10px; }
    .chip {
      all: unset; border:1px solid #2a3a6b; background:#101b3a; color:#eaf2ff; border-radius:12px;
      padding:10px 12px; cursor:pointer; user-select:none; display:flex; align-items:center; justify-content:space-between; gap:10px;
    }
    .chip:hover { border-color:#3a57a6; }
    .chip[aria-pressed="true"] { background:#152a5e; border-color:#456dc9; }
    .chip .name { font-weight:800; letter-spacing:.2px; }
    .chip .code { font-size:12px; opacity:.75; border:1px solid #304378; border-radius:999px; padding:2px 8px; }

    .chip.all { border-style:dashed; justify-content:center; }
    .chip.all .name { font-weight:900; }

    .progress { height:12px; border-radius:999px; overflow:hidden; background:#0f1530; border:1px solid #243159; }
    .bar { height:100%; width:var(--w,0%); background: linear-gradient(90deg, var(--primary), var(--primary-2), var(--accent));
      transition: width .2s ease; }
    .status { display:flex; justify-content:space-between; font-size:12px; color:var(--muted); }

    /* Instrucciones (3 cajitas) */
    .instructions { display:grid; grid-template-columns: repeat(12, minmax(0,1fr)); gap:12px; margin-top:14px; }
    .ibox { grid-column: span 4; background:#0f1730; border:1px solid #1b2545; border-radius:12px; padding:12px; box-shadow:0 8px 24px rgba(11,16,32,.25); display:grid; gap:6px; }
    .ibox h3 { margin:0; font-size:14px; font-weight:900; color:#cfe2ff; }
    .ibox p { margin:0; color: var(--muted); }

    @media (max-width: 1024px) { .col-4 { grid-column: 1/-1; } .ibox { grid-column: 1/-1; } }


`;