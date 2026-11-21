import { useEffect, useState } from "react";
import API from "../api/config";
import Layout from "../components/Layout";
import { 
  Truck, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Ban, 
  MessageSquare, 
  Package, 
  Wallet, 
  Users, 
  Loader2,
  Building2,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Trash2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, SlidersHorizontal
} from "lucide-react";

export default function Dropshippers() {
  const [dropshippers, setDropshippers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [orderFilter, setOrderFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState({});
  const [actionBusy, setActionBusy] = useState(null);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [delConfirm, setDelConfirm] = useState(null);
  const [delBusy, setDelBusy] = useState(false);
  // NN-DROPNAIL-RESET-BUTTON-V1
  const [resetResult, setResetResult] = useState(null);

  const resetPassword = async (d) => {
    if (actionBusy !== null) return;
    if (!window.confirm(
      `Reset password for ${d.full_name || d.email}?\\n\\n` +
      "Verify the account owner first. Existing sessions will expire."
    )) return;

    setResetResult(null);
    setErrMsg("");
    setMsg("");
    setActionBusy(d.id);

    try {
      const res = await API.post(
        `/dropshippers/${d.id}/reset-password`,
        { confirm: true }
      );
      if (!res.data.success || !res.data.temporary_password) {
        throw new Error("Reset response missing password");
      }
      setResetResult({
        id: d.id,
        name: d.full_name || d.email,
        password: res.data.temporary_password
      });
    } catch (err) {
      setErrMsg(err.response?.data?.error || err.message || "Reset failed");
    } finally {
      setActionBusy(null);
    }
  };


  useEffect(() => { fetchDropshippers(); }, []);

  const fetchDropshippers = async () => {
    try {
      const res = await API.get("/dropshippers");
      if (res.data.success) setDropshippers(res.data.dropshippers);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id, status) => {
    if (actionBusy !== null) return;
    setActionBusy(id);
    try {
      const res = await API.put(`/dropshippers/${id}/status`, { status });
      if (res.data.success) {
        setMsg(`Dropshipper status set to '${status}' successfully!`);
        fetchDropshippers();
        setTimeout(() => setMsg(""), 3000);
      }
    } catch (err) {
      setErrMsg(err.response?.data?.error || "Unable to update partner status");
    } finally { setActionBusy(null); }
  };

  const updateTier = async (id, tier) => {
    if (actionBusy !== null) return;
    setActionBusy(id);
    try {
      await API.put(`/dropshippers/${id}/tier`, { tier });
      await fetchDropshippers();
      setMsg("Partner tier updated");
    } catch (err) {
      setErrMsg(err.response?.data?.error || "Unable to update partner tier");
    } finally { setActionBusy(null); }
  };

  const deleteDropshipper = async (id) => {
    try {
      setDelBusy(true);
      const res = await API.delete(`/dropshippers/${id}`);
      if (res.data.success) {
        setErrMsg("");
        setMsg(res.data.message || "Dropshipper deleted permanently");
        setDelConfirm(null);
        fetchDropshippers();
        setTimeout(() => setMsg(""), 5000);
      }
    } catch (err) {
      setMsg("");
      setErrMsg(err.response?.data?.error || "Delete failed");
      setDelConfirm(null);
      setTimeout(() => setErrMsg(""), 6000);
    } finally { setDelBusy(false); }
  };

  const statuses = ["all", "pending", "approved", "rejected", "suspended"];
  const nOrders = (d) => Number(d.total_orders) || 0;
  const money = (value) => (Number(value) || 0).toLocaleString("en-LK", { maximumFractionDigits: 2 });
  const localPhone = (value) => {
    const raw = String(value || "").replace(/\D/g, "");
    if (/^94\d{9}$/.test(raw)) return "0" + raw.slice(2);
    return raw || "No phone";
  };
  const whatsappUrl = (value) => {
    const raw = String(value || "").replace(/\D/g, "");
    const normalized = raw.startsWith("94") ? raw : "94" + raw.replace(/^0/, "");
    return `https://wa.me/${normalized}`;
  };
  const resetFilters = () => {
    setFilter("all"); setOrderFilter("all"); setTierFilter("all");
    setSortBy("newest"); setSearch(""); setPage(1);
  };
  const filtered = dropshippers.filter(d => {
    const q = search.trim().toLowerCase();
    const text = [d.full_name, d.email, d.phone, localPhone(d.phone), d.business_name].join(" ").toLowerCase();
    return (filter === "all" || d.status === filter)
      && (orderFilter === "all" || (orderFilter === "zero" ? nOrders(d) === 0 : nOrders(d) > 0))
      && (tierFilter === "all" || (d.tier || "bronze") === tierFilter)
      && (!q || text.includes(q));
  }).sort((a,b) => {
    if (sortBy === "most") return nOrders(b) - nOrders(a);
    if (sortBy === "least") return nOrders(a) - nOrders(b);
    if (sortBy === "wallet") return (Number(b.wallet_balance) || 0) - (Number(a.wallet_balance) || 0);
    const dateA = new Date(a.created_at || 0).getTime() || 0;
    const dateB = new Date(b.created_at || 0).getTime() || 0;
    return sortBy === "oldest" ? dateA - dateB : dateB - dateA;
  });
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const changeFilter = (setter, value) => { setter(value); setPage(1); };
  const pendingCount = dropshippers.filter(d => d.status === "pending").length;
  const approvedCount = dropshippers.filter(d => d.status === "approved").length;
  const zeroCount = dropshippers.filter(d => nOrders(d) === 0).length;
  const totalOrdersSum = dropshippers.reduce((total, d) => total + nOrders(d), 0);
  const selectClass = "w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300";
  const actionClass = "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-50";

  return (
    <Layout>
      <main className="min-w-0 min-h-screen bg-slate-50 p-4 sm:p-6 lg:px-8 lg:py-7 space-y-5">
        {/* NN-DROPSHIPPERS-COMPACT-V4 */}
        <section className="rounded-[26px] border border-slate-200 bg-white px-5 py-6 sm:px-7 sm:py-7 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold tracking-[.18em] text-indigo-600 uppercase">NagNail / Reseller Network</p>
              <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 flex items-center gap-2">
                <Truck className="w-7 h-7 text-indigo-600 shrink-0" /> Dropshippers Network
              </h1>
              <p className="text-sm text-slate-500 mt-1">Manage partner approvals, activity, tiers and balances.</p>
            </div>
            <button type="button" onClick={() => { setLoading(true); fetchDropshippers(); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </section>

        {msg && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 flex gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" />{msg}</div>}
        {errMsg && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{errMsg}</div>}

        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3" aria-label="Partner overview">
          {[
            { label: "Total Partners", value: dropshippers.length, icon: Users, color: "text-indigo-600", click: () => resetFilters() },
            { label: "Approved", value: approvedCount, icon: ShieldCheck, color: "text-emerald-600", click: () => changeFilter(setFilter, "approved") },
            { label: "Pending", value: pendingCount, icon: Clock, color: "text-amber-600", click: () => changeFilter(setFilter, "pending") },
            { label: "Zero Orders", value: zeroCount, icon: AlertTriangle, color: "text-rose-600", click: () => changeFilter(setOrderFilter, "zero") },
            { label: "Partner Orders", value: totalOrdersSum, icon: Package, color: "text-blue-600", click: () => changeFilter(setOrderFilter, "has") },
          ].map(k => {
            const Icon = k.icon;
            return <button key={k.label} type="button" onClick={k.click} className="min-w-0 text-left rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <div className="flex items-center justify-between gap-2"><span className="text-[10px] sm:text-xs uppercase tracking-wide font-bold text-slate-500">{k.label}</span><Icon className={`w-4 h-4 shrink-0 ${k.color}`} /></div>
              <div className="mt-1 text-2xl font-extrabold text-slate-950 tabular-nums">{k.value.toLocaleString()}</div>
            </button>;
          })}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-extrabold text-slate-900 flex items-center gap-2"><SlidersHorizontal className="w-4 h-4 text-indigo-600" /> Partner Filters</h2><button type="button" onClick={resetFilters} className="text-xs font-bold text-indigo-600 hover:underline">Clear filters</button></div>
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => changeFilter(setSearch, e.target.value)} placeholder="Search name, phone, email or business..." className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
          <div className="flex gap-2 flex-wrap">
            {statuses.map(s => <button key={s} type="button" onClick={() => changeFilter(setFilter, s)} className={`rounded-lg border px-3 py-2 text-xs font-bold capitalize ${filter === s ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>{s} <span className="opacity-70">{s === "all" ? dropshippers.length : dropshippers.filter(d => d.status === s).length}</span></button>)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block"><span className="block text-xs font-semibold text-slate-500 mb-1">Orders</span><select value={orderFilter} onChange={e => changeFilter(setOrderFilter, e.target.value)} className={selectClass}><option value="all">All order counts</option><option value="zero">Zero orders</option><option value="has">1+ orders</option></select></label>
            <label className="block"><span className="block text-xs font-semibold text-slate-500 mb-1">Tier</span><select value={tierFilter} onChange={e => changeFilter(setTierFilter, e.target.value)} className={selectClass}><option value="all">All tiers</option><option value="bronze">Bronze</option><option value="silver">Silver</option><option value="gold">Gold</option><option value="platinum">Platinum</option></select></label>
            <label className="block"><span className="block text-xs font-semibold text-slate-500 mb-1">Sort</span><select value={sortBy} onChange={e => changeFilter(setSortBy, e.target.value)} className={selectClass}><option value="newest">Newest registered</option><option value="oldest">Oldest registered</option><option value="most">Most orders</option><option value="least">Fewest orders</option><option value="wallet">Highest wallet balance</option></select></label>
          </div>
        </section>

        <section className="min-w-0 space-y-3">
          <div className="flex flex-wrap justify-between items-center gap-2 px-1"><div><h2 className="text-lg font-extrabold text-slate-900">Partner Directory</h2><p className="text-xs text-slate-500">{filtered.length} matching partners · {loading ? "Loading" : `Page ${currentPage} of ${pageCount}`}</p></div><span className="text-xs font-medium text-slate-500">20 per page</span></div>
          {loading ? <div className="rounded-xl border bg-white p-12 text-center text-slate-500"><Loader2 className="animate-spin w-6 h-6 mx-auto mb-2 text-indigo-600" />Loading partners...</div> : filtered.length === 0 ? <div className="rounded-xl border bg-white p-12 text-center text-slate-500">No partners match these filters. <button type="button" onClick={resetFilters} className="font-bold text-indigo-600 underline">Clear filters</button></div> : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {visible.map(d => {
                const open = !!expanded[d.id];
                const busy = actionBusy === d.id || delBusy;
                return <article key={d.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm hover:border-indigo-200 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 flex-none rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center">{(d.full_name || "D").charAt(0).toUpperCase()}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold text-slate-900 text-sm truncate max-w-full">{d.full_name || "Unnamed partner"}</h3><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${d.status === "approved" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : d.status === "pending" ? "bg-amber-50 border-amber-200 text-amber-700" : d.status === "rejected" ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-slate-100 border-slate-200 text-slate-600"}`}>{d.status || "unknown"}</span></div>
                      <p className="text-xs text-slate-500 truncate" title={d.business_name || ""}>{d.business_name || "No business name"} · {d.tier || "bronze"}</p>
                      <p className="text-xs text-slate-500 truncate" title={d.email || ""}>{d.email || "No email"}</p>
                    </div>
                    <button type="button" aria-label={open ? "Collapse partner actions" : "Expand partner actions"} aria-expanded={open} onClick={() => setExpanded(e => ({...e, [d.id]: !e[d.id]}))} className="flex-none rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">{open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-600">
                    <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5 text-indigo-500" />{nOrders(d)} orders</span>
                    <span className="flex items-center gap-1"><Wallet className="w-3.5 h-3.5 text-indigo-500" />LKR {money(d.wallet_balance)}</span>
                    <span>{localPhone(d.phone)}</span>
                    {d.created_at && <span className="text-slate-400">Joined {new Date(d.created_at).toLocaleDateString("en-LK", { year: "numeric", month: "short", day: "numeric" })}</span>}
                  </div>
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => resetPassword(d)}
                      className={`${actionClass} border-indigo-200 bg-indigo-50 text-indigo-700`}
                    >
                      Reset Password
                    </button>
                    {resetResult?.id === d.id && (
                      <div className="w-full rounded-xl border border-amber-300 bg-amber-50 p-3 space-y-2">
                        <p className="text-sm font-bold text-slate-800">
                          Temporary password for {resetResult.name}
                        </p>
                        <code className="block break-all rounded bg-white p-2 text-sm select-all">
                          {resetResult.password}
                        </code>
                        <p className="text-xs text-amber-900">
                          Displayed once. Share only after verifying the account owner.
                          Ask the partner to change the password after login.
                        </p>
                        <div className="flex gap-2">
                          <button type="button"
                            onClick={() => navigator.clipboard.writeText(resetResult.password)
                              .then(() => setMsg("Temporary password copied"))
                              .catch(() => setErrMsg("Copy failed. Select the password manually."))}
                            className={`${actionClass} bg-indigo-600 text-white`}>
                            Copy Password
                          </button>
                          <button type="button"
                            onClick={() => setResetResult(null)}
                            className={`${actionClass} border-slate-300 bg-white text-slate-700`}>
                            Close
                          </button>
                        </div>
                      </div>
                    )}
                    {d.phone && <a href={whatsappUrl(d.phone)} target="_blank" rel="noreferrer" className={`${actionClass} bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700`}><MessageSquare className="w-3.5 h-3.5" /> WhatsApp</a>}
                    {d.status === "pending" && <button type="button" disabled={busy} onClick={() => updateStatus(d.id, "approved")} className={`${actionClass} border-emerald-200 bg-emerald-50 text-emerald-700`}><CheckCircle2 className="w-3.5 h-3.5" /> Approve</button>}
                    {d.status === "pending" && <button type="button" disabled={busy} onClick={() => updateStatus(d.id, "rejected")} className={`${actionClass} border-rose-200 bg-rose-50 text-rose-700`}><XCircle className="w-3.5 h-3.5" /> Reject</button>}
                    {d.status === "approved" && <button type="button" disabled={busy} onClick={() => updateStatus(d.id, "suspended")} className={`${actionClass} border-slate-200 bg-slate-50 text-slate-700`}><Ban className="w-3.5 h-3.5" /> Suspend</button>}
                    {(d.status === "rejected" || d.status === "suspended") && <button type="button" disabled={busy} onClick={() => updateStatus(d.id, "approved")} className={`${actionClass} border-emerald-200 bg-emerald-50 text-emerald-700`}><RefreshCw className="w-3.5 h-3.5" /> Re-Approve</button>}
                  </div>
                  {open && <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                    <label className="text-xs font-bold text-slate-600 flex items-center gap-2">Tier <select disabled={busy} value={d.tier || "bronze"} onChange={e => updateTier(d.id, e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-800"><option value="bronze">🥉 Bronze</option><option value="silver">🥈 Silver</option><option value="gold">🥇 Gold</option><option value="platinum">💎 Platinum</option></select></label>
                    {delConfirm === d.id ? <div className="flex items-center gap-2 flex-wrap"><span className="text-xs font-bold text-rose-600">Delete permanently?</span><button type="button" disabled={busy} onClick={() => deleteDropshipper(d.id)} className={`${actionClass} bg-rose-600 border-rose-600 text-white`}>{delBusy ? "Deleting..." : "Yes, delete"}</button><button type="button" disabled={busy} onClick={() => setDelConfirm(null)} className={`${actionClass} border-slate-200 text-slate-600`}>Cancel</button></div> : <button type="button" disabled={busy} onClick={() => { setDelConfirm(d.id); setErrMsg(""); setMsg(""); }} className={`${actionClass} border-rose-200 text-rose-600`}><Trash2 className="w-3.5 h-3.5" /> Delete</button>}
                  </div>}
                </article>;
              })}
            </div>
          )}
          {!loading && filtered.length > pageSize && <nav aria-label="Partner pages" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"><span className="text-xs text-slate-500">Showing {(currentPage-1)*pageSize+1}–{Math.min(currentPage*pageSize, filtered.length)} of {filtered.length}</span><div className="flex items-center gap-2"><button type="button" disabled={currentPage===1} onClick={()=>setPage(p=>Math.max(1,p-1))} className={`${actionClass} border-slate-200 text-slate-700 disabled:opacity-40`}><ChevronLeft className="w-4 h-4" /> Previous</button><span className="text-xs font-bold">{currentPage} / {pageCount}</span><button type="button" disabled={currentPage===pageCount} onClick={()=>setPage(p=>Math.min(pageCount,p+1))} className={`${actionClass} border-slate-200 text-slate-700 disabled:opacity-40`}>Next <ChevronRight className="w-4 h-4" /></button></div></nav>}
        </section>
      </main>
    </Layout>
  );
}
