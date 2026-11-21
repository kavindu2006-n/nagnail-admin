import { useRef, useEffect } from "react";

export default function RichEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const isComposing = useRef(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const exec = (cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    onChange(editorRef.current?.innerHTML || "");
  };

  const handleInput = () => {
    if (!isComposing.current) onChange(editorRef.current?.innerHTML || "");
  };

  const tools = [
    { label: "B", cmd: "bold", style: "font-bold" },
    { label: "I", cmd: "italic", style: "italic" },
    { label: "U", cmd: "underline", style: "underline" },
    { label: "H1", cmd: "formatBlock", val: "H1" },
    { label: "H2", cmd: "formatBlock", val: "H2" },
    { label: "• List", cmd: "insertUnorderedList" },
    { label: "1. List", cmd: "insertOrderedList" },
    { label: "Link", cmd: "createLink", prompt: true },
    { label: "Clear", cmd: "removeFormat" },
  ];

  return (
    <div className="border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-[#16a34a] transition-colors">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 bg-gray-50 border-b border-gray-200">
        {tools.map(t => (
          <button key={t.cmd + t.label} type="button"
            onMouseDown={e => {
              e.preventDefault();
              if (t.prompt) {
                const url = prompt("Enter URL:");
                if (url) exec(t.cmd, url);
              } else {
                exec(t.cmd, t.val || null);
              }
            }}
            className={`px-2 py-1 text-xs rounded-lg border border-gray-200 bg-white hover:bg-green-50 hover:border-[#16a34a] hover:text-[#16a34a] transition-all ${t.style || ""}`}>
            {t.label}
          </button>
        ))}
        <select onMouseDown={e => e.stopPropagation()} onChange={e => exec("fontSize", e.target.value)}
          className="px-2 py-1 text-xs rounded-lg border border-gray-200 bg-white outline-none">
          <option value="">Size</option>
          {[1,2,3,4,5,6,7].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onCompositionStart={() => { isComposing.current = true; }}
        onCompositionEnd={() => { isComposing.current = false; handleInput(); }}
        className="min-h-48 max-h-96 overflow-y-auto p-3 text-sm text-gray-700 outline-none"
        style={{lineHeight: "1.6"}}
      />
    </div>
  );
}
