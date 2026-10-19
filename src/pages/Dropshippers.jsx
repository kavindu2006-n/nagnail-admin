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
  Trash2
} from "lucide-react";

export default function Dropshippers() {
  const [dropshippers, setDropshippers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [delConfirm, setDelConfirm] = useState(null);
  const [delBusy, setDelBusy] = useState(false);

  useEffect(() => { fetchDropshippers(); }, []);

  const fetchDropshippers = async () => {
    try {
      const res = await API.get("/dropshippers");
      if (res.data.success) setDropshippers(res.data.dropshippers);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id, status) => {
    try {
      const res = await API.put(`/dropshippers/${id}/status`, { status });
      if (res.data.success) {
        setMsg(`Dropshipper status set to '${status}' successfully!`);
        fetchDropshippers();
        setTimeout(() => setMsg(""), 3000);
      }
    } catch (err) { console.error(err); }
  };

  const updateTier = async (id, tier) => {
    try {
      await API.put(`/dropshippers/${id}/tier`, { tier });
      fetchDropshippers();
    } catch (err) { console.error(err); }
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

  const filtered = dropshippers.filter(d => {
    const matchFilter = filter === "all" || d.status === filter;
    const matchSearch = !search ||
      d.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.email?.toLowerCase().includes(search.toLowerCase()) ||
      d.phone?.includes(search) ||
      d.business_name?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const pendingCount = dropshippers.filter(d => d.status === "pending").length;
  const approvedCount = dropshippers.filter(d => d.status === "approved").length;
  const totalOrdersSum = dropshippers.reduce((s, d) => s + (d.total_orders || 0), 0);

  return (
    <Layout>
      <div className="p-6 bg-slate-50 min-h-screen">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Truck className="w-7 h-7 text-indigo-600" /> Dropshippers Network
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">Manage dropship partner onboarding, tiers, wallet balances, andaccount approvals</p>
          </div>
        </div>

        {/* Feedback Alert Message */}
        {msg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl mb-6 text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {msg}
          </div>
        )}

        {errMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl mb-6 text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" /> {errMsg}
          </div>
        )}

        {/* KPI Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Partners</p>
              <p className="text-2xl font-extrabold text-slate-800 mt-1">{dropshippers.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Approval</p>
              <p className="text-2xl font-extrabold text-amber-600 mt-1">{pendingCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Approved Active</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">{approvedCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Partner Orders</p>
              <p className="text-2xl font-extrabold text-blue-600 mt-1">{totalOrdersSum.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Package className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 space-y-3 shadow-sm">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by partner name, email, phone, or store business name..."
              className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-medium" 
            />
          </div>

          <div className="flex gap-2 flex-wrap pt-1">
            {statuses.map((s) => {
              const count = s === "all" ? dropshippers.length : dropshippers.filter((d) => d.status === s).length;
              const isActive = filter === s;
              return (
                <button 
                  key={s} 
                  onClick={() => setFilter(s)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition border flex items-center gap-1.5 ${
                    isActive 
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm" 
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>{s}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-600"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* List of Dropshippers */}
        {loading ? (
          <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-400 font-medium">Loading dropshipper network...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-400 font-medium">
            <Truck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p>No dropshippers found matching your search.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((d) => (
              <div key={d.id} className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 hover:border-slate-300 transition">
                
                {/* Top Section */}
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                      {d.full_name?.charAt(0)?.toUpperCase() || "D"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800 text-base">{d.full_name}</h3>
                        {d.business_name && (
                          <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded border border-indigo-100">
                            <Building2 className="w-3 h-3" />
                            {d.business_name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {d.email} · <span className="font-mono">{d.phone || "No phone"}</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Registered: {new Date(d.created_at).toLocaleDateString("en-LK", { year: "numeric", month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>

                  {/* Status & Wallet Badges */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                      d.status === "approved" 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                        : d.status === "pending"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : d.status === "rejected"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}>
                      {d.status === "approved" && <CheckCircle2 className="w-3 h-3" />}
                      {d.status === "pending" && <Clock className="w-3 h-3" />}
                      {d.status === "rejected" && <XCircle className="w-3 h-3" />}
                      {d.status === "suspended" && <Ban className="w-3 h-3" />}
                      {d.status}
                    </span>

                    <div className="flex items-center gap-3 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                      <span className="flex items-center gap-1 font-medium text-slate-600">
                        <Package className="w-3.5 h-3.5 text-slate-400" />
                        <strong className="text-slate-800">{d.total_orders || 0}</strong> orders
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="flex items-center gap-1 font-medium text-slate-600">
                        <Wallet className="w-3.5 h-3.5 text-indigo-600" />
                        <strong className="text-slate-900 font-mono">LKR {parseFloat(d.wallet_balance || 0).toLocaleString()}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {d.phone && (
                      <a 
                        href={`https://wa.me/94${d.phone?.replace(/^0/,"")?.replace(/\D/,"")}`}
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                      </a>
                    )}

                    {d.status === "pending" && (
                      <>
                        <button 
                          onClick={() => updateStatus(d.id, "approved")}
                          className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Approve Partner
                        </button>
                        <button 
                          onClick={() => updateStatus(d.id, "rejected")}
                          className="inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                        >
                          <XCircle className="w-3 h-3" /> Reject
                        </button>
                      </>
                    )}

                    {d.status === "approved" && (
                      <button 
                        onClick={() => updateStatus(d.id, "suspended")}
                        className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                      >
                        <Ban className="w-3 h-3" /> Suspend
                      </button>
                    )}

                    {(d.status === "rejected" || d.status === "suspended") && (
                      <button 
                        onClick={() => updateStatus(d.id, "approved")}
                        className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                      >
                        <RefreshCw className="w-3 h-3" /> Re-Approve
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tier:</span>
                    <select
                      value={d.tier || "bronze"}
                      onChange={(e) => updateTier(d.id, e.target.value)}
                      className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                    >
                      <option value="bronze">🥉 Bronze Tier</option>
                      <option value="silver">🥈 Silver Tier</option>
                      <option value="gold">🥇 Gold Tier</option>
                      <option value="platinum">💎 Platinum Tier</option>
                    </select>

                    <span className="w-px h-6 bg-slate-200 mx-1" />

                    {delConfirm === d.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-rose-600">Delete permanently?</span>
                        <button
                          onClick={() => deleteDropshipper(d.id)}
                          disabled={delBusy}
                          className="inline-flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50"
                        >
                          {delBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          {delBusy ? "Deleting..." : "Yes, delete"}
                        </button>
                        <button
                          onClick={() => setDelConfirm(null)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setDelConfirm(d.id); setMsg(""); setErrMsg(""); }}
                        title="Delete this dropshipper permanently"
                        className="inline-flex items-center gap-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </Layout>
  );
}
