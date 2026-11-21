import { useEffect, useState } from "react";
import API from "../api/config";
import Layout from "../components/Layout";

export default function LowStock() {
  const [products, setProducts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("low");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [lowRes, alertRes] = await Promise.all([
        API.get("/low-stock"),
        API.get("/back-in-stock")
      ]);
      if (lowRes.data.success) setProducts(lowRes.data.products);
      if (alertRes.data.success) setAlerts(alertRes.data.alerts);
    } catch(err) { console.error(err); }
    setLoading(false);
  };

  const markNotified = async (id) => {
    try {
      await API.put(`/back-in-stock/${id}/notify`);
      fetchData();
    } catch(err) { console.error(err); }
  };

  const sendWhatsApp = (alert) => {
    const msg = `Hi! Great news — ${alert.product_name} is back in stock on NagNail.lk! 🎉\n\nShop now: https://nagnail.lk/product/${alert.product_id}`;
    const phone = alert.phone?.replace(/^0/,"")?.replace(/\D/,"");
    if (phone) window.open(`https://wa.me/94${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    else if (alert.email) navigator.clipboard.writeText(msg);
  };

  return (
    <Layout>
      <div className="mb-5">
        <h2 className="text-2xl font-black text-gray-800">📦 Stock Management</h2>
        <p className="text-gray-500 text-sm mt-1">Low stock alerts and back-in-stock requests</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label:"Out of Stock", value:products.filter(p=>p.stock_qty===0).length, color:"text-red-600", bg:"bg-red-50" },
          { label:"Low Stock (≤5)", value:products.filter(p=>p.stock_qty>0&&p.stock_qty<=5).length, color:"text-orange-600", bg:"bg-orange-50" },
          { label:"Low Stock (≤10)", value:products.filter(p=>p.stock_qty>5&&p.stock_qty<=10).length, color:"text-yellow-600", bg:"bg-yellow-50" },
          { label:"Back-in-Stock Requests", value:alerts.filter(a=>!a.notified).length, color:"text-blue-600", bg:"bg-blue-50" },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-2xl p-4`}>
            <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={()=>setActiveTab("low")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab==="low"?"bg-gray-900 text-white":"bg-white border-2 border-gray-200 text-gray-600"}`}>
          ⚠️ Low Stock ({products.length})
        </button>
        <button onClick={()=>setActiveTab("alerts")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab==="alerts"?"bg-gray-900 text-white":"bg-white border-2 border-gray-200 text-gray-600"}`}>
          🔔 Back-in-Stock Requests ({alerts.filter(a=>!a.notified).length})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20"><div className="animate-spin w-10 h-10 border-4 border-[#16a34a] border-t-transparent rounded-full mx-auto"></div></div>
      ) : activeTab === "low" ? (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          {products.length === 0 ? (
            <div className="text-center py-12 text-gray-400"><p className="text-3xl mb-2">✅</p><p>All products have healthy stock levels!</p></div>
          ) : (
            <div className="divide-y divide-gray-50">
              {products.map(p => (
                <div key={p.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50">
                  <img src={`https://nagnail.lk/images/${p.image_url}`} alt=""
                    className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                    onError={e=>e.target.style.display="none"} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.category_name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-sm font-black px-3 py-1 rounded-full ${
                      p.stock_qty===0?"bg-red-100 text-red-600":
                      p.stock_qty<=5?"bg-orange-100 text-orange-600":
                      "bg-yellow-100 text-yellow-600"}`}>
                      {p.stock_qty===0?"Out of Stock":`${p.stock_qty} left`}
                    </span>
                  </div>
                  <a href={`https://nagnail.lk/product/${p.id}`} target="_blank" rel="noreferrer"
                    className="text-xs text-[#16a34a] font-bold hover:underline flex-shrink-0">View →</a>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-gray-400"><p className="text-3xl mb-2">🔔</p><p>No back-in-stock requests yet</p></div>
          ) : alerts.map(a => (
            <div key={a.id} className={`bg-white rounded-2xl shadow-sm border-2 p-4 ${a.notified?"border-gray-100 opacity-60":"border-blue-100"}`}>
              <div className="flex items-center gap-3 flex-wrap">
                <img src={`https://nagnail.lk/images/${a.image_url}`} alt=""
                  className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                  onError={e=>e.target.style.display="none"} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{a.product_name}</p>
                  <p className="text-xs text-gray-500">{a.email || a.phone || "Anonymous"} · {new Date(a.created_at).toLocaleDateString("en-LK")}</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.stock_qty>0?"bg-green-100 text-green-700":"bg-red-100 text-red-600"}`}>
                    {a.stock_qty>0?"Back in Stock!":"Still Out of Stock"}
                  </span>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {!a.notified && (a.phone||a.email) && (
                    <button onClick={()=>sendWhatsApp(a)}
                      className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-600">
                      💬 Notify
                    </button>
                  )}
                  {!a.notified && (
                    <button onClick={()=>markNotified(a.id)}
                      className="border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-50">
                      ✓ Mark Notified
                    </button>
                  )}
                  {a.notified && <span className="text-xs text-gray-400 font-semibold">✓ Notified</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
