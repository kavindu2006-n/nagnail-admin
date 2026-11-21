import { useEffect, useState } from "react";
import API from "../api/config";
import Layout from "../components/Layout";

export default function Brands() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    name: "",
    slug: "",
    logo_url: "",
    description: "",
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => { fetchBrands(); }, []);

  const fetchBrands = async () => {
    try {
      const res = await API.get("/brands");
      if (res.data.success) setBrands(res.data.brands);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setForm({ name: "", slug: "", logo_url: "", description: "", is_active: true, sort_order: 0 });
    setEditing(null);
  };

  const openCreate = () => { resetForm(); setShowModal(true); };

  const openEdit = (b) => {
    setEditing(b);
    setForm({
      name: b.name,
      slug: b.slug,
      logo_url: b.logo_url || "",
      description: b.description || "",
      is_active: !!b.is_active,
      sort_order: b.sort_order || 0,
    });
    setShowModal(true);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("image", file);
    const token = localStorage.getItem("adminToken");
    const res = await fetch("https://nagnail.lk/api/upload/image", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const data = await res.json();
    const url = data.url || data.imageUrl || data.image_url;
    if (url) setForm({ ...form, logo_url: url });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setMsg("Name is required"); return; }
    try {
      if (editing) {
        await API.put(`/brands/${editing.id}`, form);
        setMsg("Brand updated!");
      } else {
        await API.post("/brands", form);
        setMsg("Brand created!");
      }
      setShowModal(false);
      resetForm();
      fetchBrands();
      setTimeout(() => setMsg(""), 2500);
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this brand? Products will keep working but lose brand info.")) return;
    try {
      await API.delete(`/brands/${id}`);
      fetchBrands();
      setMsg("Deleted!");
      setTimeout(() => setMsg(""), 2000);
    } catch (err) { console.error(err); }
  };

  const filtered = brands.filter(b =>
    !search || b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Brands</h1>
            <p className="text-gray-500 text-sm">Manage product brands (Apple, Samsung, Nike, etc.)</p>
          </div>
          <button
            onClick={openCreate}
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-medium"
          >
            + Add Brand
          </button>
        </div>

        {msg && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">{msg}</div>}

        <input
          type="text"
          placeholder="Search brands..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 border rounded-lg mb-4"
        />

        {loading ? (
          <div className="text-center py-10">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No brands yet. Click "Add Brand" to create one.</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Logo</th>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Slug</th>
                  <th className="text-left p-3">Products</th>
                  <th className="text-left p-3">Sort</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b.id} className="border-t hover:bg-gray-50">
                    <td className="p-3">
                      {b.logo_url ? (
                        <img src={b.logo_url} alt={b.name} className="w-12 h-12 rounded object-cover border" />
                      ) : (
                        <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">No logo</div>
                      )}
                    </td>
                    <td className="p-3 font-medium">{b.name}</td>
                    <td className="p-3 text-sm text-gray-500">{b.slug}</td>
                    <td className="p-3 text-sm">{b.product_count || 0}</td>
                    <td className="p-3 text-sm">{b.sort_order || 0}</td>
                    <td className="p-3">
                      {b.is_active ? (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">Active</span>
                      ) : (
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">Hidden</span>
                      )}
                    </td>
                    <td className="p-3">
                      <button onClick={() => openEdit(b)} className="text-blue-600 hover:underline mr-3 text-sm">Edit</button>
                      <button onClick={() => handleDelete(b.id)} className="text-red-600 hover:underline text-sm">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{editing ? "Edit" : "Create"} Brand</h2>
                <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-500 text-2xl">×</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Brand Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Apple"
                    className="w-full p-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Slug (URL-friendly)</label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="Auto-generated from name if empty"
                    className="w-full p-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Logo</label>
                  <div className="flex items-center gap-3">
                    {form.logo_url && <img src={form.logo_url} alt="" className="w-14 h-14 rounded object-cover border" />}
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows="3"
                    className="w-full p-2 border rounded"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Sort Order</label>
                    <input
                      type="number"
                      value={form.sort_order}
                      onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <label className="flex items-center gap-2 p-2">
                      <input
                        type="checkbox"
                        checked={form.is_active}
                        onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      />
                      <span className="text-sm">Active</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={handleSubmit}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded font-medium"
                  >
                    {editing ? "Update" : "Create"} Brand
                  </button>
                  <button
                    onClick={() => { setShowModal(false); resetForm(); }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded font-medium"
                  >
                    Cancel
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
