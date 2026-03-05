import { useEffect, useState } from "react";
import API from "../api/config";
import Layout from "../components/Layout";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      const res = await API.get("/orders");
      if (res.data.success) setOrders(res.data.orders);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id, status) => {
    try {
      await API.put(`/orders/${id}/status`, { status });
      setMsg(`Order updated to ${status}!`);
      fetchOrders();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) { console.error(err); }
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    processing: "bg-purple-100 text-purple-700",
    shipped: "bg-orange-100 text-orange-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  const statuses = ["all","pending","confirmed","processing","shipped","delivered","cancelled"];
  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <Layout>
      <div className="mb-6">
        <h2 className="text-2xl font-black text-gray-800">NagNail Orders</h2>
        <p className="text-gray-500 text-sm mt-1">{orders.length} total orders</p>
      </div>
      {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">✅ {msg}</div>}
      <div className="flex gap-2 flex-wrap mb-6">
        {statuses.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${filter === s ? "bg-gray-900 text-white" : "bg-white border-2 border-gray-200 text-gray-600 hover:border-gray-400"}`}>
            {s} ({s === "all" ? orders.length : orders.filter((o) => o.status === s).length})
          </button>
        ))}
      </div>
      {loading ? (
        <div className="text-center py-20"><div className="animate-spin w-10 h-10 border-4 border-[#16a34a] border-t-transparent rounded-full mx-auto"></div></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400"><p className="text-4xl mb-2">🛒</p><p>No orders found</p></div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-gray-800 font-mono">{order.order_number}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusColors[order.status]}`}>{order.status.toUpperCase()}</span>
                  </div>
                  <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString("en-LK")}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-gray-800 text-lg">LKR {parseFloat(order.total_amount).toLocaleString()}</p>
                  <p className="text-xs text-gray-400">{order.payment_method} · {order.payment_status}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 mb-3 text-sm">
                <p className="font-bold text-gray-800">{order.full_name || order.user_name}</p>
                <p className="text-xs text-gray-500">{order.email}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {["confirmed","processing","shipped","delivered","cancelled"].map((s) => s !== order.status && (
                  <button key={s} onClick={() => updateStatus(order.id, s)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      s === "delivered" ? "bg-green-500 text-white hover:bg-green-600" :
                      s === "cancelled" ? "bg-red-500 text-white hover:bg-red-600" :
                      s === "shipped" ? "bg-orange-500 text-white hover:bg-orange-600" :
                      "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>
                    → {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
