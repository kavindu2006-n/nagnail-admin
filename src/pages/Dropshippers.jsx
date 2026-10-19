import { useEffect, useState } from "react";
import API from "../api/config";
import Layout from "../components/Layout";

export default function Dropshippers() {
  const [dropshippers, setDropshippers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
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
        setMsg(`Dropshipper ${status} successfully!`);
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
  const statusColors = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    suspended: "bg-gray-100 text-gray-700",
  };

  const filtered = filter === "all" ? dropshippers : dropshippers.filter((d) => d.status === filter);

  return (
    <Layout>
      <div className="mb-6">
        <h2 className="text-2xl font-black text-gray-800">Dropshippers</h2>
        <p className="text-gray-500 text-sm mt-1">{dropshippers.length} total dropshippers</p>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">✅ {msg}</div>}
      {errMsg && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">⚠️ {errMsg}</div>}

      <div className="flex gap-2 flex-wrap mb-6">
        {statuses.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
              filter === s ? "bg-gray-900 text-white" : "bg-white border-2 border-gray-200 text-gray-600 hover:border-gray-400"
            }`}>
            {s} ({s === "all" ? dropshippers.length : dropshippers.filter((d) => d.status === s).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-[#16a34a] border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-2">👥</p>
          <p>No dropshippers found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((d) => (
            <div key={d.id} className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#16a34a] rounded-full flex items-center justify-center text-white font-black text-lg">
                    {d.full_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-black text-gray-800">{d.full_name}</p>
                    <p className="text-sm text-gray-500">{d.email} · {d.phone}</p>
                    {d.business_name && <p className="text-xs text-[#16a34a] font-semibold">{d.business_name}</p>}
                    <p className="text-xs text-gray-400 mt-1">Joined {new Date(d.created_at).toLocaleDateString("en-LK")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusColors[d.status]}`}>
                    {d.status.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>📦 {d.total_orders} orders</span>
                    <span>💰 LKR {parseFloat(d.wallet_balance || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3 flex-wrap">
                {d.status === "pending" && (
                  <>
                    <button onClick={() => updateStatus(d.id, "approved")}
                      className="bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-600">
                      ✅ Approve
                    </button>
                    <button onClick={() => updateStatus(d.id, "rejected")}
                      className="bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-600">
                      ❌ Reject
                    </button>
                  </>
                )}
                {d.status === "approved" && (
                  <button onClick={() => updateStatus(d.id, "suspended")}
                    className="bg-gray-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-600">
                    🔒 Suspend
                  </button>
                )}
                {(d.status === "rejected" || d.status === "suspended") && (
                  <button onClick={() => updateStatus(d.id, "approved")}
                    className="bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-600">
                    ✅ Re-Approve
                  </button>
                )}
                <select value={d.tier} onChange={(e) => updateTier(d.id, e.target.value)}
                  className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#16a34a]">
                  <option value="bronze">🥉 Bronze</option>
                  <option value="silver">🥈 Silver</option>
                  <option value="gold">🥇 Gold</option>
                  <option value="platinum">💎 Platinum</option>
                </select>

                {delConfirm === d.id ? (
                  <div className="ml-auto flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-red-500">Delete permanently? They can register again.</span>
                    <button disabled={delBusy} onClick={() => deleteDropshipper(d.id)}
                      className="bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-50">
                      {delBusy ? "Deleting..." : "Yes, delete"}
                    </button>
                    <button onClick={() => setDelConfirm(null)}
                      className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-200">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button onClick={() => { setDelConfirm(d.id); setMsg(""); setErrMsg(""); }}
                    className="ml-auto bg-white border-2 border-red-200 text-red-500 px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-50 hover:border-red-400 transition-all">
                    🗑️ Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
