import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import API from "../api/config";
import { PackageCheck, Plus, Boxes, Coins, AlertTriangle, CheckCircle2, Pencil, Archive, RotateCcw, Search, RefreshCw, X } from "lucide-react";

const EMPTY = { name: "", stock_qty: "", unit_cost: "" };
const money = (n) => `LKR ${Number(n || 0).toLocaleString("en-LK", {minimumFractionDigits:2, maximumFractionDigits:2})}`;
const clean = (s) => String(s || "").trim().replace(/\s+/g, " ");
const apiError = (e) => e?.response?.data?.error || e?.response?.data?.message || "Request failed. Please try again.";
const goodQty = (s, allowZero = false) => /^\d+$/.test(String(s)) && Number.isSafeInteger(Number(s)) && (allowZero ? Number(s) >= 0 : Number(s) > 0);
const goodCost = (s) => /^(?:\d+)(?:\.\d{1,2})?$/.test(String(s)) && Number.isFinite(Number(s)) && Number(s) >= 0 && Number(s) <= 99999999.99;

export default function Packaging() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editor, setEditor] = useState(null); // { mode, item, form }
  const [restock, setRestock] = useState(null); // { item, qty }
  const [archiveItem, setArchiveItem] = useState(null);
  const [archiveText, setArchiveText] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const res = await API.get("/erp/packaging");
      if (!res.data?.success || !Array.isArray(res.data.packaging)) throw new Error("Unexpected response");
      setItems(res.data.packaging);
    } catch (e) { setError(apiError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const active = useMemo(() => items.filter(i => !Number(i.is_archived)), [items]);
  const archived = useMemo(() => items.filter(i => Number(i.is_archived)), [items]);
  const listed = useMemo(() => (showArchived ? archived : active).filter(i => clean(i.name).toLowerCase().includes(clean(search).toLowerCase())), [active, archived, search, showArchived]);
  const totalUnits = active.reduce((s, i) => s + Number(i.stock_qty || 0), 0);
  const totalValue = active.reduce((s, i) => s + Number(i.stock_qty || 0) * Number(i.unit_cost || 0), 0);
  const duplicate = editor && items.some(i => clean(i.name).toLocaleLowerCase() === clean(editor.form.name).toLocaleLowerCase() && String(i.id) !== String(editor.item?.id));

  const save = async (e) => {
    e.preventDefault();
    if (busy || !editor) return;
    const { mode, item, form } = editor;
    if (!clean(form.name) || clean(form.name).length > 100) return setError("Material name must be 1–100 characters.");
    if (!goodCost(form.unit_cost)) return setError("Enter a valid unit cost, max 2 decimal places.");
    if (mode === "add" && !goodQty(form.stock_qty, true)) return setError("Initial stock must be a whole number (zero or above).");
    if (duplicate) return setError("A material with this name already exists (including archived materials).");
    setBusy(true); setError("");
    try {
      if (mode === "add") await API.post("/erp/packaging", { name: clean(form.name), stock_qty: Number(form.stock_qty), unit_cost: Number(form.unit_cost) });
      else await API.put(`/erp/packaging/${item.id}`, { name: clean(form.name), unit_cost: Number(form.unit_cost) });
      setEditor(null); await load();
    } catch (err) { setError(apiError(err)); }
    finally { setBusy(false); }
  };
  const addStock = async (e) => {
    e.preventDefault();
    if (busy || !restock) return;
    if (!goodQty(restock.qty)) return setError("Restock must be a positive whole number.");
    setBusy(true); setError("");
    try {
      await API.put(`/erp/packaging/${restock.item.id}/stock`, { qty_add: Number(restock.qty) });
      setRestock(null); await load();
    } catch (err) { setError(apiError(err)); }
    finally { setBusy(false); }
  };
  const doArchive = async () => {
    if (busy || !archiveItem || archiveText !== `ARCHIVE ${archiveItem.id}`) return;
    setBusy(true); setError("");
    try {
      await API.put(`/erp/packaging/${archiveItem.id}/archive`);
      setArchiveItem(null); setArchiveText(""); await load();
    } catch (err) { setError(apiError(err)); }
    finally { setBusy(false); }
  };
  const doRestore = async (item) => {
    if (busy || !window.confirm(`Restore material #${item.id} (${item.name}) to active inventory?`)) return;
    setBusy(true); setError("");
    try { await API.put(`/erp/packaging/${item.id}/restore`); await load(); }
    catch (err) { setError(apiError(err)); }
    finally { setBusy(false); }
  };
  const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
  const btn = "inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50";
  return (
    <Layout>
      <main className="min-h-screen bg-slate-50 px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-5">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">NagNail · Warehouse Operations</p>
              <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold text-slate-900"><PackageCheck className="h-6 w-6 text-indigo-600" /> Packaging Inventory</h1>
              <p className="mt-1 text-sm text-slate-500">Compact material management with safe archive and stock controls</p>
            </div>
            <div className="flex items-center gap-2">
              <button disabled={busy} onClick={load} className={`${btn} border-slate-200 bg-white text-slate-700`}><RefreshCw className="h-4 w-4" /> Refresh</button>
              <button disabled={busy} onClick={() => {setError("");setEditor({mode:"add", item:null, form:{...EMPTY}});}} className={`${btn} border-indigo-600 bg-indigo-600 text-white`}><Plus className="h-4 w-4" /> Add Material</button>
            </div>
          </header>
          {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error} <button className="ml-3 font-bold underline" onClick={() => setError("")}>Dismiss</button></div>}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[{label:"Active Materials",value:active.length,Icon:Boxes},{label:"Reserve Units",value:totalUnits.toLocaleString(),Icon:PackageCheck},{label:"Active Inventory Value",value:money(totalValue),Icon:Coins}].map(({label,value,Icon}) => <div key={label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><div><p className="text-[11px] font-bold uppercase text-slate-400">{label}</p><p className="mt-1 text-lg font-extrabold text-slate-900">{value}</p></div><Icon className="h-5 w-5 text-indigo-500" /></div>)}
          </section>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
            <div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input aria-label="Search packaging materials" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search materials..." className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400" /></div>
            <div className="flex items-center gap-2"><button onClick={()=>setShowArchived(false)} className={`${btn} ${!showArchived?'border-indigo-200 bg-indigo-50 text-indigo-700':'border-slate-200 text-slate-600'}`}>Active ({active.length})</button><button onClick={()=>setShowArchived(true)} className={`${btn} ${showArchived?'border-indigo-200 bg-indigo-50 text-indigo-700':'border-slate-200 text-slate-600'}`}>Archived ({archived.length})</button></div>
          </div>
          {loading ? <p className="rounded-xl border bg-white p-6 text-sm text-slate-500">Loading materials...</p> : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {listed.map(item => {
                const low = Number(item.stock_qty) <= 20;
                return <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-bold text-slate-900" title={item.name}>{item.name}</p><p className="text-xs text-slate-400">Material #{item.id}</p></div><span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${showArchived?'bg-slate-100 text-slate-600':low?'bg-rose-50 text-rose-700':'bg-emerald-50 text-emerald-700'}`}>{showArchived?<Archive className="h-3 w-3"/>:low?<AlertTriangle className="h-3 w-3"/>:<CheckCircle2 className="h-3 w-3"/>}{showArchived?'Archived':low?'Low stock':'Optimal'}</span></div>
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3"><div><p className="text-[10px] font-bold uppercase text-slate-400">Stock</p><p className="text-lg font-extrabold text-slate-800">{Number(item.stock_qty).toLocaleString()} <span className="text-xs font-normal text-slate-500">units</span></p></div><div><p className="text-[10px] font-bold uppercase text-slate-400">Unit Cost</p><p className="text-sm font-bold text-slate-800">{money(item.unit_cost)}</p><p className="text-[11px] text-slate-500">Value: {money(Number(item.stock_qty)*Number(item.unit_cost))}</p></div></div>
                  <div className="mt-3 flex flex-wrap gap-2">{showArchived ? <button disabled={busy} onClick={()=>doRestore(item)} className={`${btn} border-emerald-200 bg-emerald-50 text-emerald-700`}><RotateCcw className="h-3.5 w-3.5"/> Restore</button> : <><button disabled={busy} onClick={()=>{setError("");setRestock({item,qty:""});}} className={`${btn} border-indigo-200 bg-indigo-50 text-indigo-700`}><Plus className="h-3.5 w-3.5"/> Restock</button><button disabled={busy} onClick={()=>{setError("");setEditor({mode:"edit",item,form:{name:item.name,unit_cost:String(item.unit_cost),stock_qty:String(item.stock_qty)}});}} className={`${btn} border-slate-200 text-slate-700`}><Pencil className="h-3.5 w-3.5"/> Edit</button><button disabled={busy} onClick={()=>{setError("");setArchiveItem(item);setArchiveText("");}} className={`${btn} border-rose-200 text-rose-700`}><Archive className="h-3.5 w-3.5"/> Archive</button></>}</div>
                </article>;
              })}
              {!listed.length && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-3">No materials found.</div>}
            </div>
          )}
        </div>
      </main>
      {editor && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"><div role="dialog" aria-modal="true" aria-label="Edit packaging material" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><h2 className="font-extrabold text-slate-900">{editor.mode === 'add'?'Add Material':`Edit Material #${editor.item.id}`}</h2><button disabled={busy} aria-label="Close" onClick={()=>setEditor(null)}><X className="h-5 w-5"/></button></div><form onSubmit={save} className="space-y-4"><label className="block text-xs font-bold text-slate-600">Material Name<input required maxLength={100} className={`${fieldClass} mt-1`} value={editor.form.name} onChange={e=>setEditor({...editor,form:{...editor.form,name:e.target.value}})}/></label>{duplicate && <p className="text-xs font-semibold text-rose-700">A material with this name already exists, including archived materials.</p>}{editor.mode==='add'&&<label className="block text-xs font-bold text-slate-600">Initial Stock<input required type="number" min="0" step="1" className={`${fieldClass} mt-1`} value={editor.form.stock_qty} onChange={e=>setEditor({...editor,form:{...editor.form,stock_qty:e.target.value}})}/></label>}<label className="block text-xs font-bold text-slate-600">Cost Per Unit (LKR)<input required type="number" min="0" step="0.01" className={`${fieldClass} mt-1`} value={editor.form.unit_cost} onChange={e=>setEditor({...editor,form:{...editor.form,unit_cost:e.target.value}})}/></label>{editor.mode==='edit'&&<p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Stock quantity is changed only through Restock. This edit updates current unit cost, not historical order costs.</p>}<div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={()=>setEditor(null)} className={`${btn} border-slate-200`}>Cancel</button><button type="submit" disabled={busy||duplicate} className={`${btn} border-indigo-600 bg-indigo-600 text-white`}>{busy?'Saving...':'Save Material'}</button></div></form></div></div>}
      {restock && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"><div role="dialog" aria-modal="true" aria-label="Restock material" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 className="font-bold">Restock: {restock.item.name}</h2><button disabled={busy} onClick={()=>setRestock(null)} aria-label="Close"><X className="h-5 w-5"/></button></div><p className="mt-2 text-xs text-slate-500">Current stock: {restock.item.stock_qty} units</p><form onSubmit={addStock} className="mt-4 space-y-4"><label className="block text-xs font-bold text-slate-600">Units to add<input required type="number" min="1" step="1" className={`${fieldClass} mt-1`} value={restock.qty} onChange={e=>setRestock({...restock,qty:e.target.value})}/></label><div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={()=>setRestock(null)} className={`${btn} border-slate-200`}>Cancel</button><button type="submit" disabled={busy} className={`${btn} border-indigo-600 bg-indigo-600 text-white`}>{busy?'Saving...':'Confirm Restock'}</button></div></form></div></div>}
      {archiveItem && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"><div role="dialog" aria-modal="true" aria-label="Archive material" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><h2 className="text-lg font-extrabold text-rose-700">Archive Material #{archiveItem.id}?</h2><p className="mt-2 text-sm text-slate-700">This hides <strong>{archiveItem.name}</strong> from active inventory totals and preserves packing history. It does NOT physically delete records.</p><p className="mt-3 text-xs font-semibold text-slate-600">Type <strong>ARCHIVE {archiveItem.id}</strong> to confirm</p><input className={`${fieldClass} mt-2`} value={archiveText} onChange={e=>setArchiveText(e.target.value)} autoComplete="off"/><div className="mt-4 flex justify-end gap-2"><button disabled={busy} onClick={()=>setArchiveItem(null)} className={`${btn} border-slate-200`}>Cancel</button><button disabled={busy||archiveText!==`ARCHIVE ${archiveItem.id}`} onClick={doArchive} className={`${btn} border-rose-600 bg-rose-600 text-white`}>{busy?'Archiving...':'Archive Material'}</button></div></div></div>}
    </Layout>
  );
}
