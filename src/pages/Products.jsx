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
  const [images, setImages] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [activeTab, setActiveTab] = useState("basic");

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
    setEditing(null); setForm(emptyForm); setImages([]); setAttributes([]); setMsg(""); setActiveTab("basic"); setShowModal(true);
  };

  const openEdit = async (p) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description || "", price: p.price, sale_price: p.sale_price || "", dropship_price: p.dropship_price || "", stock_qty: p.stock_qty, category_id: p.category_id, is_active: p.is_active });
    setMsg(""); setActiveTab("basic");
    try {
      const [imgRes, attrRes] = await Promise.all([
        API.get(`/products/${p.id}/images`),
        API.get(`/products/${p.id}/attributes`)
      ]);
      if (imgRes.data.success) setImages(imgRes.data.images.map(img => ({ id: img.id, url: `https://nagnail.lk/images/${img.image_url}`, filename: img.image_url, is_primary: img.is_primary, file: null })));
      else setImages(p.image_url ? [{ id: null, url: `https://nagnail.lk/images/${p.image_url}`, filename: p.image_url, is_primary: 1, file: null }] : []);
      if (attrRes.data.success) setAttributes(attrRes.data.attributes);
      else setAttributes([]);
    } catch { setImages([]); setAttributes([]); }
    setShowModal(true);
  };

  const handleImgAdd = (e) => {
    const files = Array.from(e.target.files);
    const newImgs = files.map((file, i) => ({ id: null, url: URL.createObjectURL(file), filename: null, is_primary: images.length === 0 && i === 0 ? 1 : 0, file }));
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

  const setPrimary = (idx) => setImages(prev => prev.map((img, i) => ({ ...img, is_primary: i === idx ? 1 : 0 })));

  // Attributes
  const addAttribute = () => setAttributes(prev => [...prev, { id: null, name: "", display_type: "button", values: [] }]);
  const removeAttribute = (idx) => setAttributes(prev => prev.filter((_, i) => i !== idx));
  const updateAttribute = (idx, field, val) => setAttributes(prev => prev.map((a, i) => i === idx ? { ...a, [field]: val } : a));
  const addValue = (attrIdx) => setAttributes(prev => prev.map((a, i) => i === attrIdx ? { ...a, values: [...a.values, { id: null, value: "", color_hex: "", price_modifier: 0, stock_qty: 0, is_available: 1 }] } : a));
  const removeValue = (attrIdx, valIdx) => setAttributes(prev => prev.map((a, i) => i === attrIdx ? { ...a, values: a.values.filter((_, vi) => vi !== valIdx) } : a));
  const updateValue = (attrIdx, valIdx, field, val) => setAttributes(prev => prev.map((a, i) => i === attrIdx ? { ...a, values: a.values.map((v, vi) => vi === valIdx ? { ...v, [field]: val } : v) } : a));

  const handleSave = async () => {
    if (!form.name || !form.price || !form.stock_qty || !form.category_id) return setMsg("Name, price, stock and category are required");
    setSaving(true);
    try {
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
      const payload = { ...form, image_url: primaryImg?.filename || null, sale_price: form.sale_price || null, dropship_price: form.dropship_price || null };

      let productId = editing?.id;
      if (editing) {
        await API.put(`/products/${editing.id}`, payload);
      } else {
        const res = await API.post("/products", payload);
        productId = res.data.id || res.data.product_id;
      }

      // Save images
      if (uploaded.length > 0) {
        await API.post(`/products/${productId}/images`, { images: uploaded.map(img => ({ filename: img.filename, is_primary: img.is_primary, id: img.id })) });
      }

      // Save attributes
      await API.post(`/products/${productId}/attributes`, { attributes });

      setMsg(editing ? "Product updated!" : "Product added!");
      setShowModal(false);
      fetchAll();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) { setMsg(err.response?.data?.error || "Save failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this product?")) return;
    try { await API.delete(`/products/${id}`); setMsg("Product deleted!"); fetchAll(); setTimeout(() => setMsg(""), 3000); }
    catch (err) { console.error(err); }
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

      <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#16a34a] text-sm mb-6" />

      {loading ? (
        <div className="text-center py-20"><div className="animate-spin w-10 h-10 border-4 border-[#16a34a] border-t-transparent rounded-full mx-auto"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div key={p.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden border ${p.is_active ? "border-gray-100" : "border-red-100 opacity-60"}`}>
              <div className="h-44 bg-gray-50 relative">
                <img src={`https://nagnail.lk/images/${p.image_url}`} alt={p.name} className="w-full h-full object-cover"
                  onError={e => { e.target.src = "https://placehold.co/300x176?text=No+Image"; }} />
                <span className={`absolute top-2 left-2 text-xs font-bold px-2 py-1 rounded-full ${p.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {p.is_active ? "Active" : "Inactive"}
                </span>
                {p.image_count > 1 && <span className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs font-bold px-2 py-1 rounded-full">📷 {p.image_count}</span>}
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-auto max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="font-black text-gray-800 text-xl">{editing ? "Edit Product" : "Add New Product"}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            {/* Tabs */}
            <div className="flex border-b px-6">
              {["basic", "images", "variants"].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-sm font-bold capitalize border-b-2 -mb-px transition-all ${activeTab === tab ? "border-[#16a34a] text-[#16a34a]" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
                  {tab === "basic" ? "📋 Basic Info" : tab === "images" ? "📷 Images" : "🎨 Variants"}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-6">
              {msg && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">{msg}</div>}

              {/* Basic Tab */}
              {activeTab === "basic" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Product Name *</label>
                    <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Red Rose Nail Polish"
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#16a34a] text-sm" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                    <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} placeholder="Product description..."
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#16a34a] text-sm resize-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Price (LKR) *</label>
                    <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#16a34a] text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Sale Price (LKR)</label>
                    <input type="number" value={form.sale_price} onChange={e => setForm({...form, sale_price: e.target.value})} placeholder="Optional"
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#16a34a] text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Dropship Price (LKR)</label>
                    <input type="number" value={form.dropship_price} onChange={e => setForm({...form, dropship_price: e.target.value})} placeholder="Base cost for dropshippers"
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
              )}

              {/* Images Tab */}
              {activeTab === "images" && (
                <div>
                  <p className="text-sm text-gray-500 mb-4">Upload multiple images. Hover to set primary or remove.</p>
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
                </div>
              )}

              {/* Variants Tab */}
              {activeTab === "variants" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-bold text-gray-700">Product Variants</p>
                      <p className="text-xs text-gray-400">Add options like Color, Size, Voltage etc.</p>
                    </div>
                    <button onClick={addAttribute} className="bg-[#16a34a] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#15803d]">
                      + Add Option
                    </button>
                  </div>

                  {attributes.length === 0 && (
                    <div className="text-center py-10 bg-gray-50 rounded-xl">
                      <p className="text-3xl mb-2">🎨</p>
                      <p className="text-sm text-gray-500">No variants yet. Click "Add Option" to add Color, Size, etc.</p>
                    </div>
                  )}

                  {attributes.map((attr, attrIdx) => (
                    <div key={attrIdx} className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
                      <div className="flex gap-3 mb-3">
                        <input type="text" value={attr.name} onChange={e => updateAttribute(attrIdx, "name", e.target.value)}
                          placeholder="Option name (e.g. Color, Size, Voltage)"
                          className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#16a34a] text-sm" />
                        <select value={attr.display_type} onChange={e => updateAttribute(attrIdx, "display_type", e.target.value)}
                          className="border-2 border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#16a34a] text-sm bg-white">
                          <option value="button">Button</option>
                          <option value="color">Color Swatch</option>
                          <option value="dropdown">Dropdown</option>
                        </select>
                        <button onClick={() => removeAttribute(attrIdx)} className="border-2 border-red-200 text-red-500 px-3 py-2 rounded-xl text-xs hover:bg-red-50">🗑️</button>
                      </div>

                      {/* Values */}
                      <div className="space-y-2 mb-3">
                        {attr.values.map((val, valIdx) => (
                          <div key={valIdx} className="flex gap-2 items-center bg-white rounded-lg p-2 border border-gray-100">
                            <input type="text" value={val.value} onChange={e => updateValue(attrIdx, valIdx, "value", e.target.value)}
                              placeholder="Value (e.g. Red, XL, 220V)"
                              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#16a34a] text-xs" />
                            {attr.display_type === "color" && (
                              <input type="color" value={val.color_hex || "#000000"} onChange={e => updateValue(attrIdx, valIdx, "color_hex", e.target.value)}
                                className="w-8 h-8 rounded cursor-pointer border border-gray-200" title="Pick color" />
                            )}
                            <input type="number" value={val.price_modifier} onChange={e => updateValue(attrIdx, valIdx, "price_modifier", e.target.value)}
                              placeholder="+/- Price" className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#16a34a]" />
                            <input type="number" value={val.stock_qty} onChange={e => updateValue(attrIdx, valIdx, "stock_qty", e.target.value)}
                              placeholder="Stock" className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#16a34a]" />
                            <button onClick={() => updateValue(attrIdx, valIdx, "is_available", val.is_available ? 0 : 1)}
                              className={`text-xs px-2 py-1.5 rounded-lg border font-bold ${val.is_available ? "border-green-200 text-green-600" : "border-red-200 text-red-500"}`}>
                              {val.is_available ? "✅" : "❌"}
                            </button>
                            <button onClick={() => removeValue(attrIdx, valIdx)} className="text-red-400 hover:text-red-600 text-xs font-bold px-1">✕</button>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => addValue(attrIdx)} className="text-[#16a34a] text-xs font-bold hover:underline">+ Add Value</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t">
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
