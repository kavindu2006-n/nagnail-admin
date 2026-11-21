import { useEffect, useState } from "react";
import API from "../api/config";
import Layout from "../components/Layout";

export default function BlogPosts() {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const emptyForm = {
    title: "", slug: "", excerpt: "", content: "", cover_image: "",
    category_id: "", author_name: "NagNail Team", author_avatar: "",
    status: "draft", meta_title: "", meta_description: "", meta_keywords: "",
    tags: "", related_product_ids: [], reading_minutes: 5, published_at: "",
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [p, c, pr] = await Promise.all([
        API.get("/blog/posts"),
        API.get("/blog/categories"),
        API.get("/products"),
      ]);
      if (p.data.success) setPosts(p.data.posts);
      if (c.data.success) setCategories(c.data.categories);
      if (pr.data.success) setProducts(pr.data.products || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setForm(emptyForm); setEditing(null); setShowModal(true); };

  const openEdit = async (p) => {
    try {
      const r = await API.get(`/blog/posts/${p.id}`);
      if (!r.data.success) return;
      const post = r.data.post;
      setEditing(post);
      setForm({
        ...emptyForm,
        ...post,
        related_product_ids: post.related_product_ids ? post.related_product_ids.split(',').map(x => parseInt(x)).filter(Boolean) : [],
        published_at: post.published_at ? new Date(post.published_at).toISOString().slice(0, 16) : "",
      });
      setShowModal(true);
    } catch (err) { console.error(err); }
  };

  const uploadImage = async (file) => {
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

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const url = await uploadImage(file);
    if (url) setForm({ ...form, cover_image: url });
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const url = await uploadImage(file);
    if (url) setForm({ ...form, author_avatar: url });
  };

  const insertImageInContent = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const url = await uploadImage(file);
    if (url) setForm({ ...form, content: (form.content || "") + `\n\n<img src="${url}" alt="" style="max-width:100%;border-radius:12px;" />\n\n` });
    e.target.value = "";
  };

  const toggleProduct = (id) => {
    const list = form.related_product_ids || [];
    if (list.includes(id)) setForm({ ...form, related_product_ids: list.filter(x => x !== id) });
    else setForm({ ...form, related_product_ids: [...list, id] });
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { setMsg("Title required"); return; }
    try {
      const payload = {
        ...form,
        published_at: form.published_at ? form.published_at.replace('T', ' ') + ':00' : null,
      };
      if (editing) {
        await API.put(`/blog/posts/${editing.id}`, payload);
        setMsg("Post updated!");
      } else {
        await API.post("/blog/posts", payload);
        setMsg("Post created!");
      }
      setShowModal(false);
      setForm(emptyForm); setEditing(null);
      load();
      setTimeout(() => setMsg(""), 2500);
    } catch (err) {
      setMsg("Error: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this post permanently?")) return;
    try {
      await API.delete(`/blog/posts/${id}`);
      load();
      setMsg("Deleted!");
      setTimeout(() => setMsg(""), 2000);
    } catch (err) { console.error(err); }
  };

  const filtered = posts.filter(p => {
    const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusBadge = (s) => {
    const m = {
      draft:     { bg: "bg-gray-100 text-gray-700", l: "Draft" },
      published: { bg: "bg-green-100 text-green-700", l: "Published" },
      archived:  { bg: "bg-yellow-100 text-yellow-700", l: "Archived" },
    };
    const x = m[s] || m.draft;
    return <span className={`${x.bg} px-2 py-1 rounded-full text-xs font-bold`}>{x.l}</span>;
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Blog Posts</h1>
            <p className="text-gray-500 text-sm">Create SEO-optimized articles to attract Google traffic</p>
          </div>
          <button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium">
            + New Post
          </button>
        </div>

        {msg && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">{msg}</div>}

        <div className="flex gap-2 mb-4 flex-wrap">
          <input type="text" placeholder="Search posts..." value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] p-3 border rounded-lg" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="p-3 border rounded-lg bg-white">
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-10">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No posts yet. Click "New Post" to create one.</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Cover</th>
                  <th className="text-left p-3">Title</th>
                  <th className="text-left p-3">Category</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Views</th>
                  <th className="text-left p-3">Updated</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-t hover:bg-gray-50">
                    <td className="p-3">
                      {p.cover_image ? <img src={p.cover_image} alt="" className="w-16 h-12 object-cover rounded" />
                        : <div className="w-16 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">No image</div>}
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-sm">{p.title}</p>
                      <p className="text-xs text-gray-500">/{p.slug}</p>
                    </td>
                    <td className="p-3 text-sm">{p.category_name || "—"}</td>
                    <td className="p-3">{statusBadge(p.status)}</td>
                    <td className="p-3 text-sm">{p.view_count || 0}</td>
                    <td className="p-3 text-xs text-gray-500">{new Date(p.updated_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <button onClick={() => openEdit(p)} className="text-blue-600 hover:underline mr-3 text-sm">Edit</button>
                      {p.status === 'published' && (
                        <a href={`/blog/${p.slug}`} target="_blank" className="text-green-600 hover:underline mr-3 text-sm">View</a>
                      )}
                      <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:underline text-sm">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full my-8 max-h-[95vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{editing ? "Edit" : "New"} Blog Post</h2>
                <button onClick={() => { setShowModal(false); setForm(emptyForm); setEditing(null); }} className="text-gray-500 text-2xl">×</button>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {/* Main content — 2 cols */}
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Title *</label>
                    <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                      className="w-full p-3 border rounded text-lg font-bold" placeholder="Your amazing article title..." />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">URL Slug (auto if empty)</label>
                    <input type="text" value={form.slug} onChange={e => setForm({...form, slug: e.target.value})}
                      className="w-full p-2 border rounded font-mono text-sm" placeholder="my-article-slug" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Excerpt (short summary)</label>
                    <textarea value={form.excerpt} onChange={e => setForm({...form, excerpt: e.target.value})}
                      rows="2" className="w-full p-2 border rounded text-sm" placeholder="Brief intro shown in listings..." />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium">Content (HTML supported)</label>
                      <label className="text-xs text-indigo-600 cursor-pointer hover:underline">
                        📷 Insert Image
                        <input type="file" accept="image/*" onChange={insertImageInContent} className="hidden" />
                      </label>
                    </div>
                    <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})}
                      rows="16" className="w-full p-3 border rounded text-sm font-mono"
                      placeholder="<h2>Introduction</h2>&#10;<p>Write your article here. Use HTML tags for formatting.</p>&#10;<img src='...' />" />
                    <p className="text-xs text-gray-500 mt-1">Use HTML: &lt;h2&gt; &lt;p&gt; &lt;ul&gt; &lt;li&gt; &lt;img&gt; &lt;strong&gt; &lt;a&gt;</p>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-bold text-sm mb-3">🔍 SEO Settings</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">SEO Title (optional)</label>
                        <input type="text" value={form.meta_title} onChange={e => setForm({...form, meta_title: e.target.value})}
                          className="w-full p-2 border rounded text-sm" placeholder="Custom title for Google (defaults to Title)" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">SEO Description</label>
                        <textarea value={form.meta_description} onChange={e => setForm({...form, meta_description: e.target.value})}
                          rows="2" className="w-full p-2 border rounded text-sm" placeholder="What Google shows in search results (150-160 chars)" />
                        <p className="text-xs text-gray-500 mt-1">{form.meta_description?.length || 0}/160</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Keywords (comma-separated)</label>
                        <input type="text" value={form.meta_keywords} onChange={e => setForm({...form, meta_keywords: e.target.value})}
                          className="w-full p-2 border rounded text-sm" placeholder="laptop, sri lanka, buying guide" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Cover Image</label>
                    {form.cover_image && <img src={form.cover_image} alt="" className="w-full aspect-video object-cover rounded mb-2 border" />}
                    <input type="file" accept="image/*" onChange={handleCoverUpload} className="text-xs" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}
                      className="w-full p-2 border rounded bg-white text-sm">
                      <option value="draft">Draft (not visible)</option>
                      <option value="published">Published (live)</option>
                      <option value="archived">Archived (hidden)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}
                      className="w-full p-2 border rounded bg-white text-sm">
                      <option value="">-- None --</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Publish Date (optional)</label>
                    <input type="datetime-local" value={form.published_at}
                      onChange={e => setForm({...form, published_at: e.target.value})}
                      className="w-full p-2 border rounded text-sm" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Author Name</label>
                    <input type="text" value={form.author_name} onChange={e => setForm({...form, author_name: e.target.value})}
                      className="w-full p-2 border rounded text-sm" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Author Avatar</label>
                    <div className="flex items-center gap-2">
                      {form.author_avatar && <img src={form.author_avatar} alt="" className="w-10 h-10 rounded-full object-cover" />}
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} className="text-xs" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Reading Time (min)</label>
                    <input type="number" value={form.reading_minutes} onChange={e => setForm({...form, reading_minutes: parseInt(e.target.value)||5})}
                      className="w-full p-2 border rounded text-sm" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
                    <input type="text" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})}
                      className="w-full p-2 border rounded text-sm" placeholder="laptop, tips, review" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Related Products ({form.related_product_ids.length})</label>
                    <div className="border rounded max-h-48 overflow-y-auto p-2 bg-gray-50">
                      {products.slice(0, 100).map(p => (
                        <label key={p.id} className="flex items-center gap-2 text-xs p-1 hover:bg-white rounded cursor-pointer">
                          <input type="checkbox" checked={form.related_product_ids.includes(p.id)}
                            onChange={() => toggleProduct(p.id)} />
                          <span className="truncate">{p.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-6 mt-6 border-t">
                <button onClick={handleSubmit} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded font-bold">
                  {editing ? "Update" : "Create"} Post
                </button>
                <button onClick={() => { setShowModal(false); setForm(emptyForm); setEditing(null); }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 py-3 rounded font-medium">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
