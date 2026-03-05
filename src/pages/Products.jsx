import { useEffect, useState } from "react";
import API from "../api/config";
import Layout from "../components/Layout";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      const res = await API.get("/products");
      if (res.data.success) setProducts(res.data.products);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <div className="mb-6">
        <h2 className="text-2xl font-black text-gray-800">Products</h2>
        <p className="text-gray-500 text-sm mt-1">{products.length} total products</p>
      </div>
      <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="Search products..."
        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#16a34a] text-sm mb-6" />
      {loading ? (
        <div className="text-center py-20"><div className="animate-spin w-10 h-10 border-4 border-[#16a34a] border-t-transparent rounded-full mx-auto"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
              <div className="h-40 bg-gray-50">
                <img src={`https://nagnail.lk/images/${p.image_url}`} alt={p.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = "https://placehold.co/300x160?text=No+Image"; }} />
              </div>
              <div className="p-4">
                <p className="text-xs text-[#16a34a] font-semibold mb-1">{p.category_name}</p>
                <p className="font-bold text-gray-800 text-sm line-clamp-2 mb-2">{p.name}</p>
                <div className="flex items-center justify-between">
                  <p className="font-black text-[#16a34a]">LKR {parseFloat(p.sale_price || p.price).toLocaleString()}</p>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${p.stock_qty > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {p.stock_qty > 0 ? `Stock: ${p.stock_qty}` : "Out of Stock"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
