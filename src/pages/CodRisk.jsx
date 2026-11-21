import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import API from "../api/config";
import { ShieldAlert, Ban, RefreshCw, Phone, Trash2 } from "lucide-react";

const LV = {
  high: { t: "🔴 High", c: "bg-rose-100 text-rose-700 border-rose-200" },
  medium: { t: "🟡 Medium", c: "bg-amber-100 text-amber-700 border-amber-200" },
  low: { t: "🟢 Low", c: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};
const fmtPhone = (p) => (p && p.length === 11 ? "0" + p.slice(2) : p || "-");

export default function CodRisk() {
  const [tab, setTab] = useState("orders");
  const [data, setData] = useState(null);
  const [black, setBlack] = useState([]);
  const [filter, setFilter] = useState("all");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ phone: "", reason: "" });

  const load = async () => {
    setErr("");
    try {
      const [a, b] = await Promise.all([API.get("/risk/orders?limit=200"), API.get("/risk/blacklist")]);
      setData(a.data); setBlack(b.data.blacklist || []);
    } catch (e) { setErr(e.response?.data?.error || "Failed to load"); }
  };
  useEffect(() => { load(); }, []);

  const block = async (phone, reason) => {
    if (phone === "" || phone === undefined) return;
    const r = reason === undefined ? window.prompt("Reason for blocking " + fmtPhone(phone) + " ?", "Refused parcel / fake order") : reason;
    if (r === null) return;
    try { await API.post("/risk/blacklist", { phone, reason: r }); setMsg("🚫 " + fmtPhone(phone) + " blocked"); setForm({ phone: "", reason: "" }); load(); }
    catch (e) { setMsg("❌ " + (e.response?.data?.error || "Failed")); }
  };
  const unblock = async (phone) => {
    if (window.confirm("Unblock " + fmtPhone(phone) + " ?") === false) return;
    try { await API.delete("/risk/blacklist/" + phone); setMsg("✅ " + fmtPhone(phone) + " unblocked"); load(); }
    catch (e) { setMsg("❌ " + (e.response?.data?.error || "Failed")); }
  };

  const orders = (data?.orders || []).filter((o) => filter === "all" || o.level === filter);
  const s = data?.summary || { high: 0, medium: 0, low: 0 };

  return (
    <Layout>
      <div className="p-6 max-w-7xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2"><ShieldAlert className="w-8 h-8 text-rose-600" /> COD Risk & Blacklist</h1>
            <p className="text-slate-500">Spot fake COD orders before you ship. Blocked numbers cannot place new orders.</p>
          </div>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-semibold hover:bg-slate-50"><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>

        {err && <div className="p-4 mb-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">{err}</div>}
        {msg && <div className="p-3 mb-4 bg-slate-800 text-white rounded-xl text-sm flex justify-between"><span>{msg}</span><button onClick={() => setMsg("")}>✕</button></div>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[["all", "All orders", (data?.orders || []).length, "text-slate-900"], ["high", "🔴 High risk", s.high, "text-rose-600"], ["medium", "🟡 Medium", s.medium, "text-amber-600"], ["low", "🟢 Low", s.low, "text-emerald-600"]].map(([k, l, v, c]) => (
            <button key={k} onClick={() => { setTab("orders"); setFilter(k); }} className={`text-left p-5 bg-white rounded-2xl border-2 transition ${filter === k && tab === "orders" ? "border-indigo-500" : "border-transparent"}`}>
              <div className="text-sm text-slate-500">{l}</div>
              <div className={`text-3xl font-black ${c}`}>{v}</div>
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab("orders")} className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === "orders" ? "bg-slate-900 text-white" : "bg-white border"}`}>Orders risk</button>
          <button onClick={() => setTab("black")} className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === "black" ? "bg-slate-900 text-white" : "bg-white border"}`}>🚫 Blacklist ({black.length})</button>
        </div>

        {tab === "orders" && (
          <div className="bg-white rounded-2xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr><th className="p-3 text-left">Order</th><th className="p-3 text-left">Customer</th><th className="p-3 text-right">Total</th><th className="p-3 text-left">Risk</th><th className="p-3 text-left">Why</th><th className="p-3 text-left">History</th><th className="p-3"></th></tr>
              </thead>
              <tbody>
                {data === null && <tr><td colSpan="7" className="p-6 text-center text-slate-400">Loading...</td></tr>}
                {data && orders.length === 0 && <tr><td colSpan="7" className="p-6 text-center text-slate-400">No orders</td></tr>}
                {orders.map((o) => (
                  <tr key={o.id} className="border-t align-top hover:bg-slate-50">
                    <td className="p-3"><div className="font-bold">{o.order_number}</div><div className="text-xs text-slate-400">{new Date(o.created_at).toLocaleString()}</div><div className="text-xs uppercase text-slate-500">{o.status} · {o.payment_method}</div></td>
                    <td className="p-3"><div className="font-semibold">{o.name || "-"}</div>
                      {o.phone ? <a href={"https://wa.me/" + o.phone} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 flex items-center gap-1"><Phone className="w-3 h-3" />{fmtPhone(o.phone)}</a> : <div className="text-xs text-slate-400">no phone</div>}
                      <div className="text-xs text-slate-400 max-w-[180px] truncate" title={o.address}>{o.address} {o.city && "· " + o.city}</div></td>
                    <td className="p-3 text-right font-semibold">LKR {Math.round(o.total_amount).toLocaleString()}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded-full border text-xs font-bold whitespace-nowrap ${LV[o.level].c}`}>{LV[o.level].t} · {o.score}</span></td>
                    <td className="p-3 text-xs text-slate-600">{o.flags.length ? o.flags.map((f, i) => <div key={i}>• {f}</div>) : <span className="text-slate-400">—</span>}</td>
                    <td className="p-3 text-xs whitespace-nowrap"><div>{o.history.total} order(s)</div><div className="text-emerald-600">{o.history.delivered} delivered</div><div className="text-rose-600">{o.history.cancelled} cancelled</div></td>
                    <td className="p-3">{o.phone && (o.blacklisted
                      ? <button onClick={() => unblock(o.phone)} className="text-xs px-3 py-1.5 rounded-lg border whitespace-nowrap">Unblock</button>
                      : <button onClick={() => block(o.phone)} className="text-xs px-3 py-1.5 rounded-lg bg-rose-600 text-white flex items-center gap-1 whitespace-nowrap"><Ban className="w-3 h-3" /> Block</button>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "black" && (
          <div className="bg-white rounded-2xl border p-5">
            <div className="flex flex-wrap gap-2 mb-5">
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="07XXXXXXXX" className="border rounded-lg px-3 py-2 text-sm w-40" />
              <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason (e.g. refused parcel)" className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]" />
              <button onClick={() => block(form.phone, form.reason)} className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-bold flex items-center gap-1"><Ban className="w-4 h-4" /> Block number</button>
            </div>
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-500"><tr><th className="p-2 text-left">Phone</th><th className="p-2 text-left">Reason</th><th className="p-2 text-left">By</th><th className="p-2 text-left">Date</th><th></th></tr></thead>
              <tbody>
                {black.length === 0 && <tr><td colSpan="5" className="p-6 text-center text-slate-400">No blocked numbers yet</td></tr>}
                {black.map((b) => (
                  <tr key={b.phone} className="border-t">
                    <td className="p-2 font-semibold">{fmtPhone(b.phone)}</td><td className="p-2">{b.reason || "-"}</td><td className="p-2 text-xs text-slate-500">{b.created_by}</td>
                    <td className="p-2 text-xs text-slate-500">{new Date(b.created_at).toLocaleDateString()}</td>
                    <td className="p-2 text-right"><button onClick={() => unblock(b.phone)} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
