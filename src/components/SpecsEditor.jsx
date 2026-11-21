import { useState } from "react";
import { TEMPLATES, parsePaste } from "./specsLib";
// NN-SPECS admin editor
export default function SpecsEditor({ value, onChange }) {
  const v = value || { items: [], package: "" };
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState("");
  const set = (items) => onChange({ ...v, items });
  const upd = (i, f, val) => { const n = [...v.items]; n[i] = { ...n[i], [f]: val }; set(n); };
  const move = (i, d) => { const n = [...v.items]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; set(n); };
  const applyTpl = (name) => {
    if (!name) return;
    const have = new Set(v.items.map(r => r.k.toLowerCase()));
    set([...v.items, ...TEMPLATES[name].filter(k => !have.has(k.toLowerCase())).map(k => ({ k, v: "" }))]);
  };
  const doParse = () => {
    const rows = parsePaste(paste);
    if (!rows.length) return setMsg("Nothing found. Paste lines like 'Resolution: 1080P' or key and value on separate lines.");
    const n = [...v.items];
    rows.forEach(r => { const ix = n.findIndex(x => x.k.toLowerCase() === r.k.toLowerCase()); if (ix >= 0) { if (!n[ix].v) n[ix] = { ...n[ix], v: r.v }; } else n.push(r); });
    set(n); setPaste(""); setMsg(`${rows.length} spec(s) added. Prices / supplier details removed automatically - please double check.`);
  };
  const inp = "w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-bold text-slate-600 uppercase">Template:</span>
        {Object.keys(TEMPLATES).map(t => (
          <button type="button" key={t} onClick={() => applyTpl(t)} className="px-3 py-1 rounded-full border border-indigo-200 text-indigo-700 text-xs font-bold hover:bg-indigo-50">+ {t}</button>
        ))}
      </div>
      <div className="space-y-2">
        {v.items.length === 0 && <div className="p-6 text-center text-slate-400 text-sm border border-dashed rounded-xl">No specs yet. Pick a template or paste from supplier below.</div>}
        {v.items.map((r, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input className={inp + " w-2/5 font-semibold"} value={r.k} placeholder="Spec name" onChange={e => upd(i, "k", e.target.value)} />
            <input className={inp} value={r.v} placeholder="Value (leave empty to hide)" onChange={e => upd(i, "v", e.target.value)} />
            <button type="button" onClick={() => move(i, -1)} className="text-slate-400 hover:text-slate-700 px-1">↑</button>
            <button type="button" onClick={() => move(i, 1)} className="text-slate-400 hover:text-slate-700 px-1">↓</button>
            <button type="button" onClick={() => set(v.items.filter((_, x) => x !== i))} className="text-rose-400 hover:text-rose-600 px-1">✕</button>
          </div>
        ))}
        <button type="button" onClick={() => set([...v.items, { k: "", v: "" }])} className="text-xs font-bold text-indigo-600">+ Add row</button>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Package contents (what's in the box)</label>
        <input className={inp} value={v.package || ""} placeholder="1 x Camera, 1 x USB cable, 1 x Manual" onChange={e => onChange({ ...v, package: e.target.value })} />
      </div>
      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
        <label className="block text-xs font-bold text-amber-800 uppercase">Paste from supplier (Alibaba "Product attributes")</label>
        <textarea rows="5" className={inp} value={paste} onChange={e => setPaste(e.target.value)} placeholder={"Resolution: 1080P\nNight Vision\nYes, 5m\n..."} />
        <button type="button" onClick={doParse} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold">Extract specs</button>
        {msg && <div className="text-xs text-amber-800">{msg}</div>}
      </div>
      <p className="text-[11px] text-slate-400">Empty values are hidden from customers and dropshippers. Specs are saved when you click Save Product.</p>
    </div>
  );
}
