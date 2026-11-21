import { useEffect, useState } from "react";
import API from "../api/config";
import Layout from "../components/Layout";
import { 
  FolderTree, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Layers, 
  Lock, 
  Unlock, 
  Tag, 
  Globe,
  Loader2 
} from "lucide-react";

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
  const [search, setSearch] = useState("");
  const emptyForm = { name: "", name_si: "", slug: "", is_active: 1, image_url: "" };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      const res = await API.get("/categories");
      if (res.data.success) setCategories(res.data.categories);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openAdd = () => { 
    setEditing(null); 
    setForm(emptyForm); 
    setMsg({ text: "", type: "" }); 
    setShowModal(true); 
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setForm({ 
      name: cat.name, 
      name_si: cat.name_si || "", 
      slug: cat.slug || "", 
      is_active: cat.is_active, 
      image_url: cat.image_url || "" 
    });
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
        setMsg({ text: "Category updated successfully!", type: "success" });
      } else {
        await API.post("/categories", form);
        setMsg({ text: "Category added successfully!", type: "success" });
      }
      setShowModal(false);
      fetchCategories();
      setTimeout(() => setMsg({ text: "", type: "" }), 3000);
    } catch (err) { 
      setMsg({ text: err.response?.data?.error || "Save failed", type: "error" }); 
    }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this category? Products in this category will be unaffected.")) return;
    try {
      await API.delete(`/categories/${id}`);
      setMsg({ text: "Category deleted successfully!", type: "success" });
      fetchCategories();
      setTimeout(() => setMsg({ text: "", type: "" }), 3000);
    } catch (err) { 
      setMsg({ text: err.response?.data?.error || "Delete failed", type: "error" }); 
    }
  };

  const toggleActive = async (cat) => {
    try {
      await API.put(`/categories/${cat.id}`, { ...cat, is_active: cat.is_active ? 0 : 1 });
      fetchCategories();
    } catch (err) { console.error(err); }
  };

  const filtered = categories.filter(c =>
    !search || 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-6 bg-slate-50 min-h-screen">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FolderTree className="w-7 h-7 text-indigo-600" /> Categories Directory
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">Organize product hierarchy, SEO slugs, and multi-language titles</p>
          </div>
          <button 
            onClick={openAdd} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Category
          </button>
        </div>

        {/* Feedback Alert Message */}
        {msg.text && (
          <div className={`px-4 py-3 rounded-xl mb-6 text-sm font-medium flex items-center gap-2 ${
            msg.type === "success" 
              ? "bg-emerald-50 border border-emerald-200 text-emerald-700" 
              : "bg-rose-50 border border-rose-200 text-rose-700"
          }`}>
            {msg.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
            {msg.text}
          </div>
        )}

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Categories</p>
              <p className="text-2xl font-extrabold text-slate-800 mt-1">{categories.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <FolderTree className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">{categories.filter(c => c.is_active).length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inactive</p>
              <p className="text-2xl font-extrabold text-slate-400 mt-1">{categories.filter(c => !c.is_active).length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex justify-between items-center shadow-sm">
          <div className="relative w-96">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search category name or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-medium"
            />
          </div>
          <div className="text-sm text-slate-500 font-medium">
            Categories: <span className="font-bold text-slate-800">{filtered.length}</span>
          </div>
        </div>

        {/* Categories Table */}
        {loading ? (
          <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-400 font-medium">Loading categories...</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4 w-12 text-center">#</th>
                    <th className="p-4">Name (English)</th>
                    <th className="p-4">Name (Sinhala)</th>
                    <th className="p-4">Slug</th>
                    <th className="p-4">Linked Products</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filtered.map((cat, idx) => (
                    <tr key={cat.id} className="hover:bg-slate-50 transition">
                      <td className="p-4 text-center text-xs font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{cat.name}</div>
                      </td>
                      <td className="p-4 text-slate-600 font-medium">{cat.name_si || <span className="text-slate-300 italic">-</span>}</td>
                      <td className="p-4">
                        <span className="bg-slate-100 text-slate-600 text-xs font-mono font-medium px-2 py-0.5 rounded border border-slate-200">
                          {cat.slug}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-indigo-100">
                          <Layers className="w-3 h-3" />
                          {cat.product_count || 0} products
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          cat.is_active 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}>
                          {cat.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {cat.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => openEdit(cat)} 
                            title="Edit Category"
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => toggleActive(cat)} 
                            title={cat.is_active ? "Deactivate" : "Activate"}
                            className={`p-1.5 rounded-lg transition ${
                              cat.is_active 
                                ? "text-amber-600 hover:bg-amber-50" 
                                : "text-emerald-600 hover:bg-emerald-50"
                            }`}
                          >
                            {cat.is_active ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => handleDelete(cat.id)} 
                            title="Delete Category"
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-400 font-medium">No categories found matching your query.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <FolderTree className="w-5 h-5 text-indigo-600" /> {editing ? "Edit Category" : "Add New Category"}
                </h2>
                <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
              </div>

              {msg.text && (
                <div className={`m-6 mb-0 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  msg.type === "success" 
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-700" 
                    : "bg-rose-50 border border-rose-200 text-rose-700"
                }`}>
                  {msg.text}
                </div>
              )}

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Category Name (English) *</label>
                  <input 
                    type="text" 
                    value={form.name} 
                    onChange={e => handleNameChange(e.target.value)}
                    placeholder="e.g. Nail Polish"
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none font-medium" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Category Name (Sinhala)</label>
                  <input 
                    type="text" 
                    value={form.name_si} 
                    onChange={e => setForm({...form, name_si: e.target.value})}
                    placeholder="e.g. නේල් පොලිෂ්"
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none font-medium" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">URL Slug *</label>
                  <input 
                    type="text" 
                    value={form.slug} 
                    onChange={e => setForm({...form, slug: slugify(e.target.value)})}
                    placeholder="e.g. nail-polish"
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50 font-mono focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">Auto-generated from title. Used in product URLs.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Cover Image URL</label>
                  <input 
                    type="text" 
                    value={form.image_url} 
                    onChange={e => setForm({...form, image_url: e.target.value})}
                    placeholder="https://... or /images/category.jpg"
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Display Status</label>
                  <select 
                    value={form.is_active} 
                    onChange={e => setForm({...form, is_active: parseInt(e.target.value)})}
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                  >
                    <option value={1}>Active (Visible on store)</option>
                    <option value={0}>Inactive (Hidden)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)} 
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-500 font-semibold text-xs hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={handleSave} 
                    disabled={saving}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700 transition shadow-md disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {saving ? "Saving..." : editing ? "Update Category" : "Add Category"}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
