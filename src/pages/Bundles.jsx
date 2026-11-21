import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import API from "../api/config";

export default function Bundles() {
  const [products, setProducts] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMain, setSelectedMain] = useState(null);
  const [bundleProducts, setBundleProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [bundleSearch, setBundleSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { fetchProducts(); }, []);
  useEffect(() => { if (selectedMain) fetchBundles(selectedMain.id); }, [selectedMain]);

  const fetchProducts = async () => {
    try {
      const res = await fetch("https://nagnail.lk/api/products?limit=200");
      const data = await res.json();
      if (data.success) setProducts(data.products);
    } catch(err) { console.error(err); }
    setLoading(false);
  };

  const fetchBundles = async (productId) => {
    try {
      const res = await fetch(`https://nagnail.lk/api/products/${productId}/bundles`);
      const data = await res.json();
      if (data.success) setBundleProducts(data.bundles);
    } catch(err) { console.error(err); }
  };

  const handleAddBundle = async (bundleProduct) => {
    if (!selectedMain) return;
    if (bundleProducts.find(b => b.id === bundleProduct.id)) {
      setMsg({ type:"error", text:"This product is already in the bundle" }); return;
    }
    if (bundleProducts.length >= 4) {
      setMsg({ type:"error", text:"Maximum 4 bundle products allowed" }); return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("https://nagnail.lk/api/admin/bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ main_product_id: selectedMain.id, bundle_product_id: bundleProduct.id, sort_order: bundleProducts.length })
      });
      const data = await res.json();
      if (data.success) { fetchBundles(selectedMain.id); setMsg({ type:"success", text:"Bundle product added!" }); }
      else setMsg({ type:"error", text: data.error });
    } catch(err) { setMsg({ type:"error", text: err.message }); }
    setSaving(false);
  };

  const handleRemoveBundle = async (bundleProductId) => {
    if (!selectedMain) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      await fetch(`https://nagnail.lk/api/admin/bundles/${selectedMain.id}/${bundleProductId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      fetchBundles(selectedMain.id);
      setMsg({ type:"success", text:"Bundle product removed!" });
    } catch(err) { setMsg({ type:"error", text: err.message }); }
    setSaving(false);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) && p.id !== selectedMain?.id
  );

  const filteredBundleOptions = products.filter(p =>
    p.name.toLowerCase().includes(bundleSearch.toLowerCase()) &&
    p.id !== selectedMain?.id &&
    !bundleProducts.find(b => b.id === p.id)
  );

  return (
    <Layout>
      <div className="mb-6">
        <h2 className="text-2xl font-black text-gray-800">🛍️ Bundle Management</h2>
        <p className="text-gray-500 text-sm mt-1">Set up "Frequently Bought Together" for each product</p>
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-semibold ${msg.type==="success"?"bg-green-50 text-green-700 border border-green-200":"bg-red-50 text-red-600 border border-red-200"}`}>
          {msg.text} <button onClick={() => setMsg(null)} className="ml-2 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Select main product */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-black text-gray-800 mb-4">1. Select Main Product</h3>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#16a34a] mb-3" />
          {loading ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {filteredProducts.slice(0,30).map(p => (
                <div key={p.id} onClick={() => { setSelectedMain(p); setBundleProducts([]); setMsg(null); setBundleSearch(""); }}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${selectedMain?.id===p.id?"bg-green-50 border-2 border-[#16a34a]":"hover:bg-gray-50 border-2 border-transparent"}`}>
                  <img src={`https://nagnail.lk/images/${p.image_url}`} alt={p.name}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    onError={e=>e.target.src="https://placehold.co/40x40?text=?"} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">LKR {parseFloat(p.sale_price||p.price).toLocaleString()}</p>
                  </div>
                  {selectedMain?.id===p.id && <span className="text-[#16a34a] font-bold flex-shrink-0">✓</span>}
                </div>
              ))}
              {filteredProducts.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No products found</p>}
            </div>
          )}
        </div>

        {/* Right: Manage bundles */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          {!selectedMain ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">👈</p>
              <p className="font-semibold">Select a product on the left</p>
              <p className="text-sm mt-1">to manage its bundle products</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-5 p-3 bg-green-50 rounded-xl">
                <img src={`https://nagnail.lk/images/${selectedMain.image_url}`} alt={selectedMain.name}
                  className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                  onError={e=>e.target.src="https://placehold.co/48x48?text=?"} />
                <div>
                  <p className="font-black text-gray-800 text-sm">{selectedMain.name}</p>
                  <p className="text-xs text-gray-500">Main product · {bundleProducts.length}/4 bundle items</p>
                </div>
              </div>

              {/* Current bundles */}
              <h4 className="font-bold text-gray-700 text-sm mb-3">2. Current Bundle Products</h4>
              {bundleProducts.length === 0 ? (
                <p className="text-sm text-gray-400 bg-gray-50 rounded-xl p-4 text-center mb-4">No bundle products yet — add some below</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {bundleProducts.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                      <span className="text-xs text-gray-400 w-5 text-center">{i+1}</span>
                      <img src={`https://nagnail.lk/images/${p.image_url}`} alt={p.name}
                        className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                        onError={e=>e.target.src="https://placehold.co/36x36?text=?"} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400">LKR {parseFloat(p.sale_price||p.price).toLocaleString()}</p>
                      </div>
                      <button onClick={() => handleRemoveBundle(p.id)} disabled={saving}
                        className="text-red-400 hover:text-red-600 text-xs font-bold px-2 py-1 rounded-lg hover:bg-red-50">✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add bundle products */}
              {bundleProducts.length < 4 && (
                <>
                  <h4 className="font-bold text-gray-700 text-sm mb-3">3. Add Bundle Products</h4>
                  <input type="text" value={bundleSearch} onChange={e => setBundleSearch(e.target.value)}
                    placeholder="Search products to add..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#16a34a] mb-3" />
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {filteredBundleOptions.slice(0,10).map(p => (
                      <div key={p.id} className="flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded-xl cursor-pointer group">
                        <img src={`https://nagnail.lk/images/${p.image_url}`} alt={p.name}
                          className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                          onError={e=>e.target.src="https://placehold.co/36x36?text=?"} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{p.name}</p>
                          <p className="text-xs text-gray-400">LKR {parseFloat(p.sale_price||p.price).toLocaleString()}</p>
                        </div>
                        <button onClick={() => handleAddBundle(p)} disabled={saving}
                          className="text-xs font-bold bg-[#16a34a] text-white px-3 py-1.5 rounded-lg hover:bg-[#15803d] opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50 flex-shrink-0">
                          + Add
                        </button>
                      </div>
                    ))}
                    {filteredBundleOptions.length === 0 && bundleSearch && (
                      <p className="text-center text-gray-400 text-sm py-3">No products found</p>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
