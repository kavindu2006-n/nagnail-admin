import { useEffect, useState } from "react";
import API from "../api/config";
import Layout from "../components/Layout";

const lkr = (n) => "LKR " + Math.round(parseFloat(n) || 0).toLocaleString();
const RESP = {
  confirmed: ["Confirmed", "bg-emerald-50 text-emerald-700 border-emerald-200"],
  cancelled: ["Cancelled", "bg-rose-50 text-rose-700 border-rose-200"],
  late: ["Late reply", "bg-slate-50 text-slate-600 border-slate-200"],
  null: ["Waiting", "bg-amber-50 text-amber-700 border-amber-200"],
};

function Stat({ label, value, sub, color = "text-slate-900" }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-3xl font-black mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function WhatsAppCenter() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [phone, setPhone] = useState("");
  const [testMsg, setTestMsg] = useState("");

  const load = () => API.get("/wa-stats").then((r) => setD(r.data)).catch((e) => setErr(e.response?.data?.error || "Failed to load"));
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

  const sendTest = async () => {
    setTestMsg("Sending...");
    try {
      const r = await API.post("/wa-test", { phone });
      setTestMsg(r.data.success ? "✅ Sent - check WhatsApp" : "❌ " + (r.data.error || "Failed"));
    } catch (e) { setTestMsg("❌ " + (e.response?.data?.error || "Failed")); }
  };

  const v = Object.fromEntries((d?.verif || []).map((x) => [x.r, Number(x.n)]));
  const total = Object.values(v).reduce((a, b) => a + b, 0);
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0) + "%";
  const c = d?.cart || {};
  const maxDay = Math.max(1, ...(d?.daily || []).map((x) => Number(x.sent)));

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black text-slate-900">WhatsApp Center</h1>
            <p className="text-slate-500">Order verification, cart reminders and service health</p>
          </div>
          {d && (
            <span className={`px-4 py-2 rounded-full text-sm font-bold border ${d.service?.ready ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
              {d.service?.ready ? "🟢 WhatsApp Connected" : "🔴 WhatsApp Offline"}
            </span>
          )}
        </div>

        {err && <div className="p-4 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">{err}</div>}
        {d === null && err === "" && <p className="text-slate-400">Loading...</p>}

        {d && (
          <>
            <h2 className="font-black text-slate-800 text-lg">📦 COD Order Verification (30 days)</h2>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <Stat label="Messages sent" value={total} />
              <Stat label="Confirmed" value={v.confirmed || 0} sub={pct(v.confirmed || 0)} color="text-emerald-600" />
              <Stat label="Cancelled" value={v.cancelled || 0} sub={pct(v.cancelled || 0)} color="text-rose-600" />
              <Stat label="No reply (24h+)" value={v.no_reply || 0} sub={pct(v.no_reply || 0) + " - call these"} color="text-amber-600" />
              <Stat label="Waiting" value={v.waiting || 0} sub="sent < 24h ago" color="text-sky-600" />
            </div>

            {(d.daily || []).length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <p className="font-bold text-slate-700 mb-4">Last 14 days</p>
                <div className="flex items-end gap-2 h-40">
                  {d.daily.map((x) => (
                    <div key={x.d} className="flex-1 flex flex-col items-center justify-end h-full" title={`${x.sent} sent, ${x.confirmed} confirmed, ${x.cancelled} cancelled`}>
                      <div className="w-full flex flex-col justify-end rounded-t-lg overflow-hidden bg-slate-100" style={{ height: `${(x.sent / maxDay) * 100}%` }}>
                        <div className="bg-rose-400" style={{ height: `${(x.cancelled / x.sent) * 100}%` }} />
                        <div className="bg-emerald-500" style={{ height: `${(x.confirmed / x.sent) * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1">{new Date(x.d).getDate()}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 text-xs text-slate-500 mt-3">
                  <span>🟩 Confirmed</span><span>🟥 Cancelled</span><span>⬜ No reply</span>
                </div>
              </div>
            )}

            <h2 className="font-black text-slate-800 text-lg">🛒 Abandoned Cart Reminders</h2>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <Stat label="Sent today" value={`${c.today || 0}/${d.settings.cap}`} sub="daily limit" />
              <Stat label="Sent (30 days)" value={c.sent30 || 0} color="text-sky-600" />
              <Stat label="Recovered" value={c.recovered30 || 0} sub={(c.sent30 ? Math.round(((c.recovered30 || 0) / c.sent30) * 100) : 0) + "% recovery"} color="text-emerald-600" />
              <Stat label="Failed" value={c.failed30 || 0} color="text-rose-600" />
              <Stat label="Opted out (STOP)" value={d.optout || 0} color="text-slate-600" />
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm lg:col-span-2 overflow-x-auto">
                <p className="font-bold text-slate-700 mb-3">Recent verifications</p>
                {(d.recent || []).length === 0 ? <p className="text-sm text-slate-400">No messages yet</p> : (
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-slate-400 text-xs uppercase"><th className="py-2">Order</th><th>Phone</th><th>Total</th><th>Sent</th><th>Reply</th></tr></thead>
                    <tbody>
                      {d.recent.map((r) => {
                        const late = r.response === null && (Date.now() - new Date(r.sent_at)) > 864e5;
                        const [t, cls] = late ? ["No reply", "bg-orange-50 text-orange-700 border-orange-200"] : (RESP[r.response] || RESP.null);
                        return (
                          <tr key={r.order_number + r.sent_at} className="border-t border-slate-100">
                            <td className="py-2 font-bold text-slate-800">{r.order_number}</td>
                            <td><a className="text-indigo-600 hover:underline" href={`https://wa.me/${r.phone}`} target="_blank" rel="noreferrer">{r.phone}</a></td>
                            <td>{lkr(r.total_amount)}</td>
                            <td className="text-slate-500">{new Date(r.sent_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</td>
                            <td><span className={`text-xs font-bold px-2 py-1 rounded-full border ${cls}`}>{t}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <p className="font-bold text-slate-700 mb-3">⚙️ Automation settings</p>
                  <div className="text-sm space-y-2 text-slate-600">
                    <div className="flex justify-between"><span>Auto cart reminders</span><b className={d.settings.auto === "off" ? "text-rose-600" : "text-emerald-600"}>{d.settings.auto.toUpperCase()}</b></div>
                    <div className="flex justify-between"><span>Send after</span><b>{d.settings.hours} hours</b></div>
                    <div className="flex justify-between"><span>Daily limit</span><b>{d.settings.cap}</b></div>
                    <div className="flex justify-between"><span>Sending hours</span><b>{d.settings.window}</b></div>
                  </div>
                  <p className="text-xs text-slate-400 mt-3">Change in server/.env (WA_AUTO_ABANDONED, WA_ABANDONED_HOURS, WA_ABANDONED_DAILY_CAP)</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <p className="font-bold text-slate-700 mb-3">🧪 Send test message</p>
                  <div className="flex gap-2">
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XXXXXXXX" className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm" />
                    <button onClick={sendTest} className="bg-emerald-600 text-white px-4 rounded-xl text-sm font-bold hover:bg-emerald-700">Send</button>
                  </div>
                  {testMsg && <p className="text-sm mt-2">{testMsg}</p>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
