import { useEffect, useState } from "react";
import API from "../api/config";
import Layout from "../components/Layout";

export default function Loyalty() {
  const [customers, setCustomers] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdjust, setShowAdjust] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [adjForm, setAdjForm] = useState({ points: "", reason: "" });
  const [msg, setMsg] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [c, s] = await Promise.all([
        API.get("/loyalty"),
        API.get("/loyalty-settings"),
      ]);
      if (c.data.success) setCustomers(c.data.customers);
      if (s.data.success) setSettings(s.data.settings);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAdjust = async () => {
    if (!adjForm.points || !showAdjust) return;
    try {
      await API.post(`/loyalty/${showAdjust.user_id}/adjust`, {
        points: parseInt(adjForm.points),
        reason: adjForm.reason || "Admin adjustment",
      });
      setMsg("Points adjusted!");
      setShowAdjust(null);
      setAdjForm({ points: "", reason: "" });
      load();
      setTimeout(() => setMsg(""), 2000);
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.error || err.message));
    }
  };

  const saveSettings = async () => {
    try {
      await API.put("/loyalty-settings", { settings });
      setMsg("Settings saved!");
      setShowSettings(false);
      setTimeout(() => setMsg(""), 2000);
    } catch (err) {
      setMsg("Error: " + err.message);
    }
  };

  const filtered = customers.filter(c =>
    !search ||
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const tierBadge = (t) => {
    const map = {
      bronze:   { bg: "bg-orange-100 text-orange-700", label: "🥉 Bronze" },
      silver:   { bg: "bg-gray-100 text-gray-700",     label: "🥈 Silver" },
      gold:     { bg: "bg-yellow-100 text-yellow-700", label: "🥇 Gold" },
      platinum: { bg: "bg-purple-100 text-purple-700", label: "💎 Platinum" },
    };
    const b = map[t] || map.bronze;
    return <span className={`${b.bg} px-2 py-1 rounded-full text-xs font-bold`}>{b.label}</span>;
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Loyalty Program</h1>
            <p className="text-gray-500 text-sm">Manage customer points, tiers and settings</p>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg font-medium"
          >
            ⚙️ Settings
          </button>
        </div>

        {msg && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">{msg}</div>}

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 border">
            <p className="text-xs text-gray-500 font-semibold">Total Customers</p>
            <p className="text-2xl font-black mt-1">{customers.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border">
            <p className="text-xs text-gray-500 font-semibold">Total Points Issued</p>
            <p className="text-2xl font-black mt-1">{customers.reduce((s, c) => s + (c.lifetime_earned || 0), 0).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border">
            <p className="text-xs text-gray-500 font-semibold">Active Points</p>
            <p className="text-2xl font-black mt-1 text-green-600">{customers.reduce((s, c) => s + (c.points_balance || 0), 0).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border">
            <p className="text-xs text-gray-500 font-semibold">VIP Customers</p>
            <p className="text-2xl font-black mt-1 text-purple-600">{customers.filter(c => c.tier === 'gold' || c.tier === 'platinum').length}</p>
          </div>
        </div>

        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 border rounded-lg mb-4"
        />

        {loading ? (
          <div className="text-center py-10">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No loyalty customers yet.</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Customer</th>
                  <th className="text-left p-3">Tier</th>
                  <th className="text-left p-3">Balance</th>
                  <th className="text-left p-3">Lifetime Earned</th>
                  <th className="text-left p-3">Total Spent</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.user_id} className="border-t hover:bg-gray-50">
                    <td className="p-3">
                      <p className="font-medium text-sm">{c.full_name}</p>
                      <p className="text-xs text-gray-500">{c.email}</p>
                    </td>
                    <td className="p-3">{tierBadge(c.tier)}</td>
                    <td className="p-3 font-bold text-green-600">{(c.points_balance || 0).toLocaleString()}</td>
                    <td className="p-3 text-sm">{(c.lifetime_earned || 0).toLocaleString()}</td>
                    <td className="p-3 text-sm">LKR {parseFloat(c.lifetime_spent || 0).toLocaleString()}</td>
                    <td className="p-3">
                      <button onClick={() => setShowAdjust(c)} className="text-blue-600 hover:underline text-sm">
                        Adjust Points
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Adjust modal */}
        {showAdjust && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Adjust Points — {showAdjust.full_name}</h2>
                <button onClick={() => setShowAdjust(null)} className="text-gray-500 text-2xl">×</button>
              </div>
              <p className="text-sm text-gray-600 mb-4">Current balance: <b>{showAdjust.points_balance || 0} points</b></p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Points (+ to add, - to subtract)</label>
                  <input
                    type="number"
                    value={adjForm.points}
                    onChange={(e) => setAdjForm({ ...adjForm, points: e.target.value })}
                    placeholder="e.g. 100 or -50"
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reason</label>
                  <input
                    type="text"
                    value={adjForm.reason}
                    onChange={(e) => setAdjForm({ ...adjForm, reason: e.target.value })}
                    placeholder="e.g. Birthday bonus"
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div className="flex gap-2 pt-3">
                  <button onClick={handleAdjust} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium">Apply</button>
                  <button onClick={() => setShowAdjust(null)} className="flex-1 bg-gray-200 py-2 rounded font-medium">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Loyalty Settings</h2>
                <button onClick={() => setShowSettings(false)} className="text-gray-500 text-2xl">×</button>
              </div>
              <div className="space-y-3">
                {[
                  { k: "points_per_lkr", l: "Points per LKR spent", h: "e.g. 0.01 = 1 point per LKR 100" },
                  { k: "redeem_rate", l: "Redeem rate (LKR per point)", h: "e.g. 1 = 1 point = LKR 1" },
                  { k: "min_redeem", l: "Minimum redemption", h: "e.g. 100 points" },
                  { k: "signup_bonus", l: "Signup bonus points", h: "" },
                  { k: "review_bonus", l: "Review bonus points", h: "" },
                  { k: "tier_silver_spend", l: "Silver tier requirement (LKR spent)", h: "" },
                  { k: "tier_gold_spend", l: "Gold tier requirement (LKR spent)", h: "" },
                  { k: "tier_platinum_spend", l: "Platinum tier requirement (LKR spent)", h: "" },
                ].map(f => (
                  <div key={f.k}>
                    <label className="block text-sm font-medium mb-1">{f.l}</label>
                    <input
                      type="text"
                      value={settings[f.k] || ""}
                      onChange={(e) => setSettings({ ...settings, [f.k]: e.target.value })}
                      className="w-full p-2 border rounded"
                    />
                    {f.h && <p className="text-xs text-gray-500 mt-1">{f.h}</p>}
                  </div>
                ))}
                <div className="flex gap-2 pt-3 border-t">
                  <button onClick={saveSettings} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded font-medium">Save Settings</button>
                  <button onClick={() => setShowSettings(false)} className="flex-1 bg-gray-200 py-2 rounded font-medium">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
