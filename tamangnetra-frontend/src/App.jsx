import { useState, useRef, useEffect, useCallback } from "react";

// ─── CONFIG ────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const MAX_CHARS = 200;

const LANGUAGES = [
  { code: "English", label: "English", flag: "🇬🇧", short: "EN" },
  { code: "Nepali", label: "नेपाली", flag: "🇳🇵", short: "NE" },
  { code: "Tamang", label: "Tamang", flag: "🏔️", short: "TM" },
];

const ACCEPTED_FORMATS = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "text/csv": ".csv",
  "text/tab-separated-values": ".tsv",
};

// ─── GLOBAL STYLES ─────────────────────────────────────────────────────────
const injectStyles = () => {
  if (document.getElementById("tn-styles")) return;
  const style = document.createElement("style");
  style.id = "tn-styles";
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #080810; color: #e8e6f0; font-family: 'DM Sans', sans-serif; }
    ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #12121e; }
    ::-webkit-scrollbar-thumb { background: #2a2840; border-radius: 4px; }

    .tn-app { min-height: 100vh; background: #080810; }

    /* NAV */
    .tn-nav { display: flex; align-items: center; justify-content: space-between;
      padding: 0 2rem; height: 60px; border-bottom: 1px solid #1a1a2e;
      background: rgba(8,8,16,0.8); backdrop-filter: blur(12px);
      position: sticky; top: 0; z-index: 100; }
    .tn-logo { font-family: 'Sora', sans-serif; font-size: 1.25rem; font-weight: 700;
      background: linear-gradient(135deg, #f5a623, #e05c3a); -webkit-background-clip: text;
      -webkit-text-fill-color: transparent; letter-spacing: -0.02em; }
    .tn-nav-links { display: flex; gap: 0.25rem; }
    .tn-nav-tab { background: none; border: none; color: #8884a8; font-family: 'DM Sans', sans-serif;
      font-size: 0.85rem; padding: 0.4rem 0.9rem; border-radius: 20px; cursor: pointer;
      transition: all 0.2s; }
    .tn-nav-tab:hover { color: #e8e6f0; background: #1a1a2e; }
    .tn-nav-tab.active { color: #f5a623; background: rgba(245,166,35,0.12); }
    .tn-badge { display: inline-block; background: rgba(224,92,58,0.2); color: #e05c3a;
      font-size: 0.65rem; padding: 1px 6px; border-radius: 10px; margin-left: 4px;
      font-weight: 600; vertical-align: middle; }

    /* SECTIONS */
    .tn-section { max-width: 900px; margin: 0 auto; padding: 2.5rem 1.5rem; }
    .tn-section-title { font-family: 'Sora', sans-serif; font-size: 1.5rem; font-weight: 600;
      color: #e8e6f0; margin-bottom: 0.35rem; }
    .tn-section-sub { color: #6b6890; font-size: 0.9rem; margin-bottom: 1.75rem; }

    /* CARD */
    .tn-card { background: #10101c; border: 1px solid #1e1e32; border-radius: 16px;
      padding: 1.5rem; }

    /* LANG BAR */
    .tn-lang-bar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem; }
    .tn-lang-btn { flex: 1; display: flex; flex-direction: column; align-items: center;
      gap: 2px; background: #18182c; border: 1.5px solid #2a2840; border-radius: 10px;
      padding: 0.6rem 0.5rem; cursor: pointer; transition: all 0.2s; }
    .tn-lang-btn:hover { border-color: #f5a623; }
    .tn-lang-btn.selected { border-color: #f5a623; background: rgba(245,166,35,0.08); }
    .tn-lang-btn .flag { font-size: 1.1rem; }
    .tn-lang-btn .label { font-size: 0.75rem; color: #8884a8; font-weight: 500; }
    .tn-lang-btn.selected .label { color: #f5a623; }
    .tn-swap-btn { display: flex; align-items: center; justify-content: center;
      width: 36px; height: 36px; background: #1e1e32; border: 1px solid #2a2840;
      border-radius: 50%; cursor: pointer; transition: all 0.25s; color: #8884a8;
      font-size: 1rem; flex-shrink: 0; }
    .tn-swap-btn:hover { background: rgba(245,166,35,0.12); color: #f5a623;
      border-color: #f5a623; transform: rotate(180deg); }

    /* TEXTAREA */
    .tn-textarea-wrap { position: relative; }
    .tn-textarea { width: 100%; background: #0d0d1a; border: 1px solid #1e1e32;
      border-radius: 10px; color: #e8e6f0; font-family: 'DM Sans', sans-serif;
      font-size: 0.95rem; padding: 0.85rem 1rem 2.5rem; resize: none; outline: none;
      line-height: 1.6; transition: border-color 0.2s; }
    .tn-textarea:focus { border-color: #f5a623; }
    .tn-textarea::placeholder { color: #3a3858; }
    .tn-char-count { position: absolute; bottom: 0.5rem; right: 0.75rem;
      font-size: 0.75rem; color: #3a3858; }
    .tn-char-count.warn { color: #e05c3a; }

    /* TRANSLATE RESULT */
    .tn-result-box { background: #0d0d1a; border: 1px solid #1e1e32; border-radius: 10px;
      padding: 0.85rem 1rem; min-height: 80px; font-size: 0.95rem; line-height: 1.6;
      color: #c9c6e0; position: relative; }
    .tn-result-box .placeholder { color: #2a2840; font-style: italic; }

    /* ACTIONS ROW */
    .tn-actions { display: flex; gap: 0.6rem; margin-top: 1rem; align-items: center; }
    .tn-btn { display: inline-flex; align-items: center; gap: 0.4rem;
      padding: 0.55rem 1.1rem; border-radius: 8px; font-size: 0.85rem;
      font-family: 'DM Sans', sans-serif; font-weight: 500; cursor: pointer;
      transition: all 0.2s; border: none; }
    .tn-btn-primary { background: linear-gradient(135deg, #f5a623, #e05c3a);
      color: white; }
    .tn-btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }
    .tn-btn-primary:active { transform: translateY(0); }
    .tn-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
    .tn-btn-ghost { background: #1a1a2e; border: 1px solid #2a2840; color: #8884a8; }
    .tn-btn-ghost:hover { border-color: #f5a623; color: #f5a623; }
    .tn-btn-ghost.playing { border-color: #f5a623; color: #f5a623;
      background: rgba(245,166,35,0.1); }
    .tn-btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }
    .tn-btn-sm { padding: 0.4rem 0.75rem; font-size: 0.8rem; }

    /* DIVIDER */
    .tn-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .tn-col-label { font-size: 0.75rem; color: #4a4870; font-weight: 500;
      text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.4rem; }

    /* FILE DROP */
    .tn-drop-zone { border: 2px dashed #2a2840; border-radius: 14px;
      padding: 2.5rem 1.5rem; text-align: center; cursor: pointer;
      transition: all 0.25s; position: relative; }
    .tn-drop-zone:hover, .tn-drop-zone.dragging { border-color: #f5a623;
      background: rgba(245,166,35,0.04); }
    .tn-drop-icon { font-size: 2rem; margin-bottom: 0.75rem; }
    .tn-drop-text { font-size: 0.9rem; color: #6b6890; }
    .tn-drop-text strong { color: #c9c6e0; }
    .tn-drop-hint { font-size: 0.75rem; color: #3a3858; margin-top: 0.4rem; }
    .tn-file-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }

    /* FILE SELECTED */
    .tn-file-chip { display: flex; align-items: center; gap: 0.6rem;
      background: #1a1a2e; border: 1px solid #2a2840; border-radius: 10px;
      padding: 0.75rem 1rem; margin-bottom: 1rem; }
    .tn-file-chip .name { font-size: 0.9rem; color: #c9c6e0; flex: 1; overflow: hidden;
      text-overflow: ellipsis; white-space: nowrap; }
    .tn-file-chip .size { font-size: 0.75rem; color: #4a4870; }
    .tn-file-chip .remove { background: none; border: none; color: #4a4870;
      cursor: pointer; font-size: 1rem; transition: color 0.2s; }
    .tn-file-chip .remove:hover { color: #e05c3a; }

    /* PROGRESS */
    .tn-progress-wrap { margin-top: 1rem; }
    .tn-progress-label { display: flex; justify-content: space-between;
      font-size: 0.78rem; color: #6b6890; margin-bottom: 0.5rem; }
    .tn-progress-bar { height: 4px; background: #1a1a2e; border-radius: 2px;
      overflow: hidden; }
    .tn-progress-fill { height: 100%; border-radius: 2px;
      background: linear-gradient(90deg, #f5a623, #e05c3a);
      transition: width 0.3s ease; }

    /* OUTPUT VIEWER */
    .tn-viewer { margin-top: 1.5rem; }
    .tn-viewer-header { display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 1rem; }
    .tn-viewer-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .tn-viewer-pane { background: #0d0d1a; border: 1px solid #1e1e32; border-radius: 12px;
      padding: 1.25rem; max-height: 400px; overflow-y: auto; }
    .tn-viewer-pane p { font-size: 0.875rem; line-height: 1.75; color: #c9c6e0;
      margin-bottom: 0.75rem; cursor: pointer; padding: 0.2rem 0.35rem; border-radius: 4px;
      transition: background 0.15s; }
    .tn-viewer-pane p:hover { background: rgba(245,166,35,0.07); }
    .tn-viewer-pane p.highlight { background: rgba(245,166,35,0.12); }

    /* GLOSSARY */
    .tn-glossary { margin-top: 1rem; background: #0d0d1a; border: 1px solid #1e1e32;
      border-radius: 12px; overflow: hidden; }
    .tn-glossary-header { display: flex; align-items: center; justify-content: space-between;
      padding: 0.9rem 1.25rem; border-bottom: 1px solid #1a1a2e; cursor: pointer; }
    .tn-glossary-header span { font-size: 0.85rem; font-weight: 500; color: #8884a8; }
    .tn-glossary-row { display: grid; grid-template-columns: 1fr auto 1fr;
      align-items: center; gap: 0.75rem; padding: 0.55rem 1.25rem;
      border-bottom: 1px solid #0f0f1a; font-size: 0.82rem; }
    .tn-glossary-row:last-child { border-bottom: none; }
    .tn-glossary-orig { color: #c9c6e0; }
    .tn-glossary-arrow { color: #3a3858; }
    .tn-glossary-trans { color: #f5a623; }
    .tn-glossary-count { color: #4a4870; font-size: 0.72rem; }

    /* YOUTUBE */
    .tn-url-row { display: flex; gap: 0.6rem; }
    .tn-input { flex: 1; background: #0d0d1a; border: 1px solid #1e1e32;
      border-radius: 8px; color: #e8e6f0; font-family: 'DM Sans', sans-serif;
      font-size: 0.9rem; padding: 0.65rem 1rem; outline: none; transition: border-color 0.2s; }
    .tn-input:focus { border-color: #f5a623; }
    .tn-input::placeholder { color: #2a2840; }

    /* SUBTITle RESULT */
    .tn-subs-list { background: #0d0d1a; border: 1px solid #1e1e32; border-radius: 10px;
      max-height: 300px; overflow-y: auto; margin-top: 1rem; }
    .tn-sub-row { display: grid; grid-template-columns: 70px 1fr 1fr;
      gap: 0.75rem; padding: 0.6rem 1rem; border-bottom: 1px solid #0f0f1a;
      align-items: start; font-size: 0.82rem; }
    .tn-sub-row:last-child { border-bottom: none; }
    .tn-sub-time { color: #4a4870; font-family: monospace; font-size: 0.75rem; padding-top: 1px; }
    .tn-sub-orig { color: #6b6890; }
    .tn-sub-trans { color: #c9c6e0; }

    /* STATUS DOT */
    .tn-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%;
      background: #f5a623; margin-right: 6px; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

    /* WAVE ANIMATION */
    @keyframes wave {
      0%,100% { transform: scaleY(1); } 50% { transform: scaleY(2); }
    }
    .tn-wave { display: flex; align-items: center; gap: 2px; height: 16px; }
    .tn-wave span { display: block; width: 3px; background: #f5a623; border-radius: 2px;
      animation: wave 0.8s ease-in-out infinite; }
    .tn-wave span:nth-child(2) { animation-delay: 0.15s; }
    .tn-wave span:nth-child(3) { animation-delay: 0.3s; }
    .tn-wave span:nth-child(4) { animation-delay: 0.15s; }

    /* TOAST */
    .tn-toast { position: fixed; bottom: 1.5rem; right: 1.5rem;
      background: #1e1e32; border: 1px solid #2a2840; border-radius: 10px;
      padding: 0.75rem 1.25rem; font-size: 0.85rem; color: #c9c6e0;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4); z-index: 999;
      animation: slideUp 0.3s ease; }
    @keyframes slideUp { from{transform:translateY(8px);opacity:0} to{transform:translateY(0);opacity:1} }

    /* ERROR */
    .tn-error { background: rgba(224,92,58,0.1); border: 1px solid rgba(224,92,58,0.3);
      border-radius: 8px; padding: 0.65rem 1rem; font-size: 0.82rem; color: #e05c3a;
      margin-top: 0.75rem; }

    /* SPINNER */
    @keyframes spin { to { transform: rotate(360deg); } }
    .tn-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.2);
      border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; }

    /* TAG */
    .tn-tag { display: inline-block; background: rgba(245,166,35,0.1);
      color: #f5a623; border: 1px solid rgba(245,166,35,0.25);
      font-size: 0.72rem; padding: 2px 8px; border-radius: 20px;
      font-weight: 500; }

    /* SECTION DIVIDER */
    .tn-divider { border: none; border-top: 1px solid #12121e; margin: 0; }

    /* FORMAT PILLS */
    .tn-format-pills { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.5rem; }
    .tn-format-pill { background: #1a1a2e; border: 1px solid #2a2840;
      border-radius: 6px; padding: 0.25rem 0.65rem; font-size: 0.75rem;
      color: #6b6890; }

    /* MOBILE */
    @media (max-width: 640px) {
      .tn-viewer-cols, .tn-cols { grid-template-columns: 1fr; }
      .tn-sub-row { grid-template-columns: 60px 1fr; }
      .tn-sub-orig { display: none; }
    }
  `;
  document.head.appendChild(style);
};

// ─── HELPERS ───────────────────────────────────────────────────────────────
function formatBytes(b) {
  return b < 1024 ? b + " B" : b < 1048576 ? (b / 1024).toFixed(1) + " KB" : (b / 1048576).toFixed(2) + " MB";
}
function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
function langVoice(code) {
  return code === "Nepali" ? "ne-NP" : code === "Tamang" ? "ne-NP" : "en-US";
}

// ─── TOAST ─────────────────────────────────────────────────────────────────
function Toast({ message, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return <div className="tn-toast">{message}</div>;
}

// ─── WAVE ──────────────────────────────────────────────────────────────────
function WaveIcon() {
  return <div className="tn-wave">{[1, 2, 3, 4].map(i => <span key={i} />)}</div>;
}

// ─── LANGUAGE BAR ──────────────────────────────────────────────────────────
function LangBar({ src, tgt, onChange, onSwap, showSwap = true }) {
  return (
    <div className="tn-lang-bar">
      {LANGUAGES.map(l => (
        <button
          key={l.code}
          className={`tn-lang-btn${src === l.code ? " selected" : ""}`}
          onClick={() => onChange("src", l.code)}
        >
          <span className="flag">{l.flag}</span>
          <span className="label">{l.short}</span>
        </button>
      ))}
      {showSwap && (
        <button className="tn-swap-btn" onClick={onSwap} title="Swap languages">⇄</button>
      )}
      {LANGUAGES.map(l => (
        <button
          key={l.code + "_tgt"}
          className={`tn-lang-btn${tgt === l.code ? " selected" : ""}`}
          onClick={() => onChange("tgt", l.code)}
        >
          <span className="flag">{l.flag}</span>
          <span className="label">{l.short}</span>
        </button>
      ))}
    </div>
  );
}

// ─── SECTION: QUICK TEXT TRANSLATE ─────────────────────────────────────────
function QuickTranslate() {
  const [srcLang, setSrcLang] = useState("English");
  const [tgtLang, setTgtLang] = useState("Nepali");
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const synthRef = useRef(window.speechSynthesis);

  const handleLangChange = (side, val) => {
    if (side === "src") {
      if (val === tgtLang) setTgtLang(srcLang);
      setSrcLang(val);
    } else {
      if (val === srcLang) setSrcLang(tgtLang);
      setTgtLang(val);
    }
    setResult("");
  };

  const handleSwap = () => {
    setSrcLang(tgtLang);
    setTgtLang(srcLang);
    setInputText(result);
    setResult("");
  };

  const handleTranslate = async () => {
    if (!inputText.trim() || srcLang === tgtLang) return;
    setLoading(true); setError(""); setResult("");
    try {
      const res = await fetch(`${API_BASE}/translate-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText.trim(), src_lang: srcLang, tgt_lang: tgtLang }),
      });
      const data = await res.json();
      if (data.output) setResult(data.output);
      else setError(data.detail || "Translation failed.");
    } catch {
      setError("Could not reach the translation server.");
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = (text, lang) => {
    if (!text) return;
    if (playing) { synthRef.current.cancel(); setPlaying(false); return; }
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = langVoice(lang);
    utt.rate = lang === "Nepali" ? 0.85 : 1.0;
    utt.onend = () => setPlaying(false);
    utt.onerror = () => setPlaying(false);
    setPlaying(true);
    synthRef.current.speak(utt);
  };

  const chars = inputText.length;
  const overLimit = chars > MAX_CHARS;

  return (
    <section className="tn-section">
      <h2 className="tn-section-title">Quick Translate</h2>
      <p className="tn-section-sub">Instant text translation between English, Nepali, and Tamang.</p>
      <div className="tn-card">
        <LangBar src={srcLang} tgt={tgtLang} onChange={handleLangChange} onSwap={handleSwap} />

        <div className="tn-cols">
          <div>
            <div className="tn-col-label">
              {LANGUAGES.find(l => l.code === srcLang)?.flag} {srcLang}
            </div>
            <div className="tn-textarea-wrap">
              <textarea
                className="tn-textarea"
                rows={4}
                placeholder="Type or paste text here…"
                value={inputText}
                onChange={e => setInputText(e.target.value.slice(0, MAX_CHARS + 20))}
              />
              <span className={`tn-char-count${overLimit ? " warn" : ""}`}>
                {chars}/{MAX_CHARS}
              </span>
            </div>
            <div className="tn-actions">
              <button
                className="tn-btn tn-btn-ghost tn-btn-sm"
                onClick={() => handlePlay(inputText, srcLang)}
                disabled={!inputText}
                title="Listen to source"
              >
                🔊 Listen
              </button>
            </div>
          </div>

          <div>
            <div className="tn-col-label">
              {LANGUAGES.find(l => l.code === tgtLang)?.flag} {tgtLang}
            </div>
            <div className="tn-result-box">
              {result
                ? result
                : <span className="placeholder">Translation will appear here…</span>
              }
            </div>
            <div className="tn-actions">
              <button
                className={`tn-btn tn-btn-ghost tn-btn-sm${playing ? " playing" : ""}`}
                onClick={() => handlePlay(result, tgtLang)}
                disabled={!result}
                title="Listen to translation"
              >
                {playing ? <WaveIcon /> : "🔊 Play"}
              </button>
              {result && (
                <button
                  className="tn-btn tn-btn-ghost tn-btn-sm"
                  onClick={() => { navigator.clipboard.writeText(result); }}
                >
                  📋 Copy
                </button>
              )}
            </div>
          </div>
        </div>

        {error && <div className="tn-error">⚠ {error}</div>}

        <div className="tn-actions" style={{ marginTop: "1.25rem", justifyContent: "flex-end" }}>
          {srcLang === tgtLang && (
            <span style={{ fontSize: "0.78rem", color: "#4a4870" }}>
              Source and target must differ
            </span>
          )}
          <button
            className="tn-btn tn-btn-primary"
            onClick={handleTranslate}
            disabled={loading || !inputText.trim() || overLimit || srcLang === tgtLang}
          >
            {loading ? <><span className="tn-spinner" /> Translating…</> : "Translate →"}
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── SECTION: FILE TRANSLATE ────────────────────────────────────────────────
function FileTranslate() {
  const [srcLang, setSrcLang] = useState("English");
  const [tgtLang, setTgtLang] = useState("Nepali");
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(null); // {current, total, pct}
  const [output, setOutput] = useState(null);   // {url, filename, paragraphs, translated}
  const [glossary, setGlossary] = useState([]);
  const [glossOpen, setGlossOpen] = useState(true);
  const [error, setError] = useState("");
  const [highlightIdx, setHighlightIdx] = useState(null);
  const esRef = useRef(null);
  const dropRef = useRef();

  const acceptFile = (f) => {
    if (!f) return;
    if (f.size > 1048576) { setError("File exceeds 1 MB limit."); return; }
    if (!ACCEPTED_FORMATS[f.type] && !f.name.match(/\.(pdf|docx|csv|tsv)$/i)) {
      setError("Unsupported format. Use PDF, DOCX, CSV, or TSV."); return;
    }
    setError(""); setFile(f); setOutput(null); setProgress(null);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    acceptFile(e.dataTransfer.files[0]);
  };

  const handleTranslate = async () => {
    if (!file || srcLang === tgtLang) return;
    setError(""); setOutput(null); setProgress({ current: 0, total: 0, pct: 0 });

    const form = new FormData();
    form.append("file", file);
    form.append("src_lang", srcLang);
    form.append("tgt_lang", tgtLang);

    // SSE progress stream
    const uploadRes = await fetch(`${API_BASE}/translate-file`, { method: "POST", body: form });
    if (!uploadRes.ok) { setError("Upload failed."); setProgress(null); return; }

    const jobData = await uploadRes.json();
    const jobId = jobData.job_id;

    esRef.current = new EventSource(`${API_BASE}/progress/${jobId}`);
    esRef.current.onmessage = (e) => {
      const d = JSON.parse(e.data);
      if (d.done) {
        esRef.current.close();
        setProgress(null);
        setOutput(d.result);
        if (d.result.glossary) setGlossary(d.result.glossary);
      } else {
        const pct = d.total ? Math.round((d.current / d.total) * 100) : 0;
        setProgress({ current: d.current, total: d.total, pct });
      }
    };
    esRef.current.onerror = () => {
      esRef.current.close();
      setError("Progress stream disconnected. Check server.");
      setProgress(null);
    };
  };

  const handleLangChange = (side, val) => {
    if (side === "src") { if (val === tgtLang) setTgtLang(srcLang); setSrcLang(val); }
    else { if (val === srcLang) setSrcLang(tgtLang); setTgtLang(val); }
    setOutput(null);
  };

  return (
    <section className="tn-section">
      <h2 className="tn-section-title">Document Translation</h2>
      <p className="tn-section-sub">
        PDF · DOCX · CSV — layout preserved. Formulas, dates, and numbers untouched.
      </p>
      <div className="tn-card">
        <LangBar src={srcLang} tgt={tgtLang} onChange={handleLangChange}
          onSwap={() => { setSrcLang(tgtLang); setTgtLang(srcLang); setOutput(null); }} />

        {!file ? (
          <div
            ref={dropRef}
            className={`tn-drop-zone${dragging ? " dragging" : ""}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input
              type="file"
              className="tn-file-input"
              accept=".pdf,.docx,.csv,.tsv"
              onChange={e => acceptFile(e.target.files[0])}
            />
            <div className="tn-drop-icon">📄</div>
            <div className="tn-drop-text"><strong>Drop your file here</strong> or click to browse</div>
            <div className="tn-drop-hint">PDF · DOCX · CSV · TSV — max 1 MB</div>
          </div>
        ) : (
          <div className="tn-file-chip">
            <span style={{ fontSize: "1.2rem" }}>
              {file.name.endsWith(".pdf") ? "📕" : file.name.endsWith(".docx") ? "📘" : "📊"}
            </span>
            <span className="name">{file.name}</span>
            <span className="size">{formatBytes(file.size)}</span>
            <button className="remove" onClick={() => { setFile(null); setOutput(null); setProgress(null); }}>✕</button>
          </div>
        )}

        {error && <div className="tn-error">⚠ {error}</div>}

        {progress !== null && (
          <div className="tn-progress-wrap">
            <div className="tn-progress-label">
              <span><span className="tn-dot" />Translating…</span>
              <span>{progress.current} / {progress.total} sentences ({progress.pct}%)</span>
            </div>
            <div className="tn-progress-bar">
              <div className="tn-progress-fill" style={{ width: progress.pct + "%" }} />
            </div>
          </div>
        )}

        <div className="tn-actions" style={{ marginTop: "1.25rem", justifyContent: "flex-end" }}>
          <button
            className="tn-btn tn-btn-primary"
            onClick={handleTranslate}
            disabled={!file || srcLang === tgtLang || progress !== null}
          >
            {progress !== null
              ? <><span className="tn-spinner" /> Processing…</>
              : "Translate Document →"}
          </button>
        </div>

        {output && (
          <div className="tn-viewer">
            <div className="tn-viewer-header">
              <span style={{ fontWeight: 500, fontSize: "0.9rem" }}>
                Output — {output.filename}
              </span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {output.downloadUrl && (
                  <a href={`${API_BASE}${output.downloadUrl}`} download>
                    <button className="tn-btn tn-btn-ghost tn-btn-sm">⬇ Download</button>
                  </a>
                )}
              </div>
            </div>

            {output.paragraphs && (
              <div className="tn-viewer-cols">
                <div>
                  <div className="tn-col-label">Original</div>
                  <div className="tn-viewer-pane">
                    {output.paragraphs.map((p, i) => (
                      <p key={i}
                        className={highlightIdx === i ? "highlight" : ""}
                        onClick={() => setHighlightIdx(i === highlightIdx ? null : i)}
                      >{p}</p>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="tn-col-label">Translated</div>
                  <div className="tn-viewer-pane">
                    {output.translated.map((p, i) => (
                      <p key={i}
                        className={highlightIdx === i ? "highlight" : ""}
                        onClick={() => setHighlightIdx(i === highlightIdx ? null : i)}
                      >{p}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {glossary.length > 0 && (
              <div className="tn-glossary">
                <div className="tn-glossary-header" onClick={() => setGlossOpen(o => !o)}>
                  <span>🔖 Term Glossary ({glossary.length} terms detected)</span>
                  <span style={{ fontSize: "0.8rem" }}>{glossOpen ? "▲" : "▼"}</span>
                </div>
                {glossOpen && glossary.map((g, i) => (
                  <div key={i} className="tn-glossary-row">
                    <span className="tn-glossary-orig">{g.original}</span>
                    <span className="tn-glossary-arrow">→</span>
                    <span className="tn-glossary-trans">{g.translated}
                      <span className="tn-glossary-count" style={{ marginLeft: 6 }}>×{g.count}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── SECTION: IMAGE / OCR ───────────────────────────────────────────────────
function ImageTranslate() {
  const [srcLang, setSrcLang] = useState("English");
  const [tgtLang, setTgtLang] = useState("Nepali");
  const [imgFile, setImgFile] = useState(null);
  const [imgUrl, setImgUrl] = useState(null);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [startPt, setStartPt] = useState(null);
  const [selBox, setSelBox] = useState(null);
  const [error, setError] = useState("");
  const canvasRef = useRef();
  const imgRef = useRef();

  const handleImgSelect = (f) => {
    if (!f) return;
    setImgFile(f); setImgUrl(URL.createObjectURL(f));
    setRegions([]); setSelBox(null); setError("");
  };

  // Full auto-OCR on entire image
  const handleFullOCR = async () => {
    if (!imgFile) return;
    setLoading(true); setError("");
    const form = new FormData();
    form.append("image", imgFile);
    form.append("src_lang", srcLang);
    form.append("tgt_lang", tgtLang);
    try {
      const res = await fetch(`${API_BASE}/ocr-translate`, { method: "POST", body: form });
      const data = await res.json();
      if (data.regions) setRegions(data.regions);
      else setError(data.detail || "OCR failed.");
    } catch { setError("Could not reach OCR service."); }
    setLoading(false);
  };

  // Canvas pen-tool for region selection
  const getCanvasCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleCanvasMouseDown = (e) => {
    setDrawing(true);
    setStartPt(getCanvasCoords(e));
    setSelBox(null);
  };
  const handleCanvasMouseMove = (e) => {
    if (!drawing || !startPt) return;
    const cur = getCanvasCoords(e);
    setSelBox({
      x: Math.min(startPt.x, cur.x), y: Math.min(startPt.y, cur.y),
      w: Math.abs(cur.x - startPt.x), h: Math.abs(cur.y - startPt.y)
    });
  };
  const handleCanvasMouseUp = async () => {
    setDrawing(false);
    if (!selBox || selBox.w < 10 || selBox.h < 10 || !imgFile) return;
    // Send cropped region to backend
    const form = new FormData();
    form.append("image", imgFile);
    form.append("bbox", JSON.stringify(selBox));
    form.append("src_lang", srcLang);
    form.append("tgt_lang", tgtLang);
    try {
      const res = await fetch(`${API_BASE}/ocr-region`, { method: "POST", body: form });
      const data = await res.json();
      if (data.translated) setRegions(r => [...r, { ...selBox, ...data }]);
    } catch { /* silent */ }
  };

  return (
    <section className="tn-section">
      <h2 className="tn-section-title">Image & OCR Translation</h2>
      <p className="tn-section-sub">
        Auto-detect text in images via PaddleOCR, or use the pen tool to select regions manually.
      </p>
      <div className="tn-card">
        <LangBar src={srcLang} tgt={tgtLang}
          onChange={(s, v) => { if (s === "src") setSrcLang(v); else setTgtLang(v); }}
          onSwap={() => { setSrcLang(tgtLang); setTgtLang(srcLang); setRegions([]); }} />

        {!imgUrl ? (
          <div className="tn-drop-zone" style={{ cursor: "pointer" }}>
            <input type="file" className="tn-file-input" accept="image/*"
              onChange={e => handleImgSelect(e.target.files[0])} />
            <div className="tn-drop-icon">🖼️</div>
            <div className="tn-drop-text"><strong>Drop an image</strong> or click to browse</div>
            <div className="tn-drop-hint">JPG · PNG · WEBP — max 1 MB</div>
          </div>
        ) : (
          <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
            <img ref={imgRef} src={imgUrl} alt="uploaded"
              style={{ width: "100%", borderRadius: 10, display: "block", userSelect: "none" }} />
            {/* Selection canvas overlay */}
            <canvas ref={canvasRef}
              style={{
                position: "absolute", inset: 0, width: "100%", height: "100%",
                cursor: "crosshair", borderRadius: 10
              }}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
            />
            {/* Draw selection box */}
            {selBox && (
              <div style={{
                position: "absolute", border: "2px solid #f5a623",
                background: "rgba(245,166,35,0.08)", pointerEvents: "none", borderRadius: 4,
                left: selBox.x, top: selBox.y, width: selBox.w, height: selBox.h
              }} />
            )}
            {/* Overlay translated regions */}
            {regions.map((r, i) => (
              <div key={i} style={{
                position: "absolute", left: r.x, top: r.y + r.h + 4,
                background: "rgba(13,13,26,0.92)", border: "1px solid #f5a623",
                borderRadius: 6, padding: "3px 8px", fontSize: "0.78rem", color: "#f5a623",
                pointerEvents: "none", maxWidth: r.w || 200, lineHeight: 1.4
              }}>
                {r.translated}
              </div>
            ))}
          </div>
        )}

        {error && <div className="tn-error">⚠ {error}</div>}

        {imgUrl && (
          <div className="tn-actions" style={{ marginTop: "1rem", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="tn-btn tn-btn-ghost tn-btn-sm"
                onClick={() => { setImgUrl(null); setImgFile(null); setRegions([]); }}>
                ✕ Clear
              </button>
              <span style={{ fontSize: "0.78rem", color: "#4a4870", alignSelf: "center" }}>
                Drag on image to translate a region
              </span>
            </div>
            <button className="tn-btn tn-btn-primary"
              onClick={handleFullOCR} disabled={loading}>
              {loading ? <><span className="tn-spinner" /> Scanning…</> : "🔍 Auto-scan All Text"}
            </button>
          </div>
        )}

        {regions.length > 0 && (
          <div style={{ marginTop: "1.25rem" }}>
            <div className="tn-col-label">Detected Regions</div>
            {regions.map((r, i) => (
              <div key={i} className="tn-glossary-row">
                <span className="tn-glossary-orig">{r.original || r.text}</span>
                <span className="tn-glossary-arrow">→</span>
                <span className="tn-glossary-trans">{r.translated}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── SECTION: YOUTUBE ───────────────────────────────────────────────────────
function YouTubeTranslate() {
  const [url, setUrl] = useState("");
  const [srcLang, setSrcLang] = useState("English");
  const [tgtLang, setTgtLang] = useState("Nepali");
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const synthRef = useRef(window.speechSynthesis);

  const isValidYT = (u) => /youtube\.com\/watch|youtu\.be\//.test(u);

  const handleFetch = async () => {
    if (!isValidYT(url)) { setError("Enter a valid YouTube URL."); return; }
    setLoading(true); setError(""); setSubs([]);
    try {
      const res = await fetch(`${API_BASE}/youtube-translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, src_lang: srcLang, tgt_lang: tgtLang }),
      });
      const data = await res.json();
      if (data.subtitles) setSubs(data.subtitles);
      else setError(data.detail || "Could not fetch subtitles.");
    } catch { setError("Server error. Is the backend running?"); }
    setLoading(false);
  };

  const handleDownloadSRT = () => {
    const lines = subs.map((s, i) =>
      `${i + 1}\n${formatTime(s.start)} --> ${formatTime(s.start + s.duration)}\n${s.translated}\n`
    ).join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "translated.srt" });
    a.click();
  };

  const handlePlayAll = () => {
    if (playing) { synthRef.current.cancel(); setPlaying(false); return; }
    const text = subs.map(s => s.translated).join(" ");
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = langVoice(tgtLang);
    utt.rate = 0.9;
    utt.onend = () => setPlaying(false);
    setPlaying(true);
    synthRef.current.speak(utt);
  };

  return (
    <section className="tn-section">
      <h2 className="tn-section-title">YouTube Subtitles</h2>
      <p className="tn-section-sub">Paste a YouTube link to fetch and translate its subtitle track.</p>
      <div className="tn-card">
        <LangBar src={srcLang} tgt={tgtLang}
          onChange={(s, v) => { if (s === "src") setSrcLang(v); else setTgtLang(v); }}
          onSwap={() => { setSrcLang(tgtLang); setTgtLang(srcLang); setSubs([]); }} />

        <div className="tn-url-row">
          <input className="tn-input" type="url" placeholder="https://youtube.com/watch?v=…"
            value={url} onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleFetch()} />
          <button className="tn-btn tn-btn-primary"
            onClick={handleFetch} disabled={loading || !url}>
            {loading ? <><span className="tn-spinner" /> Fetching…</> : "Fetch →"}
          </button>
        </div>

        {error && <div className="tn-error">⚠ {error}</div>}

        {subs.length > 0 && (
          <>
            <div className="tn-actions" style={{ marginTop: "1rem" }}>
              <span className="tn-tag">{subs.length} segments</span>
              <button className="tn-btn tn-btn-ghost tn-btn-sm" onClick={handleDownloadSRT}>
                ⬇ Download .srt
              </button>
              <button className={`tn-btn tn-btn-ghost tn-btn-sm${playing ? " playing" : ""}`}
                onClick={handlePlayAll}>
                {playing ? <WaveIcon /> : "🔊 Play All"}
              </button>
            </div>

            <div className="tn-subs-list">
              <div className="tn-sub-row" style={{ borderBottom: "1px solid #1a1a2e" }}>
                <span className="tn-col-label" style={{ margin: 0 }}>Time</span>
                <span className="tn-col-label" style={{ margin: 0 }}>Original</span>
                <span className="tn-col-label" style={{ margin: 0 }}>Translated</span>
              </div>
              {subs.map((s, i) => (
                <div key={i} className="tn-sub-row">
                  <span className="tn-sub-time">{formatTime(s.start)}</span>
                  <span className="tn-sub-orig">{s.text}</span>
                  <span className="tn-sub-trans">{s.translated}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

// ─── NAV ───────────────────────────────────────────────────────────────────
const TABS = [
  { id: "text", label: "Text" },
  { id: "file", label: "Files", badge: "PDF·DOCX·CSV" },
  { id: "image", label: "Images", badge: "OCR" },
  { id: "youtube", label: "YouTube", badge: "SRT" },
];

// ─── ROOT APP ──────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("text");
  const [toast, setToast] = useState(null);

  useEffect(() => { injectStyles(); }, []);

  return (
    <div className="tn-app">
      {/* NAV */}
      <nav className="tn-nav">
        <span className="tn-logo">TamangNetra</span>
        <div className="tn-nav-links">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tn-nav-tab${tab === t.id ? " active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.badge && <span className="tn-badge">{t.badge}</span>}
            </button>
          ))}
        </div>
      </nav>

      <hr className="tn-divider" />

      {/* SECTIONS */}
      {tab === "text" && <QuickTranslate />}
      {tab === "file" && <FileTranslate />}
      {tab === "image" && <ImageTranslate />}
      {tab === "youtube" && <YouTubeTranslate />}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}