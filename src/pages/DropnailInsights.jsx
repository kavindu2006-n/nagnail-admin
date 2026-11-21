import { useEffect, useState } from "react";
import API from "../api/config";
import Layout from "../components/Layout";
import { Wallet, Trophy, RefreshCw, AlertTriangle, CheckCircle2, Loader2, Users } from "lucide-react";

const lkr = (n) => "LKR " + Number(n || 0).toLocaleString("en-LK", { maximumFractionDigits: 2 });

function WalletAudit() {
  const [rows, setRows] = useState(null);
  const [onlyBad, setOnlyBad] = useState(true);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(null);
  const load = () => API.get("/dropnail/wallet-audit").then((r) => setRows(r.data.rows || [])).catch((e) => setMsg(e.response?.data?.error || "Load failed"));
  useEffect(() => { load(); }, []);

  const fix = async (r, mode) => {
    const text = mode === "ledger"
      ? "Ledger එකට " + (r.diff > 0 ? "credit" : "debit") + " " + lkr(Math.abs(r.diff)) + " adjustment එකක් දාන්නද? (Balance එක " + lkr(r.wallet_balance) + " ම තියෙනවා)"
      : "Wallet balance එක " + lkr(r.wallet_balance) + " සිට " + lkr(r.ledger) + " ට වෙනස් කරන්නද?";
    if (!window.confirm(text)) return;
    const note = window.prompt("Note (optional) — ඇයි මේ වෙනස?", "") || "";
    setBusy(r.id + mode);
    try { const res = await API.post("/dropnail/wallet-audit/" + r.id + "/fix", { mode, note }); setMsg("#" + r.id + ": " + res.data.message); await load(); }
    catch (e) { setMsg(e.response?.data?.error || "Failed"); }
    setBusy(null);
  };

  if (!rows) return <div className="py-16 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin inline" /> {msg}</div>;
  const list = onlyBad ? rows.filter((r) => r.mismatch) : rows;
  const bad = rows.filter((r) => r.mismatch).length;

  return (
    <div className="space-y-4">
      <div className={"rounded-2xl p-4 border flex items-center gap-3 " + (bad ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-700")}>
        {bad ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
        <p className="text-sm font-semibold">{bad ? bad + " dropshipper(s) ගේ wallet balance එක transactions ledger එකට ගැලපෙන්නේ නෑ." : "ඔක්කොම wallets ledger එකට ගැලපෙනවා ✅"}</p>
        <label className="ml-auto text-xs font-bold flex items-center gap-2 text-slate-600"><input type="checkbox" checked={onlyBad} onChange={(e) => setOnlyBad(e.target.checked)} /> ගැලපෙන්නේ නැති අය විතරක්</label>
      </div>
      {msg ? <p className="text-sm font-semibold text-indigo-700 bg-indigo-50 rounded-xl px-4 py-2">{msg}</p> : null}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left p-3">Dropshipper</th><th className="text-right p-3">Wallet balance</th><th className="text-right p-3">Ledger</th>
              <th className="text-right p-3">Difference</th><th className="text-right p-3">Delivered profit</th><th className="text-right p-3">Paid out</th>
              <th className="text-right p-3">Pending payout</th><th className="p-3">Fix</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? <tr><td colSpan={8} className="p-8 text-center text-slate-400">කිසිම ගැටලුවක් නෑ</td></tr> : list.map((r) => (
              <tr key={r.id} className={"border-t border-slate-100 " + (r.mismatch ? "bg-rose-50/40" : "")}>
                <td className="p-3"><p className="font-semibold text-slate-800">#{r.id} {r.full_name}</p><p className="text-[11px] text-slate-400">{r.business_name || ""} · {r.delivered} delivered · {r.tier}</p></td>
                <td className="p-3 text-right font-mono font-bold">{lkr(r.wallet_balance)}</td>
                <td className="p-3 text-right font-mono">{lkr(r.ledger)}</td>
                <td className={"p-3 text-right font-mono font-bold " + (r.mismatch ? "text-rose-600" : "text-slate-400")}>{r.diff > 0 ? "+" : ""}{lkr(r.diff)}</td>
                <td className="p-3 text-right font-mono">{lkr(r.delivered_profit)}</td>
                <td className="p-3 text-right font-mono">{lkr(r.paid_out)}</td>
                <td className="p-3 text-right font-mono">{r.pending_payout ? lkr(r.pending_payout) : "-"}</td>
                <td className="p-3">
                  {r.mismatch ? (
                    <div className="flex flex-col gap-1 min-w-[170px]">
                      <button disabled={!!busy} onClick={() => fix(r, "ledger")} className="text-[11px] font-bold px-2 py-1.5 rounded-lg bg-indigo-600 text-white disabled:opacity-50">Balance හරි → ledger adjust</button>
                      <button disabled={!!busy} onClick={() => fix(r, "balance")} className="text-[11px] font-bold px-2 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 disabled:opacity-50">Ledger හරි → balance = {lkr(r.ledger)}</button>
                    </div>
                  ) : <span className="text-emerald-600 text-xs font-bold">OK</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">Ledger = wallet transactions වල එකතුව (credits − debits). "Delivered profit − Paid out" එකෙන් ඇත්තටම තියෙන්න ඕනෑ ගාණ අනුමාන කරන්න පුළුවන්.</p>
    </div>
  );
}

function Leaderboard() {
  const [scope, setScope] = useState("month");
  const [d, setD] = useState(null);
  const [sync, setSync] = useState("");
  const load = (s) => { setD(null); API.get("/dropnail/leaderboard?scope=" + s).then((r) => setD(r.data)).catch(() => setD({ rows: [], tiers: [] })); };
  useEffect(() => { load(scope); }, [scope]);
  const runSync = async () => {
    setSync("...");
    try { const r = await API.post("/dropnail/tier-sync"); setSync(r.data.changes.length ? r.data.changes.map((c) => "#" + c.id + " " + c.name + " → " + c.to).join(", ") : "Upgrade වෙන්න කවුරුත් නෑ"); load(scope); }
    catch (e) { setSync(e.response?.data?.error || "Failed"); }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {["month", "all"].map((s) => (
          <button key={s} onClick={() => setScope(s)} className={"px-3 py-1.5 rounded-lg text-sm font-bold " + (scope === s ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600")}>{s === "month" ? "This month" : "All time"}</button>
        ))}
        <button onClick={runSync} className="ml-auto px-3 py-1.5 rounded-lg text-sm font-bold bg-white border border-slate-200 text-slate-700 flex items-center gap-1.5"><RefreshCw className="w-4 h-4" /> Run tier sync now</button>
      </div>
      {sync ? <p className="text-sm text-indigo-700 bg-indigo-50 rounded-xl px-4 py-2">{sync}</p> : null}
      {d && d.tiers ? <p className="text-xs text-slate-500">Tiers (delivered orders → discount): {d.tiers.map((t) => t.label + " " + t.min + "+ → " + t.pct + "%").join(" · ")}. Auto tier කවදාවත් අඩු කරන්නේ නෑ.</p> : null}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="p-3 text-left">#</th><th className="p-3 text-left">Dropshipper</th><th className="p-3">Tier</th><th className="p-3 text-right">Delivered</th><th className="p-3 text-right">Profit paid to them</th></tr></thead>
          <tbody>
            {!d ? <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr> :
              d.rows.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-slate-400">Delivered orders නෑ</td></tr> :
              d.rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="p-3 font-bold text-slate-500">{r.rank}</td>
                  <td className="p-3"><span className="font-semibold text-slate-800">{r.full_name}</span> <span className="text-xs text-slate-400">{r.business_name || ""}</span></td>
                  <td className="p-3 text-center text-xs font-bold uppercase">{r.tier}</td>
                  <td className="p-3 text-right font-bold">{r.delivered}</td>
                  <td className="p-3 text-right font-mono">{lkr(r.profit)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Partners() {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState("all");
  const [sel, setSel] = useState({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => API.get("/dropnail/analytics").then((r) => setRows(r.data.rows || [])).catch((e) => setMsg(e.response?.data?.error || "Load failed"));
  useEffect(() => { load(); }, []);
  if (!rows) return <div className="py-16 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin inline" /> {msg}</div>;
  const counts = { all: rows.length, active: rows.filter((r) => !r.dormant && r.orders > 0).length, dormant: rows.filter((r) => r.dormant).length, risky: rows.filter((r) => r.risky).length, referrers: rows.filter((r) => r.referrals > 0).length };
  const list = rows.filter((r) => filter === "all" ? true : filter === "active" ? (!r.dormant && r.orders > 0) : filter === "dormant" ? r.dormant : filter === "risky" ? r.risky : r.referrals > 0);
  const recent = (r) => r.reactivated_at && (Date.now() - new Date(r.reactivated_at).getTime()) < 30 * 86400000;
  const selectable = list.filter((r) => r.dormant && r.has_phone && !recent(r));
  const selIds = Object.keys(sel).filter((k) => sel[k]).map(Number);
  const send = async () => {
    if (!selIds.length) return;
    if (!window.confirm(selIds.length + " දෙනෙකුට reactivation WhatsApp යවන්නද? (තත්පර 8 පරතරයකින්, එක පාරකට උපරිම 30)")) return;
    setBusy(true);
    try { const r = await API.post("/dropnail/reactivate", { ids: selIds.slice(0, 30) }); setMsg("Queued: " + r.data.sent + " · Skipped: " + r.data.skipped); setSel({}); load(); }
    catch (e) { setMsg(e.response?.data?.error || "Failed"); }
    setBusy(false);
  };
  const digest = async () => {
    try { const r = await API.post("/dropnail/digest-test"); setMsg("Digest preview sent to your WhatsApp (new: " + r.data.new_products + ", hot: " + r.data.hot_products + ")"); }
    catch (e) { setMsg(e.response?.data?.error || "Failed"); }
  };
  const tot = rows.reduce((a, r) => ({ o: a.o + r.orders, d: a.d + r.delivered, c: a.c + r.cancelled, p: a.p + r.profit, rv: a.rv + r.revenue }), { o: 0, d: 0, c: 0, p: 0, rv: 0 });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[["Partners", rows.length], ["Orders", tot.o], ["Delivered", tot.d], ["Cancel rate", (tot.d + tot.c) ? Math.round(tot.c / (tot.d + tot.c) * 100) + "%" : "-"], ["Revenue (delivered)", lkr(tot.rv)]].map(([k, v]) => (
          <div key={k} className="bg-white border border-slate-200 rounded-2xl p-4"><p className="text-[11px] uppercase font-bold text-slate-400">{k}</p><p className="text-xl font-extrabold text-slate-800 mt-1">{v}</p></div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {[["all", "All"], ["active", "Active"], ["dormant", "Dormant (30d+)"], ["risky", "High cancel"], ["referrers", "Referrers"]].map(([k, l]) => (
          <button key={k} onClick={() => { setFilter(k); setSel({}); }} className={"px-3 py-1.5 rounded-lg text-sm font-bold " + (filter === k ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600")}>{l} ({counts[k]})</button>
        ))}
        <button onClick={digest} className="ml-auto px-3 py-1.5 rounded-lg text-sm font-bold bg-white border border-slate-200 text-slate-700">📬 Digest preview to me</button>
        {filter === "dormant" && <button disabled={busy || !selIds.length} onClick={send} className="px-3 py-1.5 rounded-lg text-sm font-bold bg-emerald-600 text-white disabled:opacity-50">👋 Send reactivation ({selIds.length})</button>}
      </div>
      {msg ? <p className="text-sm text-indigo-700 bg-indigo-50 rounded-xl px-4 py-2">{msg}</p> : null}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr>
            {filter === "dormant" && <th className="p-3"><input type="checkbox" checked={selectable.length > 0 && selectable.slice(0, 30).every((r) => sel[r.id])} onChange={(e) => { const n = {}; if (e.target.checked) selectable.slice(0, 30).forEach((r) => { n[r.id] = true; }); setSel(n); }} /></th>}
            <th className="p-3 text-left">Partner</th><th className="p-3 text-right">Orders</th><th className="p-3 text-right">Delivered</th><th className="p-3 text-right">Cancelled</th>
            <th className="p-3 text-right">Cancel %</th><th className="p-3 text-right">Profit</th><th className="p-3 text-right">Last order</th><th className="p-3 text-left">Referral</th>
          </tr></thead>
          <tbody>
            {list.length === 0 ? <tr><td colSpan={9} className="p-8 text-center text-slate-400">කවුරුත් නෑ</td></tr> : list.map((r) => (
              <tr key={r.id} className={"border-t border-slate-100 " + (r.risky ? "bg-rose-50/50" : "")}>
                {filter === "dormant" && <td className="p-3"><input type="checkbox" disabled={!r.has_phone || recent(r)} checked={!!sel[r.id]} onChange={(e) => setSel({ ...sel, [r.id]: e.target.checked })} /></td>}
                <td className="p-3"><p className="font-semibold text-slate-800">#{r.id} {r.full_name}</p><p className="text-[11px] text-slate-400">{r.business_name || ""} · {r.tier} · {r.status}{recent(r) ? " · reactivation sent" : ""}{!r.has_phone ? " · no valid phone" : ""}</p></td>
                <td className="p-3 text-right font-bold">{r.orders}</td>
                <td className="p-3 text-right text-emerald-700 font-bold">{r.delivered}</td>
                <td className="p-3 text-right text-rose-600">{r.cancelled}{r.returns ? <span className="block text-[10px] font-bold">{r.returns} returned</span> : null}</td>
                <td className={"p-3 text-right font-bold " + (r.risky ? "text-rose-600" : "text-slate-600")}>{r.cancel_rate === null ? "-" : r.cancel_rate + "%"}</td>
                <td className="p-3 text-right font-mono">{lkr(r.profit)}</td>
                <td className="p-3 text-right text-xs">{r.days_since === null ? <span className="text-slate-400">never</span> : r.days_since + "d ago"}</td>
                <td className="p-3 text-xs">{r.referrer_name ? <span className="text-slate-500">by {r.referrer_name}</span> : null}{r.referrals ? <span className="block text-pink-600 font-bold">{r.referrals} invited · {lkr(r.ref_bonus)}</span> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">Dormant = approved, දින 30කට වඩා order එකක් නැති අය. Reactivation message එක එක්කෙනෙකුට දින 30කට එක පාරයි. High cancel = closed orders 3+ සහ 40%+ cancel. Digest එක ඔක්කොම partners ලට ස්වයංක්‍රීයව යන්නේ සඳුදා උදේ 10ට.</p>
    </div>
  );
}

export default function DropnailInsights() {
  const [tab, setTab] = useState("partners");
  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">DropNail Insights</h1>
          <p className="text-slate-500 text-sm">Partners analytics, wallet audit, tiers & leaderboard</p>
        </div>
        <div className="flex gap-2 border-b border-slate-200">
          <button onClick={() => setTab("partners")} className={"px-4 py-2 text-sm font-bold flex items-center gap-2 border-b-2 -mb-px " + (tab === "partners" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500")}><Users className="w-4 h-4" /> Partners</button>
          <button onClick={() => setTab("audit")} className={"px-4 py-2 text-sm font-bold flex items-center gap-2 border-b-2 -mb-px " + (tab === "audit" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500")}><Wallet className="w-4 h-4" /> Wallet Audit</button>
          <button onClick={() => setTab("lb")} className={"px-4 py-2 text-sm font-bold flex items-center gap-2 border-b-2 -mb-px " + (tab === "lb" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500")}><Trophy className="w-4 h-4" /> Leaderboard & Tiers</button>
        </div>
        {tab === "partners" ? <Partners /> : tab === "audit" ? <WalletAudit /> : <Leaderboard />}
      </div>
    </Layout>
  );
}
