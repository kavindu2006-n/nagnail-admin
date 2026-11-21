import { useEffect, useState, useMemo } from "react";
import API from "../api/config";
import Layout from "../components/Layout";

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchReviews(); }, []);

  const fetchReviews = async () => {
    try {
      const res = await API.get("/reviews");
      if (res.data.success) setReviews(res.data.reviews);
    } catch(err) { console.error(err); }
    finally { setLoading(false); }
  };

  const updateReview = async (id, data) => {
    try {
      await API.put(`/reviews/${id}`, data);
      fetchReviews();
      setMsg("Review updated!");
      setTimeout(() => setMsg(""), 2000);
    } catch(err) { console.error(err); }
  };

  const deleteReview = async (id) => {
    if (!confirm("Delete this review permanently?")) return;
    try {
      await API.delete(`/reviews/${id}`);
      fetchReviews();
      setMsg("Review deleted!");
      setTimeout(() => setMsg(""), 2000);
    } catch(err) { console.error(err); }
  };

  const filtered = useMemo(() => reviews.filter(r => {
    const matchSearch = !search ||
      r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.comment?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" ||
      (filter === "flagged" && r.is_flagged) ||
      (filter === "hidden" && !r.is_approved) ||
      (filter === "5star" && r.rating === 5) ||
      (filter === "low" && r.rating <= 2);
    return matchSearch && matchFilter;
  }), [reviews, search, filter]);

  const stars = (rating) => "★".repeat(rating) + "☆".repeat(5-rating);

  return (
    <Layout>
      <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-800">Review Moderation</h2>
          <p className="text-gray-500 text-sm mt-1">{reviews.length} total · {reviews.filter(r=>r.is_flagged).length} flagged</p>
        </div>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm font-semibold">✅ {msg}</div>}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label:"Total Reviews", value:reviews.length, color:"text-gray-800", bg:"bg-gray-50" },
          { label:"Flagged", value:reviews.filter(r=>r.is_flagged).length, color:"text-red-600", bg:"bg-red-50" },
          { label:"Hidden", value:reviews.filter(r=>!r.is_approved).length, color:"text-yellow-600", bg:"bg-yellow-50" },
          { label:"Avg Rating", value:reviews.length ? (reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1)+"★" : "—", color:"text-yellow-500", bg:"bg-yellow-50" },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-2xl p-4`}>
            <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Search by customer, product, comment..."
          className="flex-1 min-w-[200px] border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#16a34a]" />
        <div className="flex gap-2 flex-wrap">
          {[
            { key:"all", label:"All" },
            { key:"flagged", label:"🚩 Flagged" },
            { key:"hidden", label:"🙈 Hidden" },
            { key:"5star", label:"5★" },
            { key:"low", label:"Low Rating" },
          ].map(f => (
            <button key={f.key} onClick={()=>setFilter(f.key)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${filter===f.key?"bg-gray-900 text-white":"bg-white border-2 border-gray-200 text-gray-600 hover:border-gray-400"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-3">Showing {filtered.length} of {reviews.length} reviews</p>

      {loading ? (
        <div className="text-center py-20"><div className="animate-spin w-10 h-10 border-4 border-[#16a34a] border-t-transparent rounded-full mx-auto"></div></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400"><p className="text-4xl mb-2">⭐</p><p>No reviews found</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className={`bg-white rounded-2xl shadow-sm border-2 p-4 ${r.is_flagged?"border-red-200":!r.is_approved?"border-yellow-200":"border-gray-100"}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 bg-[#16a34a] rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                    {r.full_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-800 text-sm">{r.full_name}</p>
                      <span className="text-yellow-400 text-sm">{stars(r.rating)}</span>
                      {r.is_flagged && <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">🚩 Flagged</span>}
                      {!r.is_approved && <span className="text-xs bg-yellow-100 text-yellow-600 font-bold px-2 py-0.5 rounded-full">🙈 Hidden</span>}
                      {r.helpful_count > 0 && <span className="text-xs bg-blue-100 text-blue-600 font-bold px-2 py-0.5 rounded-full">👍 {r.helpful_count}</span>}
                    </div>
                    <p className="text-xs text-[#16a34a] font-semibold mt-0.5">{r.product_name}</p>
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">{r.comment}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(r.created_at).toLocaleDateString("en-LK",{year:"numeric",month:"long",day:"numeric"})}</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0 flex-wrap">
                  <button onClick={() => updateReview(r.id, { is_approved: r.is_approved ? 0 : 1, is_flagged: r.is_flagged })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${r.is_approved?"border-yellow-200 text-yellow-600 hover:bg-yellow-50":"border-green-200 text-green-600 hover:bg-green-50"}`}>
                    {r.is_approved ? "🙈 Hide" : "✅ Show"}
                  </button>
                  <button onClick={() => updateReview(r.id, { is_approved: r.is_approved, is_flagged: r.is_flagged ? 0 : 1 })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${r.is_flagged?"border-gray-200 text-gray-500 hover:bg-gray-50":"border-red-200 text-red-500 hover:bg-red-50"}`}>
                    {r.is_flagged ? "✓ Unflag" : "🚩 Flag"}
                  </button>
                  <button onClick={() => deleteReview(r.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-red-200 text-red-500 hover:bg-red-50">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
