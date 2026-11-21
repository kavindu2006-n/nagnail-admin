import { useEffect, useState } from "react";
import API from "../api/config";
import Layout from "../components/Layout";

export default function FakeReviews() {
  const [reviews, setReviews] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    product_id: "",
    fake_name: "",
    fake_avatar: "",
    rating: 5,
    comment: "",
    video_url: "",
    photos_json: [],
    photo_url: "",
    verified_purchase: true,
    created_at: "",
    random_date: true,
  });

  useEffect(() => {
    fetchReviews();
    fetchProducts();
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await API.get("/reviews/fake");
      if (res.data.success) setReviews(res.data.reviews);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchProducts = async () => {
    try {
      const res = await API.get("/products");
      if (res.data.success) setProducts(res.data.products || []);
    } catch (err) { console.error(err); }
  };

  const resetForm = () => {
    setForm({
      product_id: "",
      fake_name: "",
      fake_avatar: "",
      rating: 5,
      comment: "",
      video_url: "",
      photos_json: [],
      photo_url: "",
      verified_purchase: true,
      created_at: "",
      random_date: true,
    });
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    let photos = [];
    try { photos = r.photos_json ? JSON.parse(r.photos_json) : []; } catch {}
    setForm({
      product_id: r.product_id,
      fake_name: r.fake_name || "",
      fake_avatar: r.fake_avatar || "",
      rating: r.rating,
      comment: r.comment || "",
      video_url: r.video_url || "",
      photos_json: photos,
      photo_url: r.photo_url || "",
      verified_purchase: !!r.verified_purchase,
      created_at: r.created_at ? new Date(r.created_at).toISOString().slice(0,16) : "",
      random_date: false,
    });
    setShowModal(true);
  };

  const uploadFile = async (file) => {
    const fd = new FormData();
    fd.append("image", file);
    const token = localStorage.getItem("adminToken");
    const res = await fetch("https://nagnail.lk/api/upload/image", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const data = await res.json();
    return data.url || data.imageUrl || data.image_url;
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = await uploadFile(file);
    if (url) setForm({ ...form, fake_avatar: url });
  };

  const handlePhotosUpload = async (e) => {
    const files = Array.from(e.target.files);
    const urls = [];
    for (const file of files) {
      const url = await uploadFile(file);
      if (url) urls.push(url);
    }
    setForm({ ...form, photos_json: [...form.photos_json, ...urls] });
  };

  const handleVideoUpload = async (e) => {
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
    if (url) setForm({ ...form, video_url: url });
  };

  const removePhoto = (idx) => {
    setForm({ ...form, photos_json: form.photos_json.filter((_, i) => i !== idx) });
  };

  const randomDate = () => {
    const days = Math.floor(Math.random() * 180) + 1; // 1 to 180 days ago
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(Math.floor(Math.random()*24), Math.floor(Math.random()*60));
    return d.toISOString().slice(0, 19).replace('T', ' ');
  };

  const handleSubmit = async () => {
    if (!form.product_id || !form.fake_name || !form.rating) {
      setMsg("Please fill product, name and rating");
      return;
    }

    const payload = {
      product_id: form.product_id,
      fake_name: form.fake_name,
      fake_avatar: form.fake_avatar,
      rating: Number(form.rating),
      comment: form.comment,
      video_url: form.video_url,
      photos_json: form.photos_json,
      photo_url: form.photo_url || (form.photos_json[0] || null),
      verified_purchase: form.verified_purchase,
      created_at: form.random_date ? randomDate() : (form.created_at ? form.created_at.replace('T', ' ') + ':00' : null),
    };

    try {
      if (editing) {
        await API.put(`/reviews/fake/${editing.id}`, payload);
        setMsg("Review updated!");
      } else {
        await API.post("/reviews/fake", payload);
        setMsg("Fake review created!");
      }
      setShowModal(false);
      resetForm();
      fetchReviews();
      setTimeout(() => setMsg(""), 2500);
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this fake review?")) return;
    try {
      await API.delete(`/reviews/fake/${id}`);
      fetchReviews();
      setMsg("Deleted!");
      setTimeout(() => setMsg(""), 2000);
    } catch (err) { console.error(err); }
  };

  const filtered = reviews.filter(r =>
    !search ||
    r.fake_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.comment?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Fake Reviews</h1>
            <p className="text-gray-500 text-sm">Add custom reviews with names, photos, videos for any product</p>
          </div>
          <button
            onClick={openCreate}
            className="bg-pink-600 hover:bg-pink-700 text-white px-5 py-2 rounded-lg font-medium"
          >
            + Add Fake Review
          </button>
        </div>

        {msg && (
          <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">{msg}</div>
        )}

        <input
          type="text"
          placeholder="Search by product, name or comment..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 border rounded-lg mb-4"
        />

        {loading ? (
          <div className="text-center py-10">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No fake reviews yet. Click "Add Fake Review" to create one.</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Product</th>
                  <th className="text-left p-3">Customer</th>
                  <th className="text-left p-3">Rating</th>
                  <th className="text-left p-3">Comment</th>
                  <th className="text-left p-3">Media</th>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  let photos = [];
                  try { photos = r.photos_json ? JSON.parse(r.photos_json) : []; } catch {}
                  return (
                    <tr key={r.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 text-sm">{r.product_name || `#${r.product_id}`}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {r.fake_avatar && <img src={r.fake_avatar} alt="" className="w-8 h-8 rounded-full object-cover" />}
                          <span className="font-medium">{r.fake_name}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-yellow-500">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                      </td>
                      <td className="p-3 text-sm max-w-xs truncate">{r.comment}</td>
                      <td className="p-3 text-xs">
                        {photos.length > 0 && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded mr-1">📷 {photos.length}</span>}
                        {r.video_url && <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">🎥</span>}
                      </td>
                      <td className="p-3 text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="p-3">
                        <button onClick={() => openEdit(r)} className="text-blue-600 hover:underline mr-3 text-sm">Edit</button>
                        <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:underline text-sm">Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{editing ? "Edit" : "Create"} Fake Review</h2>
                <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-500 text-2xl">×</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Product *</label>
                  <select
                    value={form.product_id}
                    onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">-- Select Product --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Customer Name *</label>
                    <input
                      type="text"
                      value={form.fake_name}
                      onChange={(e) => setForm({ ...form, fake_name: e.target.value })}
                      placeholder="e.g. Nimal Perera"
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Rating *</label>
                    <select
                      value={form.rating}
                      onChange={(e) => setForm({ ...form, rating: e.target.value })}
                      className="w-full p-2 border rounded"
                    >
                      {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Customer Avatar (optional)</label>
                  <div className="flex items-center gap-3">
                    {form.fake_avatar && <img src={form.fake_avatar} alt="" className="w-12 h-12 rounded-full object-cover" />}
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="text-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Comment</label>
                  <textarea
                    value={form.comment}
                    onChange={(e) => setForm({ ...form, comment: e.target.value })}
                    rows="4"
                    placeholder="Write the customer review here..."
                    className="w-full p-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Photos (multiple)</label>
                  <input type="file" accept="image/*" multiple onChange={handlePhotosUpload} className="text-sm" />
                  {form.photos_json.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {form.photos_json.map((url, i) => (
                        <div key={i} className="relative">
                          <img src={url} alt="" className="w-20 h-20 object-cover rounded" />
                          <button
                            onClick={() => removePhoto(i)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-xs"
                          >×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Video (optional)</label>
                  <input type="file" accept="video/*" onChange={handleVideoUpload} className="text-sm" />
                  {form.video_url && (
                    <div className="mt-2 text-sm text-green-600">✓ Video uploaded</div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.verified_purchase}
                      onChange={(e) => setForm({ ...form, verified_purchase: e.target.checked })}
                    />
                    <span className="text-sm">Show as Verified Purchase</span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={form.random_date}
                      onChange={(e) => setForm({ ...form, random_date: e.target.checked })}
                    />
                    <span className="text-sm font-medium">Use random date (1-180 days ago)</span>
                  </label>
                  {!form.random_date && (
                    <input
                      type="datetime-local"
                      value={form.created_at}
                      onChange={(e) => setForm({ ...form, created_at: e.target.value })}
                      className="w-full p-2 border rounded"
                    />
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={handleSubmit}
                    className="flex-1 bg-pink-600 hover:bg-pink-700 text-white py-2 rounded font-medium"
                  >
                    {editing ? "Update" : "Create"} Review
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
