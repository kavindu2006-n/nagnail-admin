import { useRef, useEffect, useState } from "react";

const BTN = "px-2 py-1 rounded text-xs font-bold border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 transition active:scale-95";

export default function RichTextEditor({ value, onChange, placeholder = "Write product description..." }) {
  const ref = useRef(null);
  const [showHtml, setShowHtml] = useState(false);

  // Load value into editor only when it differs (prevents caret jumping)
  useEffect(() => {
    if (ref.current && !showHtml && ref.current.innerHTML !== (value || "")) {
      ref.current.innerHTML = value || "";
    }
  }, [value, showHtml]);

  const fire = () => {
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const cmd = (command, arg = null) => {
    if (ref.current) ref.current.focus();
    document.execCommand("styleWithCSS", false, true);
    document.execCommand(command, false, arg);
    fire();
  };

  const block = (tag) => {
    if (ref.current) ref.current.focus();
    document.execCommand("formatBlock", false, tag);
    fire();
  };

  const insertHtml = (html) => {
    if (ref.current) ref.current.focus();
    document.execCommand("insertHTML", false, html);
    fire();
  };

  const clearAll = () => {
    if (!confirm("Clear all formatting from the description?")) return;
    if (ref.current) {
      const text = ref.current.innerText;
      ref.current.innerHTML = "<p>" + text.replace(/\n/g, "</p><p>") + "</p>";
      fire();
    }
  };

  const onPaste = (e) => {
    // Paste as plain text so Word/Docs junk styling never enters
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text/plain");
    document.execCommand("insertText", false, text);
    fire();
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border-b border-slate-200">
        <select
          onChange={(e) => { block(e.target.value); e.target.value = ""; }}
          defaultValue=""
          className="text-xs border border-slate-200 rounded px-1.5 py-1 bg-white font-bold text-slate-700"
          title="Text style"
        >
          <option value="" disabled>Style</option>
          <option value="H2">Heading (Large)</option>
          <option value="H3">Sub Heading</option>
          <option value="H4">Small Heading</option>
          <option value="P">Normal Text</option>
        </select>

        <select
          onChange={(e) => { cmd("fontSize", e.target.value); e.target.value = ""; }}
          defaultValue=""
          className="text-xs border border-slate-200 rounded px-1.5 py-1 bg-white font-bold text-slate-700"
          title="Font size"
        >
          <option value="" disabled>Size</option>
          <option value="1">Tiny</option>
          <option value="2">Small</option>
          <option value="3">Normal</option>
          <option value="4">Medium</option>
          <option value="5">Large</option>
          <option value="6">X-Large</option>
        </select>

        <span className="w-px h-5 bg-slate-300 mx-1" />

        <button type="button" onClick={() => cmd("bold")} className={BTN} title="Bold"><b>B</b></button>
        <button type="button" onClick={() => cmd("italic")} className={BTN} title="Italic"><i>I</i></button>
        <button type="button" onClick={() => cmd("underline")} className={BTN} title="Underline"><u>U</u></button>

        <span className="w-px h-5 bg-slate-300 mx-1" />

        <button type="button" onClick={() => cmd("insertUnorderedList")} className={BTN} title="Bullet list">• List</button>
        <button type="button" onClick={() => cmd("insertOrderedList")} className={BTN} title="Numbered list">1. List</button>

        <span className="w-px h-5 bg-slate-300 mx-1" />

        <button type="button" onClick={() => cmd("justifyLeft")} className={BTN} title="Align left">⬅</button>
        <button type="button" onClick={() => cmd("justifyCenter")} className={BTN} title="Align center">↔</button>
        <button type="button" onClick={() => cmd("justifyRight")} className={BTN} title="Align right">➡</button>

        <span className="w-px h-5 bg-slate-300 mx-1" />

        <input
          type="color"
          onChange={(e) => cmd("foreColor", e.target.value)}
          className="w-7 h-7 rounded border border-slate-200 cursor-pointer bg-white p-0.5"
          title="Text color"
        />

        <button type="button" onClick={() => insertHtml('<hr style="border:none;border-top:1px solid #e2e8f0;margin:14px 0" />')} className={BTN} title="Divider line">— HR</button>
        <button type="button" onClick={() => insertHtml('<p style="height:8px">&nbsp;</p>')} className={BTN} title="Add spacing">␣ Space</button>

        <span className="w-px h-5 bg-slate-300 mx-1" />

        <button type="button" onClick={() => cmd("removeFormat")} className={BTN} title="Remove formatting">✕ Format</button>
        <button type="button" onClick={clearAll} className={BTN + " text-rose-600"} title="Reset to plain paragraphs">↺ Reset</button>

        <button
          type="button"
          onClick={() => setShowHtml(!showHtml)}
          className={BTN + (showHtml ? " bg-indigo-600 text-white border-indigo-600" : "")}
          title="Toggle HTML source"
        >
          &lt;/&gt; HTML
        </button>
      </div>

      {/* ── Editor Body ── */}
      {showHtml ? (
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          rows={12}
          spellCheck={false}
          className="w-full p-3 text-xs font-mono bg-slate-900 text-emerald-300 outline-none resize-y"
        />
      ) : (
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={fire}
          onBlur={fire}
          onPaste={onPaste}
          data-placeholder={placeholder}
          className="rte-body min-h-[220px] max-h-[460px] overflow-y-auto p-4 text-sm text-slate-800 outline-none leading-relaxed"
        />
      )}

      <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 font-semibold">
        Tip: Paste is auto-cleaned to plain text. Use <b>Style</b> for headings and <b>• List</b> for feature bullets.
      </div>

      <style>{`
        .rte-body:empty:before { content: attr(data-placeholder); color: #94a3b8; }
        .rte-body h2 { font-size: 1.25rem; font-weight: 800; margin: 14px 0 8px; color: #0f172a; }
        .rte-body h3 { font-size: 1.05rem; font-weight: 700; margin: 12px 0 6px; color: #1e293b; }
        .rte-body h4 { font-size: 0.95rem; font-weight: 700; margin: 10px 0 5px; color: #334155; }
        .rte-body p  { margin: 0 0 9px; }
        .rte-body ul { list-style: disc;    padding-left: 22px; margin: 8px 0; }
        .rte-body ol { list-style: decimal; padding-left: 22px; margin: 8px 0; }
        .rte-body li { margin: 4px 0; }
        .rte-body a  { color: #4f46e5; text-decoration: underline; }
        .rte-body hr { border: none; border-top: 1px solid #e2e8f0; margin: 14px 0; }
      `}</style>
    </div>
  );
}
