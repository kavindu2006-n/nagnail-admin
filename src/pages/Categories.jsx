import { useEffect, useState } from "react";
import API from "../api/config";
import Layout from "../components/Layout";

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [saving, setSaving] = useState(false);
  const emptyForm = { name: "", name_si: "", slug: "", is_active: 1 };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      const res = await API.get("/categories");
      if (res.data.success) setCategories(res.data.categories);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openAdd = () => { setEditing(null); setForm(emptyForm); setMsg({ text: "", type: "" }); setShowModal(true); };
  const openEdit = (cat) => {
    setEditing(cat);
    setForm({ name: cat.name, name_si: cat.name_si || "", slug: cat.slug || "", is_active: cat.is_active });
    setMsg({ text: "", type: "" });
    setShowModal(true);
  };

  const handleNameChange = (val) => {
    setForm(f => ({ ...f, name: val, slug: editing ? f.slug : slugify(val) }));
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) return setMsg({ text: "Name and slug are required", type: "error" });
    setSaving(true);
    try {
      if (editing) {
        await API.put(`/categories/${editing.id}`, form);
        setMsg({ text: "Category updated!", type: "success" });
      } else {
        await API.post("/categories", form);
        setMsg({ text: "Category added!", type: "success" });
      }
      setShowModal(false);
      fetchCategories();
      setTimeout(() => setMsg({ text: "", type: "" }), 3000);
    } catch (err) { setMsg({ text: err.response?.data?.error || "Save failed", type: "error" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this category? Products in this category will be unaffected.")) return;
    try {
      await API.delete(`/categories/${id}`);
      setMsg({ text: "Category deleted!", type: "success" });
      fetchCategories();
      setTimeout(() => setMsg({ text: "", type: "" }), 3000);
    } catch (err) { setMsg({ text: err.response?.data?.error || "Delete failed", type: "error" }); }
  };

  const toggleActive = async (cat) => {
    try {
      await API.put(`/categories/${cat.id}`, { ...cat, is_active: cat.is_active ? 0 : 1 });
      fetchCategories();
    } catch (err) { console.error(err); }
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-800">Categories</h2>
          <p className="text-gray-500 text-sm mt-1">{categories.length} total categories</p>
        </div>
        <button onClick={openAdd} className="bg-[#16a34a] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#15803d]">
          + Add Category
        </button>
      </div>

      {msg.text && (
        <div className={`px-4 py-3 rounded-xl mb-4 text-sm ${msg.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-600"}`}>
          {msg.type === "success" ? "✅" : "❌"} {msg.text}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20"><div className="animate-spin w-10 h-10 border-4 border-[#16a34a] border-t-transparent rounded-full mx-auto"></div></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase">#</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase">Name</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase">Sinhala</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase">Slug</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase">Products</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categories.map((cat, idx) => (
                <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-400">{idx + 1}</td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-800 text-sm">{cat.name}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{cat.name_si || "—"}</td>
                  <td className="px-6 py-4">
                    <span className="bg-gray-100 text-gray-600 text-xs font-mono px-2 py-1 rounded-lg">{cat.slug}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded-lg">{cat.product_count || 0} products</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${cat.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {cat.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(cat)} className="border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:border-[#16a34a] hover:text-[#16a34a]">
                        ✏️ Edit
                      </button>
                      <button onClick={() => toggleActive(cat)} className={`border px-3 py-1.5 rounded-lg text-xs font-bold ${cat.is_active ? "border-yellow-200 text-yellow-600 hover:bg-yellow-50" : "border-green-200 text-green-600 hover:bg-green-50"}`}>
                        {cat.is_active ? "🔒" : "✅"}
                      </button>
                      <button onClick={() => handleDelete(cat.id)} className="border border-red-200 text-red-500 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-50">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-gray-800 text-xl">{editing ? "Edit Category" : "Add Category"}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            {msg.text && (
              <div className={`px-4 py-3 rounded-xl mb-4 text-sm ${msg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                {msg.text}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category Name (English) *</label>
                <input type="text" value={form.name} onChange={e => handleNameChange(e.target.value)}
                  placeholder="e.g. Nail Polish"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#16a34a] text-sm" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category Name (Sinhala)</label>
                <input type="text" value={form.name_si} onChange={e => setForm({...form, name_si: e.target.value})}
                  placeholder="e.g. නේල් පොලිෂ්"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#16a34a] text-sm" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Slug *</label>
                <input type="text" value={form.slug} onChange={e => setForm({...form, slug: slugify(e.target.value)})}
                  placeholder="e.g. nail-polish"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#16a34a] text-sm font-mono" />
                <p className="text-xs text-gray-400 mt-1">Auto-generated from name. Used in URLs.</p>
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

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-bold text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-[#16a34a] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#15803d] disabled:opacity-50">
                {saving ? "Saving..." : editing ? "Update" : "Add Category"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
