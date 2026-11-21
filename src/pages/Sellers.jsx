import { useEffect, useState } from "react";
import API from "../api/config";
import Layout from "../components/Layout";

export default function Sellers() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState("sellers");
  const [pending, setPending] = useState([]);

  useEffect(() => { fetchSellers(); fetchPending(); }, []);

  const fetchPending = async () => {
    try {
      const res = await API.get("/seller-products/pending");
      if (res.data.success) setPending(res.data.products);
    } catch (err) { console.error(err); }
  };

  const approveProduct = async (id) => {
    try {
      await API.put(`/seller-products/${id}/approve`);
      setMsg("Product approved!");
      fetchPending();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) { console.error(err); }
  };

  const rejectProduct = async (id) => {
    if (!confirm("Reject and delete this product?")) return;
    try {
      await API.delete(`/seller-products/${id}/reject`);
      setMsg("Product rejected.");
      fetchPending();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) { console.error(err); }
  };

  const fetchSellers = async () => {
    try {
      const res = await API.get("/sellers");
      if (res.data.success) setSellers(res.data.sellers);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id, status) => {
    try {
      const res = await API.put(`/sellers/${id}/status`, { status });
      if (res.data.success) {
        setMsg(`Seller ${status} successfully!`);
        fetchSellers();
        setTimeout(() => setMsg(""), 3000);
      }
    } catch (err) { console.error(err); }
  };

  const toggleVerify = async (id, current) => {
    try {
      await API.put(`/sellers/${id}/verify`, { is_verified: !current });
      fetchSellers();
    } catch (err) { console.error(err); }
  };

  const updateCommission = async (id, commission_rate) => {
    try {
      await API.put(`/sellers/${id}/commission`, { commission_rate });
      setMsg("Commission updated!");
      fetchSellers();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) { console.error(err); }
  };

  const statuses = ["all", "pending", "active", "suspended"];
  const statusColors = {
    pending: "bg-yellow-100 text-yellow-700",
    active: "bg-green-100 text-green-700",
    suspended: "bg-gray-100 text-gray-700",
  };

  const filtered = sellers.filter(s => {
    const matchFilter = filter === "all" || s.status === filter;
    const matchSearch = !search ||
      s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.includes(search) ||
      s.shop_name?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <Layout>
      <div className="mb-6">
        <h2 className="text-2xl font-black text-gray-800">Sellers</h2>
        <p className="text-gray-500 text-sm mt-1">{sellers.length} marketplace sellers</p>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">✅ {msg}</div>}

      {/* Tab switcher */}
      <div className="flex gap-2 mb-5">
        <button onClick={() => setTab("sellers")}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab==="sellers" ? "bg-gray-900 text-white" : "bg-white border-2 border-gray-200 text-gray-600"}`}>
          Sellers ({sellers.length})
        </button>
        <button onClick={() => setTab("pending")}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab==="pending" ? "bg-gray-900 text-white" : "bg-white border-2 border-gray-200 text-gray-600"}`}>
          Pending Products {pending.length > 0 && <span className="ml-1 bg-amber-400 text-amber-900 px-1.5 rounded-full text-xs">{pending.length}</span>}
        </button>
      </div>

      {tab === "pending" && (
        <div>
          {pending.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-4xl mb-2">✅</p>
              <p>No products awaiting review</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map(p => (
                <div key={p.id} className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100 flex items-center gap-4">
                  <img src={p.image_url ? `https://nagnail.lk/images/${p.image_url}` : ""} alt=""
                    className="w-16 h-16 rounded-xl object-cover bg-gray-100 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-800 truncate">{p.name}</p>
                    <p className="text-sm text-gray-500">🏪 {p.shop_name} · {p.category_name || "No category"}</p>
                    <p className="text-sm font-bold text-[#16a34a]">LKR {Number(p.sale_price || p.price).toLocaleString()} · Stock: {p.stock_qty}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => approveProduct(p.id)}
                      className="bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-600">✅ Approve</button>
                    <button onClick={() => rejectProduct(p.id)}
                      className="bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-600">❌ Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "sellers" && (<>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label:"Total", value:sellers.length, color:"text-gray-800", bg:"bg-gray-50" },
          { label:"Pending Approval", value:sellers.filter(s=>s.status==="pending").length, color:"text-yellow-600", bg:"bg-yellow-50" },
          { label:"Active", value:sellers.filter(s=>s.status==="active").length, color:"text-green-600", bg:"bg-green-50" },
          { label:"Total Products", value:sellers.reduce((s,d)=>s+(d.product_count||0),0), color:"text-blue-600", bg:"bg-blue-50" },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-2xl p-4`}>
            <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
        placeholder="🔍 Search by name, email, phone, shop..."
        className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#16a34a] mb-4" />

      <div className="flex gap-2 flex-wrap mb-6">
        {statuses.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
              filter === s ? "bg-gray-900 text-white" : "bg-white border-2 border-gray-200 text-gray-600 hover:border-gray-400"
            }`}>
            {s} ({s === "all" ? sellers.length : sellers.filter((d) => d.status === s).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-[#16a34a] border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-2">🏪</p>
          <p>No sellers found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#16a34a] rounded-full flex items-center justify-center text-white font-black text-lg">
                    {s.shop_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-black text-gray-800 flex items-center gap-1.5">
                      {s.shop_name}
                      {s.is_verified ? <span className="text-blue-500 text-sm" title="Verified">✔️</span> : null}
                    </p>
                    <p className="text-sm text-gray-500">{s.full_name} · {s.email}</p>
                    {s.phone && <p className="text-xs text-gray-400">{s.phone}</p>}
                    <p className="text-xs text-gray-400 mt-1">Joined {new Date(s.joined_at).toLocaleDateString("en-LK")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusColors[s.status]}`}>
                    {s.status.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>📦 {s.product_count} products</span>
                    <span>🛒 {s.order_count} orders</span>
                    <span>💰 LKR {parseFloat(s.total_earnings || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {s.shop_description && <p className="text-sm text-gray-500 mt-3">{s.shop_description}</p>}

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3 flex-wrap">
                {s.phone && (
                  <a href={`https://wa.me/94${s.phone?.replace(/^0/,"")?.replace(/\D/,"")}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 bg-green-500 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-green-600">
                    💬 WhatsApp
                  </a>
                )}
                {s.status === "pending" && (
                  <>
                    <button onClick={() => updateStatus(s.id, "active")}
                      className="bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-600">
                      ✅ Approve
                    </button>
                    <button onClick={() => updateStatus(s.id, "suspended")}
                      className="bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-600">
                      ❌ Reject
                    </button>
                  </>
                )}
                {s.status === "active" && (
                  <button onClick={() => updateStatus(s.id, "suspended")}
                    className="bg-gray-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-600">
                    🔒 Suspend
                  </button>
                )}
                {s.status === "suspended" && (
                  <button onClick={() => updateStatus(s.id, "active")}
                    className="bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-600">
                    ✅ Re-Activate
                  </button>
                )}
                <button onClick={() => toggleVerify(s.id, s.is_verified)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold ${s.is_verified ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {s.is_verified ? "✔️ Verified" : "Verify"}
                </button>
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-bold text-gray-500">Commission %</label>
                  <input type="number" defaultValue={s.commission_rate} step="0.5" min="0" max="50"
                    onBlur={(e) => { if (parseFloat(e.target.value) !== parseFloat(s.commission_rate)) updateCommission(s.id, e.target.value); }}
                    className="w-20 border-2 border-gray-200 rounded-xl px-2 py-1.5 text-sm font-bold outline-none focus:border-[#16a34a]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </>)}
    </Layout>
  );
}
