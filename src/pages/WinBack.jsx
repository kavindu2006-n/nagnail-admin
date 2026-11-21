// NN-B4 Win-back page
import { useEffect, useState } from "react";
import API from "../api/config";
import Layout from "../components/Layout";
const Wrap = Layout; // NN-B4-WRAP

const card = { background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,.08)", marginBottom: 16 };
const btn = (c) => ({ background: c, color: "#fff", border: 0, borderRadius: 8, padding: "8px 14px", fontWeight: 600, cursor: "pointer" });
const th = { textAlign: "left", padding: "8px 6px", fontSize: 12, color: "#64748b", borderBottom: "1px solid #e2e8f0" };
const td = { padding: "8px 6px", fontSize: 13, borderBottom: "1px solid #f1f5f9", verticalAlign: "top" };
const fmt = (d) => d ? new Date(d).toLocaleString("en-GB", { timeZone: "Asia/Colombo", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

export default function WinBack() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("lead");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const load = () => API.get("/win-back/list").then(r => setData(r.data)).catch(e => setMsg("Load error: " + (e.response?.data?.error || e.message)));
  useEffect(() => { load(); }, []);
  const send = async (phones) => {
    const list = tab === "lead" ? data.leads : data.lapsed;
    const n = phones ? phones.length : Math.min(30, list.length);
    if (!n || !window.confirm(n + " දෙනෙකුට WhatsApp යවන්නද?")) return;
    setBusy(true); setMsg("");
    try { const r = await API.post("/win-back/send", { kind: tab, phones }); setMsg("✅ Queued " + r.data.queued + " (≈" + r.data.eta_seconds + "s, 4s gap)"); load(); }
    catch (e) { setMsg("❌ " + (e.response?.data?.error || e.message)); }
    setBusy(false);
  };
  const list = data ? (tab === "lead" ? data.leads : data.lapsed) : [];
  const st = data?.stats || {};
  return (
    <Wrap>
      <div style={{ padding: 24, maxWidth: 1100, fontFamily: "inherit" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>💬 Win-back</h1>
        <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>Checkout අතරමග නැවැත්තූ අය සහ දින {data?.days || 30}+ order නොකළ customers ට WhatsApp reminder. එක click එකකට max 30.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          {[["Abandoned checkouts", data?.leads.length], ["Lapsed customers", data?.lapsed.length], ["Sent (30d)", st.sent || 0], ["Failed (30d)", st.failed || 0], ["Queue", data?.queue || 0]].map(([k, v]) => (
            <div key={k} style={{ ...card, marginBottom: 0, minWidth: 150 }}><div style={{ fontSize: 12, color: "#64748b" }}>{k}</div><div style={{ fontSize: 22, fontWeight: 700 }}>{v ?? "…"}</div></div>
          ))}
        </div>
        <div style={card}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
            <button onClick={() => setTab("lead")} style={btn(tab === "lead" ? "#db2777" : "#94a3b8")}>🛒 Abandoned checkout</button>
            <button onClick={() => setTab("lapsed")} style={btn(tab === "lapsed" ? "#db2777" : "#94a3b8")}>⏳ Lapsed {data?.days || 30}d+</button>
            <div style={{ flex: 1 }} />
            <button onClick={load} style={btn("#475569")}>↻ Refresh</button>
            <button disabled={busy || !list.length} onClick={() => send()} style={{ ...btn("#16a34a"), opacity: busy || !list.length ? .5 : 1 }}>📤 Send to {Math.min(30, list.length)}</button>
          </div>
          {msg && <div style={{ marginBottom: 10, fontSize: 13 }}>{msg}</div>}
          {!data ? <div>Loading…</div> : !list.length ? <div style={{ color: "#94a3b8", padding: 24, textAlign: "center" }}>දැනට කවුරුත් නෑ 🎉</div> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>Name</th><th style={th}>Phone</th>{tab === "lead" ? <><th style={th}>Items</th><th style={th}>Total</th><th style={th}>Last seen</th></> : <><th style={th}>Orders</th><th style={th}>Last order</th><th style={th}>Days</th></>}<th style={th}></th></tr></thead>
                <tbody>{list.map(x => (
                  <tr key={x.phone}>
                    <td style={td}>{x.name || "-"}</td>
                    <td style={td}><a href={"https://wa.me/" + x.phone} target="_blank" rel="noreferrer">{x.phone}</a></td>
                    {tab === "lead" ? <>
                      <td style={td}>{(x.items || []).map(i => i.name + (i.qty > 1 ? " x" + i.qty : "")).join(", ") || "-"}</td>
                      <td style={td}>{x.total ? "LKR " + Math.round(x.total).toLocaleString() : "-"}</td>
                      <td style={td}>{fmt(x.updated_at)}</td>
                    </> : <>
                      <td style={td}>{x.orders}</td><td style={td}>{fmt(x.last_order)}</td><td style={td}>{x.days}</td>
                    </>}
                    <td style={td}><button disabled={busy} onClick={() => send([x.phone])} style={{ ...btn("#0ea5e9"), padding: "4px 10px", fontSize: 12 }}>Send</button></td>
                  </tr>))}
                </tbody>
              </table>
            </div>)}
        </div>
      </div>
    </Wrap>
  );
}
