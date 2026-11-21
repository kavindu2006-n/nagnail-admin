import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import API from "../api/config";

export default function FlashSales() {
  const [flashSales, setFlashSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ product_id:"", sale_price:"", original_price:"", stock_limit:10, ends_at:"" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [fsRes, pRes] = await Promise.all([
        API.get("/flash-sales"),
        API.get("https://nagnail.lk/api/products?limit=100&sort=newest")
      ]);
      if (fsRes.data.success) setFlashSales(fsRes.data.flash_sales);
      if (pRes.data.success) setProducts(pRes.data.products);
    } catch(err) { console.error(err); }
    setLoading(false);
  };

  const handleProductChange = (e) => {
    const product = products.find(p => p.id === parseInt(e.target.value));
    if (product) {
      setForm(f => ({
        ...f,
        product_id: product.id,
        original_price: parseFloat(product.sale_price || product.price),
        sale_price: Math.round(parseFloat(product.sale_price || product.price) * 0.7),
      }));
    }
  };

  const handleCreate = async () => {
    if (!form.product_id || !form.sale_price || !form.ends_at) {
      setMsg({ type:"error", text:"Please fill all required fields" }); return;
    }
    setSaving(true); setMsg(null);
    try {
      const res = await API.post("/flash-sales", form);
      if (res.data.success) { setMsg({ type:"success", text:"Flash sale created! ✅" }); setShowForm(false); setForm({ product_id:"", sale_price:"", original_price:"", stock_limit:10, ends_at:"" }); fetchAll(); }
    } catch(err) { setMsg({ type:"error", text: err.response?.data?.error || "Failed to create" }); }
    setSaving(false);
  };

  const handleToggle = async (fs) => {
    try {
      await API.put(`/flash-sales/${fs.id}`, { is_active: fs.is_active ? 0 : 1, ends_at: fs.ends_at, stock_limit: fs.stock_limit });
      fetchAll();
    } catch(err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this flash sale?")) return;
    try { await API.delete(`/flash-sales/${id}`); fetchAll(); } catch(err) { console.error(err); }
  };

  const handleExtend = async (fs) => {
    const newEnd = new Date(new Date(fs.ends_at).getTime() + 24*60*60*1000).toISOString().slice(0,16);
    try {
      await API.put(`/flash-sales/${fs.id}`, { is_active: 1, ends_at: newEnd, stock_limit: fs.stock_limit });
      fetchAll();
    } catch(err) { console.error(err); }
  };

  const isExpired = (fs) => new Date(fs.ends_at) < new Date();
  const isActive = (fs) => fs.is_active && !isExpired(fs);

  // Default ends_at to 24h from now
  const defaultEndsAt = () => {
    const d = new Date(); d.setHours(d.getHours() + 24);
    return d.toISOString().slice(0,16);
  };

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-800">⚡ Flash Sales</h2>
          <p className="text-gray-500 text-sm mt-1">{flashSales.filter(isActive).length} active · {flashSales.length} total</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setForm(f => ({...f, ends_at: defaultEndsAt()})); }}
          className="bg-[#16a34a] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#15803d]">
          + Create Flash Sale
        </button>
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-semibold ${msg.type==="success"?"bg-green-50 text-green-700 border border-green-200":"bg-red-50 text-red-600 border border-red-200"}`}>
          {msg.text}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <h3 className="font-black text-gray-800 mb-4">Create New Flash Sale</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Product *</label>
              <select value={form.product_id} onChange={handleProductChange}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#16a34a] bg-white">
                <option value="">Select a product...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name.slice(0,60)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Original Price (LKR)</label>
              <input type="number" value={form.original_price} onChange={e => setForm(f => ({...f, original_price: e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#16a34a]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Flash Sale Price (LKR) *</label>
              <input type="number" value={form.sale_price} onChange={e => setForm(f => ({...f, sale_price: e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#16a34a]" />
              {form.original_price && form.sale_price && (
                <p className="text-xs text-green-600 mt-1 font-semibold">
                  {Math.round(((form.original_price - form.sale_price) / form.original_price) * 100)}% discount
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Stock Limit *</label>
              <input type="number" value={form.stock_limit} onChange={e => setForm(f => ({...f, stock_limit: e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#16a34a]" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Ends At *</label>
              <input type="datetime-local" value={form.ends_at} onChange={e => setForm(f => ({...f, ends_at: e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#16a34a]" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleCreate} disabled={saving}
              className="bg-[#16a34a] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#15803d] disabled:opacity-50">
              {saving ? "Creating..." : "⚡ Create Flash Sale"}
            </button>
            <button onClick={() => setShowForm(false)} className="border border-gray-200 text-gray-600 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Flash Sales List */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-gray-100 h-24 rounded-2xl animate-pulse" />)}</div>
      ) : flashSales.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
          <p className="text-5xl mb-3">⚡</p>
          <p className="font-bold text-gray-600 mb-2">No flash sales yet</p>
          <p className="text-gray-400 text-sm">Create your first flash sale to boost conversions</p>
        </div>
      ) : (
        <div className="space-y-3">
          {flashSales.map(fs => {
            const active = isActive(fs);
            const expired = isExpired(fs);
            const discount = Math.round(((fs.original_price - fs.sale_price) / fs.original_price) * 100);
            const stockPct = ((fs.stock_limit - fs.sold_count) / fs.stock_limit) * 100;
            const timeLeft = new Date(fs.ends_at) - new Date();
            const hoursLeft = Math.max(0, Math.floor(timeLeft / 3600000));
            return (
              <div key={fs.id} className={`bg-white rounded-2xl shadow-sm border-2 p-4 flex items-center gap-4 flex-wrap ${active?"border-green-200":expired?"border-red-100":"border-gray-100"}`}>
                <img src={`https://nagnail.lk/images/${fs.image_url}`} alt={fs.product_name}
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                  onError={e=>e.target.style.display='none'} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm truncate">{fs.product_name}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-lg font-black text-[#16a34a]">LKR {parseFloat(fs.sale_price).toLocaleString()}</span>
                    <span className="text-sm text-gray-400 line-through">LKR {parseFloat(fs.original_price).toLocaleString()}</span>
                    <span className="bg-red-100 text-red-600 text-xs font-black px-2 py-0.5 rounded-full">-{discount}%</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{width:`${100-stockPct}%`}} />
                      </div>
                      <span className="text-xs text-gray-500">{fs.sold_count}/{fs.stock_limit} sold</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${active?"bg-green-100 text-green-700":expired?"bg-red-100 text-red-600":"bg-gray-100 text-gray-500"}`}>
                      {active ? `⏰ ${hoursLeft}h left` : expired ? "❌ Expired" : "⏸ Paused"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleToggle(fs)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${active?"border-yellow-200 text-yellow-600 hover:bg-yellow-50":"border-green-200 text-green-600 hover:bg-green-50"}`}>
                    {active ? "⏸ Pause" : "▶ Activate"}
                  </button>
                  {(expired || !active) && (
                    <button onClick={() => handleExtend(fs)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-200 text-blue-600 hover:bg-blue-50">
                      +24h
                    </button>
                  )}
                  <button onClick={() => handleDelete(fs.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-red-200 text-red-500 hover:bg-red-50">
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
