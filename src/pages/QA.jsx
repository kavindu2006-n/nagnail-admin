import { useEffect, useState, useMemo } from "react";
import API from "../api/config";
import Layout from "../components/Layout";

export default function QA() {
  const [qa, setQa] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [answering, setAnswering] = useState(null);
  const [answerText, setAnswerText] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchQA(); }, []);

  const fetchQA = async () => {
    try {
      const res = await API.get("/qa");
      if (res.data.success) setQa(res.data.qa);
    } catch(err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAnswer = async (id) => {
    if (!answerText.trim()) return;
    setSaving(true);
    try {
      await API.put(`/qa/${id}/answer`, { answer: answerText });
      setMsg("Answer saved!");
      setAnswering(null);
      setAnswerText("");
      fetchQA();
      setTimeout(() => setMsg(""), 3000);
    } catch(err) { console.error(err); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this question?")) return;
    try {
      await API.delete(`/qa/${id}`);
      fetchQA();
      setMsg("Question deleted!");
      setTimeout(() => setMsg(""), 3000);
    } catch(err) { console.error(err); }
  };

  const filtered = useMemo(() => qa.filter(q => {
    const matchSearch = !search ||
      q.question?.toLowerCase().includes(search.toLowerCase()) ||
      q.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      q.user_name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" ||
      (filter === "unanswered" && !q.answer) ||
      (filter === "answered" && q.answer);
    return matchSearch && matchFilter;
  }), [qa, search, filter]);

  const unanswered = qa.filter(q => !q.answer).length;

  return (
    <Layout>
      <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-800">Product Q&A</h2>
          <p className="text-gray-500 text-sm mt-1">{qa.length} questions · <span className="text-red-500 font-bold">{unanswered} unanswered</span></p>
        </div>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm font-semibold">✅ {msg}</div>}

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-gray-50 rounded-2xl p-4"><p className="text-2xl font-black text-gray-800">{qa.length}</p><p className="text-xs text-gray-500">Total Questions</p></div>
        <div className="bg-red-50 rounded-2xl p-4"><p className="text-2xl font-black text-red-600">{unanswered}</p><p className="text-xs text-gray-500">Need Answer</p></div>
        <div className="bg-green-50 rounded-2xl p-4"><p className="text-2xl font-black text-green-600">{qa.length - unanswered}</p><p className="text-xs text-gray-500">Answered</p></div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Search questions, products, customers..."
          className="flex-1 min-w-[200px] border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#16a34a]" />
        <div className="flex gap-2">
          {[{k:"all",l:"All"},{k:"unanswered",l:"🔴 Unanswered"},{k:"answered",l:"✅ Answered"}].map(f => (
            <button key={f.k} onClick={()=>setFilter(f.k)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${filter===f.k?"bg-gray-900 text-white":"bg-white border-2 border-gray-200 text-gray-600 hover:border-gray-400"}`}>
              {f.l} ({f.k==="all"?qa.length:f.k==="unanswered"?unanswered:qa.length-unanswered})
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20"><div className="animate-spin w-10 h-10 border-4 border-[#16a34a] border-t-transparent rounded-full mx-auto"></div></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400"><p className="text-4xl mb-2">❓</p><p>No questions found</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(q => (
            <div key={q.id} className={`bg-white rounded-2xl shadow-sm border-2 p-4 ${!q.answer?"border-red-100":"border-gray-100"}`}>
              {/* Question */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${q.answer?"bg-green-100 text-green-700":"bg-red-100 text-red-600"}`}>
                      {q.answer ? "✅ Answered" : "🔴 Unanswered"}
                    </span>
                    <a href={`https://nagnail.lk/product/${q.product_id}`} target="_blank" rel="noreferrer"
                      className="text-xs text-[#16a34a] font-bold hover:underline truncate max-w-xs">
                      {q.product_name}
                    </a>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-black text-xs flex-shrink-0 mt-0.5">Q</div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{q.question}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{q.user_name || "Guest"} · {new Date(q.created_at).toLocaleDateString("en-LK")}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => { setAnswering(q.id); setAnswerText(q.answer || ""); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-[#16a34a] text-[#16a34a] hover:bg-green-50">
                    {q.answer ? "✏️ Edit" : "💬 Answer"}
                  </button>
                  <button onClick={() => handleDelete(q.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-red-200 text-red-500 hover:bg-red-50">
                    🗑️
                  </button>
                </div>
              </div>

              {/* Existing Answer */}
              {q.answer && answering !== q.id && (
                <div className="flex items-start gap-2 bg-green-50 rounded-xl p-3">
                  <div className="w-7 h-7 bg-[#16a34a] rounded-full flex items-center justify-center text-white font-black text-xs flex-shrink-0">A</div>
                  <p className="text-sm text-gray-700">{q.answer}</p>
                </div>
              )}

              {/* Answer Form */}
              {answering === q.id && (
                <div className="mt-2">
                  <textarea value={answerText} onChange={e=>setAnswerText(e.target.value)}
                    placeholder="Type your answer here..."
                    rows={3}
                    className="w-full border-2 border-[#16a34a] rounded-xl px-4 py-3 text-sm outline-none resize-none mb-2" />
                  <div className="flex gap-2">
                    <button onClick={() => handleAnswer(q.id)} disabled={saving || !answerText.trim()}
                      className="bg-[#16a34a] text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-[#15803d] disabled:opacity-50">
                      {saving ? "Saving..." : "✅ Save Answer"}
                    </button>
                    <button onClick={() => { setAnswering(null); setAnswerText(""); }}
                      className="border-2 border-gray-200 text-gray-600 px-5 py-2 rounded-xl text-sm font-bold hover:bg-gray-50">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
