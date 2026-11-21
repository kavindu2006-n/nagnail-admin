import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import API from "../api/config";
import Layout from "../components/Layout";
import { DollarSign, Search, Download, CheckCircle2, XCircle, Clock, MessageSquare, Building2, CreditCard, User, Loader2, AlertCircle, ShieldCheck, Eye, EyeOff, Copy, RefreshCcw, ArrowDownUp, ChevronDown, ChevronUp, Wallet } from "lucide-react";

const money = n => `LKR ${Number(n || 0).toLocaleString("en-LK", { maximumFractionDigits: 2 })}`;
const safeDate = v => { const d = new Date(v); return Number.isNaN(+d) ? "—" : d.toLocaleDateString("en-LK", { year: "numeric", month: "short", day: "numeric" }); };
const mask = v => { const s = String(v || ""); return s ? `•••• ${s.slice(-4)}` : "Not supplied"; };
const phoneForWA = v => { const digits = String(v || "").replace(/\D/g, ""); if (digits.startsWith("94") && digits.length === 11) return digits; if (digits.startsWith("0") && digits.length === 10) return `94${digits.slice(1)}`; if (digits.length === 9 && digits.startsWith("7")) return `94${digits}`; return null; };
// NN-PAYOUTS-SAFETY-UI-V4: frontend guards only; backend must enforce atomic updates.
const CSV = v => `"${String(v ?? "").replace(/^[=+@\-\t\r]/, "'$&").replace(/"/g, '""')}"`;
const statusStyle = { pending: "bg-amber-50 text-amber-700 border-amber-200", paid: "bg-emerald-50 text-emerald-700 border-emerald-200", rejected: "bg-rose-50 text-rose-700 border-rose-200" };

export default function Payouts() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState({});
  const [revealed, setRevealed] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [updating, setUpdating] = useState(null);
  const inflight = useRef(false);
  const pageSize = 20;

  const fetchPayouts = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await API.get("/payouts");
      if (!res.data?.success || !Array.isArray(res.data.payouts)) throw new Error("Invalid payouts API response");
      setPayouts(res.data.payouts);
    } catch (e) { setError(e.response?.data?.error || e.message || "Unable to load payouts"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);
  useEffect(() => setPage(1), [filter, search, sort]);

  const filtered = useMemo(() => payouts.filter(p => {
    const q = search.trim().toLowerCase();
    return (filter === "all" || p.status === filter) && (!q || [p.id, p.dropshipper_name, p.dropshipper_email, p.bank_name, p.account_name].some(x => String(x || "").toLowerCase().includes(q)));
  }).sort((a,b) => {
    if (sort === "highest") return Number(b.amount || 0) - Number(a.amount || 0);
    if (sort === "lowest") return Number(a.amount || 0) - Number(b.amount || 0);
    const ad = new Date(a.requested_at || a.created_at).getTime() || 0;
    const bd = new Date(b.requested_at || b.created_at).getTime() || 0;
    return sort === "oldest" ? ad - bd : bd - ad;
  }), [payouts, filter, search, sort]);
  const visible = filtered.slice((page-1)*pageSize, page*pageSize);
  const pages = Math.max(1, Math.ceil(filtered.length/pageSize));
  const pending = payouts.filter(p => p.status === "pending");
  const paid = payouts.filter(p => p.status === "paid");
  const counts = { all:payouts.length, pending:pending.length, paid:paid.length, rejected:payouts.filter(p=>p.status==="rejected").length };

  const openReview = (p, status) => { if (inflight.current || p.status !== "pending") return; setConfirm({ id:p.id, amount:p.amount, name:p.dropshipper_name, status, bank:p.bank_name, account:p.account_number, holder:p.account_name }); setAcknowledged(false); setConfirmText(""); setMessage(""); };
  const submitReview = async () => {
    if (!confirm || inflight.current || !acknowledged || confirmText.trim().toUpperCase() !== confirm.status.toUpperCase()) return;
    inflight.current = true; setUpdating(confirm.id); setError(""); setMessage("");
    try {
      // Verify current state immediately before issuing a financial update. Backend must also enforce this atomically.
      const latest = await API.get("/payouts");
      if (!latest.data?.success || !Array.isArray(latest.data.payouts)) throw new Error("Could not verify latest payout state");
      const item = latest.data.payouts.find(p => String(p.id) === String(confirm.id));
      if (!item || item.status !== "pending") throw new Error("This payout is no longer pending. No change sent.");
      if (Number(item.amount) !== Number(confirm.amount) || String(item.account_number || "") !== String(confirm.account || "")) throw new Error("Payout details changed. Refresh and review again.");
      const result = await API.put(`/payouts/${confirm.id}/status`, {status:confirm.status});
      if (!result.data?.success) throw new Error(result.data?.error || "Server did not confirm update");
      setMessage(`Payout #${confirm.id} marked ${confirm.status}. This does not itself verify bank settlement.`);
      setConfirm(null); await fetchPayouts();
    } catch (e) { setError(e.response?.data?.error || e.message || "Update failed. Check status before retrying."); await fetchPayouts(); }
    finally { inflight.current = false; setUpdating(null); }
  };
  const sendWhatsApp = (p) => {
    const phone = phoneForWA(p.dropshipper_phone);
    if (!phone) { setError("Missing or invalid reseller WhatsApp phone."); return; }
    const text = p.status === "paid"
      ? `Hello ${p.dropshipper_name || ""}, your DropNail payout request of ${money(p.amount)} is recorded as PAID in our system. Please contact support if you have not received the transfer.`
      : `Hello ${p.dropshipper_name || ""}, your DropNail payout request of ${money(p.amount)} is recorded as REJECTED. Please contact support for details.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };
  const exportCSV = () => {
    const rows = [["Payout ID","Partner","Email","Amount LKR","Bank","Account last 4","Account holder","Status","Requested"]];
    filtered.forEach(p => rows.push([p.id,p.dropshipper_name,p.dropshipper_email,Number(p.amount || 0).toFixed(2),p.bank_name,String(p.account_number || "").slice(-4),p.account_name,p.status,safeDate(p.requested_at || p.created_at)]));
    const csv = rows.map(r=>r.map(CSV).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF",csv], {type:"text/csv;charset=utf-8"});
    const link = document.createElement("a"); const url = URL.createObjectURL(blob); link.href=url; link.download=`payouts-${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const copy = async v => { try { await navigator.clipboard.writeText(String(v)); setMessage("Copied to clipboard"); } catch { setError("Clipboard unavailable. Select and copy manually."); } };

  return <Layout>
    <div className="min-w-0 min-h-full bg-slate-50 px-4 py-5 sm:px-6 lg:px-10 lg:py-8 space-y-5">
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5 sm:p-7 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <div><p className="text-xs font-extrabold tracking-[.18em] text-indigo-600 mb-2">NAGNAIL / FINANCE OPERATIONS</p><h1 className="text-3xl font-black tracking-tight text-slate-950">Payout Center</h1><p className="text-slate-500 text-sm mt-1">Review reseller withdrawal requests with safer controls.</p></div>
        <div className="flex gap-2 flex-wrap"><button onClick={fetchPayouts} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 font-semibold text-sm hover:bg-slate-50"><RefreshCcw size={16}/> Refresh</button><button onClick={exportCSV} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-white font-semibold text-sm hover:bg-indigo-700"><Download size={16}/> Export masked CSV</button></div>
      </section>
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-3 sm:p-4 text-xs sm:text-sm text-amber-900 flex gap-2"><ShieldCheck className="w-5 h-5 shrink-0"/><p><strong>Financial safety:</strong> Mark Paid only after confirming the real bank transfer. UI verification cannot prevent concurrent requests or guarantee wallet accounting; server-side atomic protection and audit logs must be verified separately.</p></section>
      {error && <div role="alert" className="border border-rose-200 rounded-xl bg-rose-50 px-4 py-3 text-rose-800 text-sm flex gap-2"><AlertCircle size={18}/>{error}</div>}
      {message && <div role="status" className="border border-emerald-200 rounded-xl bg-emerald-50 px-4 py-3 text-emerald-800 text-sm flex gap-2"><CheckCircle2 size={18}/>{message}</div>}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[{label:"Total Requests",value:counts.all,color:"text-slate-900",icon:DollarSign},{label:"Pending Amount",value:money(pending.reduce((s,p)=>s+Number(p.amount||0),0)),color:"text-amber-700",icon:Clock},{label:"Recorded Paid",value:money(paid.reduce((s,p)=>s+Number(p.amount||0),0)),color:"text-emerald-700",icon:CheckCircle2},{label:"Rejected",value:counts.rejected,color:"text-rose-700",icon:XCircle}].map(k=><div key={k.label} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-3 sm:p-4"><div className="flex justify-between gap-2 items-center"><p className="text-[11px] font-bold uppercase text-slate-500 tracking-wide">{k.label}</p><k.icon size={18} className={k.color}/></div><p className={`font-black text-lg sm:text-2xl mt-2 break-words ${k.color}`}>{k.value}</p></div>)}
      </section>
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 items-center flex-wrap"><Search className="w-4 h-4 text-slate-400"/><input aria-label="Search payouts" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search partner, email, bank or payout ID..." className="min-w-[180px] flex-1 p-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-200"/><div className="flex items-center gap-2"><ArrowDownUp size={15} className="text-slate-400"/><select aria-label="Sort payouts" value={sort} onChange={e=>setSort(e.target.value)} className="border border-slate-200 rounded-xl p-2.5 text-sm bg-white"><option value="recent">Newest first</option><option value="oldest">Oldest first</option><option value="highest">Highest amount</option><option value="lowest">Lowest amount</option></select></div></div>
        <div className="flex gap-2 flex-wrap">{["all","pending","paid","rejected"].map(s=><button key={s} onClick={()=>setFilter(s)} className={`text-xs font-semibold rounded-lg border px-3 py-2 capitalize ${filter===s?"bg-slate-900 text-white border-slate-900":"bg-slate-50 text-slate-600 border-slate-200"}`}>{s} <span className="opacity-70">{counts[s]}</span></button>)}</div>
      </section>
      <div className="flex items-center justify-between"><div><h2 className="text-lg font-black text-slate-900">Payout Requests</h2><p className="text-xs text-slate-500">{filtered.length} matching • page {Math.min(page,pages)} of {pages}</p></div><span className="text-xs text-slate-500">20 per page</span></div>
      {loading ? <div className="p-12 text-center bg-white rounded-2xl text-slate-500"><Loader2 className="animate-spin mx-auto mb-2"/>Loading payouts...</div> : visible.length===0 ? <div className="p-12 text-center bg-white border rounded-2xl text-slate-500">No matching payout requests.</div> : <section className="grid grid-cols-1 xl:grid-cols-2 gap-3">{visible.map(p=>{
        const isOpen=!!expanded[p.id]; const isRevealed=!!revealed[p.id]; const bankOkay=Boolean(p.bank_name && p.account_name && p.account_number); const status=p.status || "pending";
        return <article key={p.id} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 min-w-0">
          <div className="flex justify-between items-start gap-3"><div className="flex items-center gap-2.5 min-w-0"><div className="bg-indigo-600 text-white rounded-xl w-10 h-10 shrink-0 grid place-items-center font-bold">{String(p.dropshipper_name || "D").slice(0,1).toUpperCase()}</div><div className="min-w-0"><p className="font-bold text-sm text-slate-900 truncate">{p.dropshipper_name || "Unnamed partner"}</p><p className="text-xs text-slate-500 truncate">{p.dropshipper_email || "—"}</p><p className="text-[11px] text-slate-400">#{p.id} · {safeDate(p.requested_at || p.created_at)}</p></div></div><div className="text-right shrink-0"><p className="text-lg font-black text-slate-900 tabular-nums">{money(p.amount)}</p><span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${statusStyle[status] || "bg-slate-50 text-slate-600 border-slate-200"}`}>{status}</span></div></div>
          <div className="mt-3 flex items-center gap-3 flex-wrap justify-between rounded-xl bg-slate-50 border border-slate-100 px-3 py-2"><div className="text-xs min-w-0"><p className="font-semibold text-slate-800 truncate">{p.bank_name || "Bank not supplied"} · {mask(p.account_number)}</p><p className="text-slate-500 truncate">{p.account_name || "Account holder missing"}</p></div><button onClick={()=>setExpanded(v=>({...v,[p.id]:!v[p.id]}))} className="text-xs font-semibold text-indigo-700 inline-flex items-center gap-1">{isOpen?"Hide":"Review"} details {isOpen?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</button></div>
          {isOpen && <div className="mt-3 border border-slate-200 rounded-xl p-3 space-y-3 text-sm"><div className="flex justify-between gap-3 items-center"><div><p className="text-[10px] uppercase font-bold text-slate-400">Bank Account</p><p className="font-mono font-semibold text-slate-900 break-all">{isRevealed?(p.account_number || "—"):mask(p.account_number)}</p></div><div className="flex gap-1"><button aria-label={isRevealed?"Hide account number":"Reveal account number"} onClick={()=>setRevealed(v=>({...v,[p.id]:!v[p.id]}))} className="border border-slate-200 p-2 rounded-lg">{isRevealed?<EyeOff size={16}/>:<Eye size={16}/>}</button>{isRevealed && <button aria-label="Copy account number" onClick={()=>copy(p.account_number || "")} className="border border-slate-200 p-2 rounded-lg"><Copy size={16}/></button>}</div></div><div><p className="text-[10px] uppercase font-bold text-slate-400">Account holder</p><p className="font-semibold">{p.account_name || "Not supplied"}</p></div><div><p className="text-[10px] uppercase font-bold text-slate-400">Bank</p><p className="font-semibold">{p.bank_name || "Not supplied"}</p></div></div>}
          <div className="mt-3 flex flex-wrap gap-2 items-center">{status==="pending" ? <><button disabled={Boolean(updating)||!bankOkay} title={!bankOkay?"Missing bank details":"Review payment"} onClick={()=>openReview(p,"paid")} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white px-3 py-2 rounded-lg text-xs font-bold">Review bank transfer</button><button disabled={Boolean(updating)} onClick={()=>openReview(p,"rejected")} className="bg-rose-50 text-rose-700 px-3 py-2 border border-rose-200 rounded-lg text-xs font-bold">Review rejection</button></> : <><span className="text-xs text-slate-500">{status==="paid"?"Recorded paid in ERP":"Rejected request"}</span><button onClick={()=>sendWhatsApp(p)} className="ml-auto text-xs font-bold bg-slate-50 border px-3 py-2 rounded-lg inline-flex items-center gap-1"><MessageSquare size={14}/> WhatsApp message</button></>}</div>
        </article>;
      })}</section>}
      {pages>1 && <div className="flex justify-center items-center gap-3 pb-6"><button disabled={page===1} onClick={()=>setPage(v=>Math.max(1,v-1))} className="px-4 py-2 border bg-white rounded-xl disabled:opacity-40">Previous</button><span className="text-sm">{page} / {pages}</span><button disabled={page>=pages} onClick={()=>setPage(v=>Math.min(pages,v+1))} className="px-4 py-2 border bg-white rounded-xl disabled:opacity-40">Next</button></div>}
      {confirm && <div className="fixed inset-0 z-[100] bg-slate-950/65 flex items-center justify-center p-4" role="presentation"><div role="dialog" aria-modal="true" aria-label="Confirm payout update" className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4"><div className="flex gap-3 items-center"><ShieldCheck className="text-indigo-600"/><h2 className="font-black text-lg">{confirm.status==="paid"?"Confirm bank transfer":"Confirm payout rejection"}</h2></div><p className="text-sm text-slate-600">Request #{confirm.id} · {confirm.name} · <strong>{money(confirm.amount)}</strong></p>{confirm.status==="paid"?<div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-900">Only continue if the transfer was completed and independently verified in your banking system. No transfer is initiated by this page.</div>:<p className="text-sm text-rose-700">The request will be marked rejected. Review the reason with the reseller first.</p>}
        <div className="text-sm bg-slate-50 p-3 rounded-xl"><div>{confirm.bank || "No bank"} · {mask(confirm.account)}</div><div className="font-semibold">{confirm.holder || "No account holder"}</div></div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={acknowledged} onChange={e=>setAcknowledged(e.target.checked)} className="mt-1"/><span>{confirm.status==="paid"?"I verified the external bank transfer and bank details.":"I reviewed this payout and intend to reject it."}</span></label>
        <label className="block text-sm">Type <strong>{confirm.status.toUpperCase()}</strong> to confirm<input autoFocus value={confirmText} onChange={e=>setConfirmText(e.target.value)} className="mt-1 block border rounded-lg w-full p-2.5" placeholder={confirm.status.toUpperCase()}/></label>
        <div className="flex justify-end gap-2"><button disabled={Boolean(updating)} onClick={()=>setConfirm(null)} className="px-4 py-2.5 border rounded-xl text-sm">Cancel</button><button disabled={Boolean(updating)||!acknowledged||confirmText.trim().toUpperCase()!==confirm.status.toUpperCase()} onClick={submitReview} className={`px-4 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-40 ${confirm.status==="paid"?"bg-emerald-700":"bg-rose-700"}`}>{updating?"Updating...":confirm.status==="paid"?"Mark recorded Paid":"Reject payout"}</button></div>
      </div></div>}
    </div>
  </Layout>;
}
