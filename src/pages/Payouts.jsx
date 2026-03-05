import { useEffect, useState } from "react";
import API from "../api/config";
import Layout from "../components/Layout";

export default function Payouts() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchPayouts(); }, []);

  const fetchPayouts = async () => {
    try {
      const res = await API.get("/payouts");
      if (res.data.success) setPayouts(res.data.payouts);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const updatePayout = async (id, status) => {
    try {
      const res = await API.put(`/payouts/${id}/status`, { status });
      if (res.data.success) {
        setMsg(`Payout marked as ${status}!`);
        fetchPayouts();
        setTimeout(() => setMsg(""), 3000);
      }
    } catch (err) { console.error(err); }
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-700",
    paid: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };

  return (
    <Layout>
      <div className="mb-6">
        <h2 className="text-2xl font-black text-gray-800">Payout Requests</h2>
        <p className="text-gray-500 text-sm mt-1">{payouts.filter((p) => p.status === "pending").length} pending payouts</p>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">✅ {msg}</div>}

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-[#16a34a] border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : payouts.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-2">💰</p>
          <p>No payout requests yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payouts.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                <div>
                  <p className="font-black text-gray-800">{p.dropshipper_name}</p>
                  <p className="text-sm text-gray-500">{p.dropshipper_email}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(p.requested_at).toLocaleDateString("en-LK")}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-[#16a34a]">LKR {parseFloat(p.amount).toLocaleString()}</p>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusColors[p.status]}`}>
                    {p.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 mb-4 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400 font-semibold">BANK</p>
                  <p className="font-bold text-gray-800">{p.bank_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-semibold">ACCOUNT NO</p>
                  <p className="font-bold text-gray-800">{p.account_number}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-semibold">ACCOUNT NAME</p>
                  <p className="font-bold text-gray-800">{p.account_name}</p>
                </div>
              </div>
              {p.status === "pending" && (
                <div className="flex gap-3">
                  <button onClick={() => updatePayout(p.id, "paid")}
                    className="flex-1 bg-green-500 text-white py-2 rounded-xl text-sm font-bold hover:bg-green-600">
                    ✅ Mark as Paid
                  </button>
                  <button onClick={() => updatePayout(p.id, "rejected")}
                    className="flex-1 bg-red-500 text-white py-2 rounded-xl text-sm font-bold hover:bg-red-600">
                    ❌ Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
