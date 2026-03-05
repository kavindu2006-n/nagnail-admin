import { useEffect, useState } from "react";
import API from "../api/config";
import Layout from "../components/Layout";

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const res = await API.get("/stats");
      if (res.data.success) setStats(res.data.stats);
    } catch (err) { console.error(err); }
  };

  const cards = stats ? [
    { label: "Total Orders", value: stats.total_orders, emoji: "🛒", color: "bg-blue-50 border-blue-200" },
    { label: "Total Revenue", value: `LKR ${parseFloat(stats.total_revenue || 0).toLocaleString()}`, emoji: "💰", color: "bg-green-50 border-green-200" },
    { label: "Dropshippers", value: stats.total_dropshippers, emoji: "👥", color: "bg-purple-50 border-purple-200" },
    { label: "Pending Approval", value: stats.pending_dropshippers, emoji: "⏳", color: "bg-yellow-50 border-yellow-200" },
    { label: "Dropship Orders", value: stats.total_dropship_orders, emoji: "📦", color: "bg-orange-50 border-orange-200" },
    { label: "Customers", value: stats.total_customers, emoji: "👤", color: "bg-pink-50 border-pink-200" },
  ] : [];

  return (
    <Layout>
      <div className="mb-6">
        <h2 className="text-2xl font-black text-gray-800">Dashboard</h2>
        <p className="text-gray-500 text-sm mt-1">Overview of NagNail.lk & DropNail</p>
      </div>
      {!stats ? (
        <div className="text-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-[#16a34a] border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {cards.map((c) => (
            <div key={c.label} className={`bg-white border-2 ${c.color} rounded-2xl p-5`}>
              <p className="text-3xl mb-3">{c.emoji}</p>
              <p className="text-2xl font-black text-gray-800">{c.value}</p>
              <p className="text-sm text-gray-500 mt-1">{c.label}</p>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
