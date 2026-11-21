import { useEffect, useState } from "react";
import API from "../api/config";
import Layout from "../components/Layout";

export default function AbandonedCarts() {
  const [carts, setCarts] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("live"); // live or history
  const [hours, setHours] = useState(6);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(null); // userId being sent
  const [sendingAll, setSendingAll] = useState(false);

  useEffect(() => { load(); }, [hours]);

  const load = async () => {
    setLoading(true);
    try {
      const [c, r, s] = await Promise.all([
        API.get(`/abandoned-carts?hours=${hours}`),
        API.get("/abandoned-cart-reminders"),
        API.get("/abandoned-cart-stats"),
      ]);
      if (c.data.success) setCarts(c.data.carts);
      if (r.data.success) setReminders(r.data.reminders);
      if (s.data.success) setStats(s.data.stats);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const sendOne = async (userId) => {
    setSending(userId);
    try {
      const res = await API.post(`/abandoned-carts/${userId}/send`);
      setMsg(res.data.success ? "✅ WhatsApp reminder sent!" : `❌ ${res.data.error}`);
      load();
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.error || err.message));
    } finally {
      setSending(null);
      setTimeout(() => setMsg(""), 3000);
    }
  };

  const sendAll = async () => {
    if (!confirm(`Send WhatsApp reminders to all ${carts.length} customers with abandoned carts?`)) return;
    setSendingAll(true);
    try {
      const res = await API.post("/abandoned-carts/send-all", { hours });
      setMsg(`✅ Sent ${res.data.sent}/${res.data.total} reminders${res.data.failed ? ` (${res.data.failed} failed)` : ''}`);
      load();
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.error || err.message));
    } finally {
      setSendingAll(false);
      setTimeout(() => setMsg(""), 5000);
    }
  };

  const statusBadge = (s) => {
    const m = {
      pending:   { bg: "bg-yellow-100 text-yellow-700", l: "Pending" },
      sent:      { bg: "bg-blue-100 text-blue-700",     l: "Sent" },
      failed:    { bg: "bg-red-100 text-red-700",       l: "Failed" },
      recovered: { bg: "bg-green-100 text-green-700",   l: "🎉 Recovered" },
    };
    const x = m[s] || m.pending;
    return <span className={`${x.bg} px-2 py-1 rounded-full text-xs font-bold`}>{x.l}</span>;
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Abandoned Carts</h1>
            <p className="text-gray-500 text-sm">Recover lost sales with WhatsApp reminders</p>
          </div>
        </div>

        {msg && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">{msg}</div>}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 border">
            <p className="text-xs text-gray-500 font-semibold">Reminders (30 days)</p>
            <p className="text-2xl font-black mt-1">{stats.total_reminders || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border">
            <p className="text-xs text-gray-500 font-semibold">Successfully Sent</p>
            <p className="text-2xl font-black mt-1 text-blue-600">{stats.sent || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border">
            <p className="text-xs text-gray-500 font-semibold">Recovered Orders</p>
            <p className="text-2xl font-black mt-1 text-green-600">{stats.recovered || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border">
            <p className="text-xs text-gray-500 font-semibold">Recovery Rate</p>
            <p className="text-2xl font-black mt-1 text-purple-600">{stats.recovery_rate || 0}%</p>
            <p className="text-xs text-gray-500">LKR {parseFloat(stats.recovered_revenue || 0).toLocaleString()} recovered</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b">
          <button onClick={() => setTab("live")}
            className={`px-4 py-2 font-bold text-sm border-b-2 transition-all ${tab === "live" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500"}`}>
            🛒 Live Abandoned Carts ({carts.length})
          </button>
          <button onClick={() => setTab("history")}
            className={`px-4 py-2 font-bold text-sm border-b-2 transition-all ${tab === "history" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500"}`}>
            📜 Reminder History ({reminders.length})
          </button>
        </div>

        {tab === "live" && (
          <>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <label className="text-sm font-semibold text-gray-700">Show carts abandoned for:</label>
              <select value={hours} onChange={e => setHours(parseInt(e.target.value))}
                className="p-2 border rounded bg-white text-sm">
                <option value={1}>1+ hour</option>
                <option value={6}>6+ hours</option>
                <option value={24}>1+ day</option>
                <option value={72}>3+ days</option>
                <option value={168}>1+ week</option>
              </select>
              {carts.length > 0 && (
                <button onClick={sendAll} disabled={sendingAll}
                  className="ml-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50">
                  {sendingAll ? "Sending..." : `📱 Send WhatsApp to all (${carts.length})`}
                </button>
              )}
            </div>

            {loading ? (
              <div className="text-center py-10">Loading...</div>
            ) : carts.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <p className="text-4xl mb-2">🎉</p>
                <p>No abandoned carts! All customers are converting.</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3">Customer</th>
                      <th className="text-left p-3">Contact</th>
                      <th className="text-left p-3">Items</th>
                      <th className="text-left p-3">Cart Value</th>
                      <th className="text-left p-3">Last Activity</th>
                      <th className="text-left p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carts.map(c => (
                      <tr key={c.user_id} className="border-t hover:bg-gray-50">
                        <td className="p-3">
                          <p className="font-medium text-sm">{c.full_name}</p>
                        </td>
                        <td className="p-3 text-sm">
                          <p>{c.phone}</p>
                          <p className="text-xs text-gray-500">{c.email}</p>
                        </td>
                        <td className="p-3 text-sm">
                          <p className="font-semibold">{c.item_count} items</p>
                          <p className="text-xs text-gray-500 truncate max-w-xs">
                            {c.items?.slice(0, 2).map(i => i.name).join(", ")}
                            {c.items?.length > 2 && ` +${c.items.length - 2} more`}
                          </p>
                        </td>
                        <td className="p-3 text-sm font-bold text-green-600">LKR {parseFloat(c.cart_total).toLocaleString()}</td>
                        <td className="p-3 text-xs text-gray-500">{new Date(c.last_activity).toLocaleString()}</td>
                        <td className="p-3">
                          <button onClick={() => sendOne(c.user_id)} disabled={sending === c.user_id}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-bold disabled:opacity-50">
                            {sending === c.user_id ? "Sending..." : "📱 Send"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === "history" && (
          <>
            {loading ? (
              <div className="text-center py-10">Loading...</div>
            ) : reminders.length === 0 ? (
              <div className="text-center py-10 text-gray-500">No reminders sent yet.</div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3">Customer</th>
                      <th className="text-left p-3">Cart Value</th>
                      <th className="text-left p-3">Channel</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Sent At</th>
                      <th className="text-left p-3">Recovered At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reminders.map(r => (
                      <tr key={r.id} className="border-t hover:bg-gray-50">
                        <td className="p-3">
                          <p className="font-medium text-sm">{r.full_name}</p>
                          <p className="text-xs text-gray-500">{r.phone}</p>
                        </td>
                        <td className="p-3 text-sm font-bold">LKR {parseFloat(r.cart_total).toLocaleString()}</td>
                        <td className="p-3 text-xs">{r.channel}</td>
                        <td className="p-3">{statusBadge(r.status)}</td>
                        <td className="p-3 text-xs text-gray-500">
                          {r.sent_at ? new Date(r.sent_at).toLocaleString() : "—"}
                        </td>
                        <td className="p-3 text-xs text-gray-500">
                          {r.recovered_at ? new Date(r.recovered_at).toLocaleString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
