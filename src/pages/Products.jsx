import { useEffect, useState } from "react";
import API from "../api/config";
import Layout from "../components/Layout";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState([]); // {url, file, is_primary, id}

  const emptyForm = { name: "", description: "", price: "", sale_price: "", dropship_price: "", stock_qty: "", category_id: "", is_active: 1 };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [p, c] = await Promise.all([API.get("/products"), API.get("/categories")]);
      if (p.data.success) setProducts(p.data.products);
      if (c.data.success) setCategories(c.data.categories);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openAdd = () => {
    setEditing(null); setForm(emptyForm); setImages([]); setMsg(""); setShowModal(true);
  };

  const openEdit = async (p) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description || "", price: p.price, sale_price: p.sale_price || "", dropship_price: p.dropship_price || "", stock_qty: p.stock_qty, category_id: p.category_id, is_active: p.is_active });
    setMsg("");
    try {
      const res = await API.get(`/products/${p.id}/images`);
      if (res.data.success) {
        setImages(res.data.images.map(img => ({ id: img.id, url: `https://nagnail.lk/images/${img.image_url}`, filename: img.image_url, is_primary: img.is_primary, file: null })));
      } else {
        setImages(p.image_url ? [{ id: null, url: `https://nagnail.lk/images/${p.image_url}`, filename: p.image_url, is_primary: 1, file: null }] : []);
      }
    } catch { setImages([]); }
    setShowModal(true);
  };

  const handleImgAdd = (e) => {
    const files = Array.from(e.target.files);
    const newImgs = files.map((file, i) => ({
      id: null, url: URL.createObjectURL(file), filename: null,
      is_primary: images.length === 0 && i === 0 ? 1 : 0, file
    }));
    setImages(prev => [...prev, ...newImgs]);
    e.target.value = "";
  };

  const removeImg = (idx) => {
    setImages(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      if (updated.length > 0 && !updated.find(i => i.is_primary)) updated[0].is_primary = 1;
      return updated;
    });
  };

  const setPrimary = (idx) => {
    setImages(prev => prev.map((img, i) => ({ ...img, is_primary: i === idx ? 1 : 0 })));
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.stock_qty || !form.category_id)
      return setMsg("Name, price, stock and category are required");
    setSaving(true);
    try {
      // Upload new image files
      const uploaded = await Promise.all(images.map(async (img) => {
        if (img.file) {
          const fd = new FormData();
          fd.append("image", img.file);
          const res = await API.post("/products/upload-image", fd, { headers: { "Content-Type": "multipart/form-data" } });
          return { ...img, filename: res.data.filename };
        }
        return img;
      }));

      const primaryImg = uploaded.find(i => i.is_primary) || uploaded[0];
      const payload = {
        ...form,
        image_url: primaryImg?.filename || null,
        sale_price: form.sale_price || null,
        dropship_price: form.dropship_price || null,
      };

      let productId = editing?.id;
      if (editing) {
        await API.put(`/products/${editing.id}`, payload);
      } else {
        const res = await API.post("/products", payload);
        productId = res.data.id || res.data.product_id || res.data.product?.id;
      }

      // Save all images
      await API.post(`/products/${productId}/images`, {
        images: uploaded.map(img => ({ filename: img.filename, is_primary: img.is_primary, id: img.id }))
      });

      setMsg(editing ? "Product updated!" : "Product added!");
      setShowModal(false);
      fetchAll();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) { setMsg(err.response?.data?.error || "Save failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this product?")) return;
    try {
      await API.delete(`/products/${id}`);
      setMsg("Product deleted!"); fetchAll(); setTimeout(() => setMsg(""), 3000);
    } catch (err) { console.error(err); }
  };

  const toggleActive = async (p) => {
    try { await API.put(`/products/${p.id}`, { ...p, is_active: p.is_active ? 0 : 1 }); fetchAll(); }
    catch (err) { console.error(err); }
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-800">Products</h2>
          <p className="text-gray-500 text-sm mt-1">{products.length} total products</p>
        </div>
        <button onClick={openAdd} className="bg-[#16a34a] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#15803d]">+ Add Product</button>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">✅ {msg}</div>}

      <input type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search products..."
        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#16a34a] text-sm mb-6" />

      {loading ? (
        <div className="text-center py-20"><div className="animate-spin w-10 h-10 border-4 border-[#16a34a] border-t-transparent rounded-full mx-auto"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div key={p.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden border ${p.is_active ? "border-gray-100" : "border-red-100 opacity-60"}`}>
              <div className="h-44 bg-gray-50 relative">
                <img src={`https://nagnail.lk/images/${p.image_url}`} alt={p.name}
                  className="w-full h-full object-cover"
                  onError={e => { e.target.src = "https://placehold.co/300x176?text=No+Image"; }} />
                <span className={`absolute top-2 left-2 text-xs font-bold px-2 py-1 rounded-full ${p.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {p.is_active ? "Active" : "Inactive"}
                </span>
                {p.image_count > 1 && (
                  <span className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs font-bold px-2 py-1 rounded-full">
                    📷 {p.image_count}
                  </span>
                )}
              </div>
              <div className="p-4">
                <p className="text-xs text-[#16a34a] font-semibold mb-1">{p.category_name}</p>
                <p className="font-bold text-gray-800 text-sm line-clamp-2 mb-3">{p.name}</p>
                <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                  <div className="bg-gray-50 rounded-lg p-2"><p className="text-xs text-gray-400">Price</p><p className="font-black text-gray-800 text-xs">LKR {parseFloat(p.price).toLocaleString()}</p></div>
                  <div className="bg-red-50 rounded-lg p-2"><p className="text-xs text-gray-400">Dropship</p><p className="font-black text-red-500 text-xs">{p.dropship_price ? `LKR ${parseFloat(p.dropship_price).toLocaleString()}` : "—"}</p></div>
                  <div className="bg-blue-50 rounded-lg p-2"><p className="text-xs text-gray-400">Stock</p><p className="font-black text-blue-600 text-xs">{p.stock_qty}</p></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(p)} className="flex-1 border-2 border-gray-200 text-gray-600 py-2 rounded-xl text-xs font-bold hover:border-[#16a34a] hover:text-[#16a34a]">✏️ Edit</button>
                  <button onClick={() => toggleActive(p)} className={`flex-1 border-2 py-2 rounded-xl text-xs font-bold ${p.is_active ? "border-yellow-300 text-yellow-600 hover:bg-yellow-50" : "border-green-300 text-green-600 hover:bg-green-50"}`}>
                    {p.is_active ? "🔒 Disable" : "✅ Enable"}
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="border-2 border-red-200 text-red-500 px-3 py-2 rounded-xl text-xs font-bold hover:bg-red-50">🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4 py-6 overflow-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 my-auto max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-gray-800 text-xl">{editing ? "Edit Product" : "Add New Product"}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            {msg && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">{msg}</div>}

            {/* Multi Image Upload */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Product Images <span className="text-gray-400 font-normal">(first = primary, click ⭐ to change)</span>
              </label>
              <div className="flex flex-wrap gap-3 mb-3">
                {images.map((img, idx) => (
                  <div key={idx} className={`relative w-24 h-24 rounded-xl overflow-hidden border-2 ${img.is_primary ? "border-[#16a34a]" : "border-gray-200"}`}>
                    <img src={img.url} className="w-full h-full object-cover" alt="" />
                    {img.is_primary && <span className="absolute top-1 left-1 bg-[#16a34a] text-white text-xs px-1 rounded">⭐</span>}
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 transition-all flex items-center justify-center gap-1 opacity-0 hover:opacity-100">
                      <button onClick={() => setPrimary(idx)} className="bg-yellow-400 text-white w-7 h-7 rounded-full text-xs font-bold">⭐</button>
                      <button onClick={() => removeImg(idx)} className="bg-red-500 text-white w-7 h-7 rounded-full text-xs font-bold">✕</button>
                    </div>
                  </div>
                ))}
                <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#16a34a] hover:bg-green-50 transition-all">
                  <span className="text-2xl">+</span>
                  <span className="text-xs text-gray-400 mt-1">Add Image</span>
                  <input type="file" accept="image/*" multiple onChange={handleImgAdd} className="hidden" />
                </label>
              </div>
              <p className="text-xs text-gray-400">Upload multiple images. Hover over image to set as primary or remove.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Product Name *</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="e.g. Red Rose Nail Polish"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#16a34a] text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="Product description..." rows={3}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#16a34a] text-sm resize-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Price (LKR) *</label>
                <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#16a34a] text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Sale Price (LKR)</label>
                <input type="number" value={form.sale_price} onChange={e => setForm({...form, sale_price: e.target.value})}
                  placeholder="Optional"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#16a34a] text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Dropship Price (LKR)</label>
                <input type="number" value={form.dropship_price} onChange={e => setForm({...form, dropship_price: e.target.value})}
                  placeholder="Base cost for dropshippers"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#16a34a] text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Stock Quantity *</label>
                <input type="number" value={form.stock_qty} onChange={e => setForm({...form, stock_qty: e.target.value})}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#16a34a] text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category *</label>
                <select value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#16a34a] text-sm bg-white">
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <select value={form.is_active} onChange={e => setForm({...form, is_active: parseInt(e.target.value)})}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#16a34a] text-sm bg-white">
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-bold text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-[#16a34a] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#15803d] disabled:opacity-50">
                {saving ? "Saving..." : editing ? "Update Product" : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
