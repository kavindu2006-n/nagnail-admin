import { useEffect, useState, useMemo } from "react";
import API from "../api/config";
import Layout from "../components/Layout";
import { Link } from "react-router-dom";

export default function AIReviewGenerator() {
  const [products,       setProducts]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState("");
  const [selectedProduct,setSelectedProduct]= useState(null);

  // Generation options
  const [count,     setCount]     = useState(5);
  const [language,  setLanguage]  = useState("mixed");
  const [tone,      setTone]      = useState("positive");
  const [dist5, setDist5] = useState(60);
  const [dist4, setDist4] = useState(25);
  const [dist3, setDist3] = useState(10);
  const [dist2, setDist2] = useState(3);
  const [dist1, setDist1] = useState(2);

  // Preview + save
  const [previewReviews, setPreviewReviews] = useState([]);
  const [generating,     setGenerating]     = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [msg,            setMsg]            = useState("");
  const [msgType,        setMsgType]        = useState("success");

  // Bulk mode
  const [bulkMode,       setBulkMode]       = useState(false);
  const [selectedIds,    setSelectedIds]    = useState(new Set());
  const [bulkCount,      setBulkCount]      = useState(5);
  const [bulkRunning,    setBulkRunning]    = useState(false);
  const [bulkProgress,   setBulkProgress]   = useState({ current: 0, total: 0 });
  const [bulkResults,    setBulkResults]    = useState([]);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Try the AI-aware endpoint first
      const res = await API.get("/ai/reviews/products-without-reviews?minCount=1000&limit=200");
      if (res.data.success && res.data.products) {
        setProducts(res.data.products);
        setLoading(false);
        return;
      }
    } catch (err) { /* silent — fallback below */ }

    // Fallback to public products
    try {
      const res2 = await API.get("/products?limit=200");
      if (res2.data.success) {
        setProducts((res2.data.products || []).map(p => ({
          id: p.id, name: p.name, price: p.price, image_url: p.image_url,
          category: p.category_name || p.category || 'General',
          review_count: p.review_count || 0,
          avg_rating: p.rating || 0
        })));
      }
    } catch (e) { console.error("Products fetch failed:", e); }
    setLoading(false);
  };

  const filtered = useMemo(() =>
    products.filter(p =>
      !search || p.name?.toLowerCase().includes(search.toLowerCase())
    ), [products, search]
  );

  const distributionTotal = dist5 + dist4 + dist3 + dist2 + dist1;

  const showMsg = (text, type = "success") => {
    setMsgType(type);
    setMsg(text);
    setTimeout(() => setMsg(""), 4000);
  };

  // ─── Generate preview ─────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!selectedProduct) return showMsg("Select a product first", "error");
    if (distributionTotal < 5) return showMsg("Rating distribution too low — adjust sliders", "error");

    setGenerating(true);
    setPreviewReviews([]);
    try {
      const res = await API.post("/ai/reviews/generate", {
        productId: selectedProduct.id,
        count,
        language,
        tone,
        distribution: { 5: dist5, 4: dist4, 3: dist3, 2: dist2, 1: dist1 },
        saveImmediately: false
      });
      if (res.data.success) {
        setPreviewReviews(res.data.reviews.map((r, i) => ({ ...r, _idx: i, _edited: false })));
        showMsg(`✨ Generated ${res.data.reviews.length} reviews. Review and save below.`);
      } else {
        showMsg(res.data.error || "Generation failed", "error");
      }
    } catch (err) {
      showMsg(err.response?.data?.error || err.message, "error");
    }
    setGenerating(false);
  };

  // ─── Save reviews ─────────────────────────────────────────────────────────
  const handleSaveAll = async () => {
    if (!selectedProduct || previewReviews.length === 0) return;
    setSaving(true);
    try {
      const res = await API.post("/ai/reviews/save", {
        productId: selectedProduct.id,
        reviews:   previewReviews
      });
      if (res.data.success) {
        showMsg(`✅ Saved ${res.data.saved} reviews to product "${selectedProduct.name}"!`);
        setPreviewReviews([]);
        fetchProducts();
      } else {
        showMsg(res.data.error, "error");
      }
    } catch (err) {
      showMsg(err.response?.data?.error || err.message, "error");
    }
    setSaving(false);
  };

  const removePreview = (idx) => {
    setPreviewReviews(prev => prev.filter((_, i) => i !== idx));
  };

  const editPreview = (idx, field, value) => {
    setPreviewReviews(prev => prev.map((r, i) =>
      i === idx ? { ...r, [field]: value, _edited: true } : r
    ));
  };

  // ─── Bulk generate ────────────────────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectVisible = () => {
    setSelectedIds(new Set(filtered.slice(0, 30).map(p => p.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkGenerate = async () => {
    if (selectedIds.size === 0) return showMsg("Select at least one product", "error");
    setBulkRunning(true);
    setBulkProgress({ current: 0, total: selectedIds.size });
    setBulkResults([]);

    try {
      const res = await API.post("/ai/reviews/bulk-generate", {
        productIds:      Array.from(selectedIds),
        countPerProduct: bulkCount,
        language, tone,
        distribution: { 5: dist5, 4: dist4, 3: dist3, 2: dist2, 1: dist1 }
      });
      if (res.data.success) {
        setBulkResults(res.data.results);
        setBulkProgress({ current: selectedIds.size, total: selectedIds.size });
        showMsg(`🚀 Generated ${res.data.totalSaved} reviews across ${res.data.totalProducts} products!`);
        setSelectedIds(new Set());
        fetchProducts();
      } else {
        showMsg(res.data.error, "error");
      }
    } catch (err) {
      showMsg(err.response?.data?.error || err.message, "error");
    }
    setBulkRunning(false);
  };

  const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);

  return (
    <Layout>
      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>

        {/* ─── Header ──────────────────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
          borderRadius: '16px',
          padding: '28px 32px',
          color: '#fff',
          marginBottom: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: -30, right: -30, fontSize: '160px', opacity: 0.1 }}>🎭</div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800 }}>🎭 AI Review Generator</h1>
          <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: '14px' }}>
            Generate realistic Sri Lankan customer reviews powered by AI • Sinhala + English + Singlish
          </p>
          <div style={{ marginTop: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link to="/fake-reviews" style={{
              padding: '6px 14px', background: 'rgba(255,255,255,0.2)',
              borderRadius: '20px', color: '#fff', textDecoration: 'none',
              fontSize: '12px', fontWeight: 600
            }}>📝 Manage Fake Reviews</Link>
            <Link to="/reviews" style={{
              padding: '6px 14px', background: 'rgba(255,255,255,0.2)',
              borderRadius: '20px', color: '#fff', textDecoration: 'none',
              fontSize: '12px', fontWeight: 600
            }}>💬 All Reviews</Link>
          </div>
        </div>

        {/* ─── Message ─────────────────────────────────────────────────────── */}
        {msg && (
          <div style={{
            padding: '12px 18px',
            borderRadius: '10px',
            marginBottom: '16px',
            fontWeight: 600,
            fontSize: '13px',
            background:  msgType === 'success' ? '#f0fdf4' : '#fef2f2',
            color:       msgType === 'success' ? '#16a34a' : '#dc2626',
            border: `1px solid ${msgType === 'success' ? '#bbf7d0' : '#fecaca'}`
          }}>{msg}</div>
        )}

        {/* ─── Mode toggle ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            onClick={() => setBulkMode(false)}
            style={{
              padding: '10px 20px', borderRadius: '10px', border: 'none',
              fontWeight: 700, cursor: 'pointer', fontSize: '13px',
              background: !bulkMode ? 'linear-gradient(135deg, #7c3aed, #ec4899)' : '#f3f4f6',
              color:      !bulkMode ? '#fff' : '#6b7280'
            }}
          >🎯 Single Product</button>
          <button
            onClick={() => setBulkMode(true)}
            style={{
              padding: '10px 20px', borderRadius: '10px', border: 'none',
              fontWeight: 700, cursor: 'pointer', fontSize: '13px',
              background: bulkMode ? 'linear-gradient(135deg, #7c3aed, #ec4899)' : '#f3f4f6',
              color:      bulkMode ? '#fff' : '#6b7280'
            }}
          >⚡ Bulk Mode ({selectedIds.size})</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '20px' }}>

          {/* ─── LEFT: Options panel ──────────────────────────────────────── */}
          <div style={{
            background: '#fff',
            borderRadius: '14px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            height: 'fit-content',
            position: 'sticky',
            top: '20px'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700 }}>⚙️ Generation Options</h3>

            {/* Count */}
            <div style={{ marginBottom: '16px' }}>
              <label style={lbl}>
                {bulkMode ? 'Reviews per product' : 'Number of reviews'}: <strong style={{ color: '#7c3aed' }}>{bulkMode ? bulkCount : count}</strong>
              </label>
              <input
                type="range" min={1} max={bulkMode ? 10 : 20}
                value={bulkMode ? bulkCount : count}
                onChange={e => bulkMode ? setBulkCount(+e.target.value) : setCount(+e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            {/* Language */}
            <div style={{ marginBottom: '16px' }}>
              <label style={lbl}>Language</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                {[
                  { v: 'english', l: '🇬🇧 English' },
                  { v: 'sinhala', l: '🇱🇰 සිංහල' },
                  { v: 'mixed',   l: '🌏 Mixed' }
                ].map(o => (
                  <button key={o.v} onClick={() => setLanguage(o.v)} style={{
                    padding: '8px', border: 'none', borderRadius: '8px',
                    fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                    background: language === o.v ? '#7c3aed' : '#f3f4f6',
                    color:      language === o.v ? '#fff' : '#6b7280'
                  }}>{o.l}</button>
                ))}
              </div>
            </div>

            {/* Tone */}
            <div style={{ marginBottom: '16px' }}>
              <label style={lbl}>Tone</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                {[
                  { v: 'positive', l: '😊 Positive' },
                  { v: 'mixed',    l: '⚖️ Mixed' },
                  { v: 'critical', l: '🤔 Critical' }
                ].map(o => (
                  <button key={o.v} onClick={() => setTone(o.v)} style={{
                    padding: '8px', border: 'none', borderRadius: '8px',
                    fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                    background: tone === o.v ? '#7c3aed' : '#f3f4f6',
                    color:      tone === o.v ? '#fff' : '#6b7280'
                  }}>{o.l}</button>
                ))}
              </div>
            </div>

            {/* Rating distribution */}
            <div style={{ marginBottom: '16px' }}>
              <label style={lbl}>
                ⭐ Rating Distribution
                <span style={{
                  float: 'right',
                  color: distributionTotal === 100 ? '#16a34a' : (distributionTotal >= 90 && distributionTotal <= 110 ? '#f59e0b' : '#ef4444'),
                  fontWeight: 700
                }}>
                  {distributionTotal}%
                  {distributionTotal !== 100 && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        // Auto-normalize to 100%
                        const total = dist5 + dist4 + dist3 + dist2 + dist1;
                        if (total > 0) {
                          const factor = 100 / total;
                          setDist5(Math.round(dist5 * factor));
                          setDist4(Math.round(dist4 * factor));
                          setDist3(Math.round(dist3 * factor));
                          setDist2(Math.round(dist2 * factor));
                          setDist1(Math.round(dist1 * factor));
                        }
                      }}
                      style={{
                        marginLeft: 6, padding: '1px 6px', border: 'none',
                        background: '#7c3aed', color: '#fff',
                        borderRadius: 4, fontSize: 9, cursor: 'pointer',
                        fontWeight: 700
                      }}
                    >FIX</button>
                  )}
                </span>
              </label>
              {[
                { s: 5, val: dist5, set: setDist5, c: '#22c55e' },
                { s: 4, val: dist4, set: setDist4, c: '#84cc16' },
                { s: 3, val: dist3, set: setDist3, c: '#f59e0b' },
                { s: 2, val: dist2, set: setDist2, c: '#f97316' },
                { s: 1, val: dist1, set: setDist1, c: '#ef4444' }
              ].map(r => (
                <div key={r.s} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <span style={{ fontSize: '11px', minWidth: '32px', fontWeight: 600 }}>{r.s}★</span>
                  <input type="range" min={0} max={100} value={r.val}
                    onChange={e => r.set(+e.target.value)}
                    style={{ flex: 1, accentColor: r.c }}
                  />
                  <span style={{ fontSize: '11px', minWidth: '30px', color: r.c, fontWeight: 700 }}>{r.val}%</span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                <button onClick={() => { setDist5(60); setDist4(25); setDist3(10); setDist2(3); setDist1(2); }}
                  style={presetBtn}>Realistic</button>
                <button onClick={() => { setDist5(80); setDist4(15); setDist3(5); setDist2(0); setDist1(0); }}
                  style={presetBtn}>Very Positive</button>
                <button onClick={() => { setDist5(35); setDist4(30); setDist3(20); setDist2(10); setDist1(5); }}
                  style={presetBtn}>Balanced</button>
              </div>
            </div>

            {/* Action Button */}
            {!bulkMode ? (
              <button
                onClick={handleGenerate}
                disabled={!selectedProduct || generating}
                style={{
                  width: '100%', padding: '14px', border: 'none',
                  borderRadius: '10px', fontWeight: 800, fontSize: '14px',
                  cursor: selectedProduct && !generating ? 'pointer' : 'not-allowed',
                  background: selectedProduct && !generating
                    ? 'linear-gradient(135deg, #7c3aed, #ec4899)'
                    : '#d1d5db',
                  color: '#fff',
                  transition: 'transform 0.15s'
                }}
              >
                {generating ? '⏳ Generating with AI...' : '✨ Generate Preview'}
              </button>
            ) : (
              <button
                onClick={handleBulkGenerate}
                disabled={selectedIds.size === 0 || bulkRunning}
                style={{
                  width: '100%', padding: '14px', border: 'none',
                  borderRadius: '10px', fontWeight: 800, fontSize: '14px',
                  cursor: selectedIds.size > 0 && !bulkRunning ? 'pointer' : 'not-allowed',
                  background: selectedIds.size > 0 && !bulkRunning
                    ? 'linear-gradient(135deg, #7c3aed, #ec4899)'
                    : '#d1d5db',
                  color: '#fff'
                }}
              >
                {bulkRunning
                  ? `⏳ Generating ${bulkProgress.current}/${bulkProgress.total}...`
                  : `⚡ Bulk Generate for ${selectedIds.size} products`}
              </button>
            )}

            {!selectedProduct && !bulkMode && (
              <p style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', marginTop: '8px' }}>
                👉 Select a product from the list
              </p>
            )}

            {bulkMode && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                <button onClick={selectVisible} style={{ ...presetBtn, flex: 1 }}>Select All Visible</button>
                <button onClick={clearSelection} style={{ ...presetBtn, flex: 1 }}>Clear</button>
              </div>
            )}
          </div>

          {/* ─── RIGHT: Product list + Preview ───────────────────────────── */}
          <div>
            {/* Search */}
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="🔍 Search products..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px',
                  border: '1px solid #e5e7eb', borderRadius: '10px',
                  fontSize: '13px', outline: 'none'
                }}
              />
            </div>

            {/* Preview Reviews (Single mode) */}
            {!bulkMode && previewReviews.length > 0 && (
              <div style={{
                background: '#fff', borderRadius: '14px',
                padding: '20px', marginBottom: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
                    ✨ Preview ({previewReviews.length}) for "{selectedProduct?.name}"
                  </h3>
                  <button
                    onClick={handleSaveAll}
                    disabled={saving}
                    style={{
                      padding: '8px 16px', border: 'none', borderRadius: '8px',
                      background: '#22c55e', color: '#fff', fontWeight: 700,
                      fontSize: '13px', cursor: saving ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {saving ? '💾 Saving...' : `💾 Save All ${previewReviews.length}`}
                  </button>
                </div>

                {previewReviews.map((r, idx) => (
                  <div key={idx} style={{
                    padding: '14px', border: '1px solid #f3f4f6',
                    borderRadius: '10px', marginBottom: '10px',
                    background: r._edited ? '#fffbeb' : '#fafafa'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <input
                        type="text"
                        value={r.fake_name}
                        onChange={e => editPreview(idx, 'fake_name', e.target.value)}
                        style={{
                          fontWeight: 700, border: 'none', background: 'transparent',
                          fontSize: '13px', color: '#111', flex: '0 0 auto', width: '160px',
                          padding: '2px 4px', borderRadius: '4px'
                        }}
                      />
                      <select
                        value={r.rating}
                        onChange={e => editPreview(idx, 'rating', +e.target.value)}
                        style={{
                          border: 'none', background: '#fef3c7',
                          padding: '2px 8px', borderRadius: '4px',
                          fontSize: '12px', color: '#d97706', fontWeight: 700
                        }}
                      >
                        {[5,4,3,2,1].map(n => <option key={n} value={n}>{stars(n)}</option>)}
                      </select>
                      {r.verified_purchase ? (
                        <span style={{
                          fontSize: '10px', background: '#dcfce7', color: '#16a34a',
                          padding: '2px 8px', borderRadius: '4px', fontWeight: 700
                        }}>✓ Verified</span>
                      ) : null}
                      <button
                        onClick={() => removePreview(idx)}
                        style={{
                          marginLeft: 'auto', background: 'none', border: 'none',
                          color: '#ef4444', cursor: 'pointer', fontSize: '18px', padding: 0
                        }}
                      >×</button>
                    </div>
                    <textarea
                      value={r.comment}
                      onChange={e => editPreview(idx, 'comment', e.target.value)}
                      style={{
                        width: '100%', border: 'none', background: 'transparent',
                        fontSize: '13px', color: '#374151', resize: 'vertical',
                        minHeight: '40px', outline: 'none', padding: '4px',
                        borderRadius: '4px', fontFamily: 'inherit'
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Bulk Results */}
            {bulkMode && bulkResults.length > 0 && (
              <div style={{
                background: '#fff', borderRadius: '14px',
                padding: '20px', marginBottom: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
              }}>
                <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 700 }}>
                  📊 Bulk Results
                </h3>
                {bulkResults.map((r, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: '12px'
                  }}>
                    <span style={{ fontSize: '16px' }}>{r.ok ? '✅' : '❌'}</span>
                    <span style={{ flex: 1, fontWeight: 600, color: r.ok ? '#111' : '#ef4444' }}>
                      {r.productName || `Product ${r.productId}`}
                    </span>
                    <span style={{ color: '#6b7280' }}>
                      {r.ok ? `${r.saved} reviews saved` : r.error}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Product list */}
            <div style={{
              background: '#fff', borderRadius: '14px', overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
            }}>
              <div style={{
                padding: '12px 16px', background: '#f9fafb',
                borderBottom: '1px solid #f3f4f6',
                fontSize: '12px', fontWeight: 700, color: '#6b7280'
              }}>
                {loading ? 'Loading...' : `${filtered.length} products`}
                {bulkMode && ` • ${selectedIds.size} selected (max 30)`}
              </div>

              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {filtered.map(p => {
                  const isSelected  = bulkMode ? selectedIds.has(p.id) : selectedProduct?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => bulkMode ? toggleSelect(p.id) : setSelectedProduct(p)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '12px 16px', cursor: 'pointer',
                        borderBottom: '1px solid #f3f4f6',
                        background: isSelected ? '#ede9fe' : 'transparent',
                        transition: 'background 0.1s'
                      }}
                    >
                      {bulkMode && (
                        <input type="checkbox" checked={isSelected} readOnly
                          style={{ accentColor: '#7c3aed' }} />
                      )}
                      <img src={p.image_url || '/placeholder.png'} alt="" style={{
                        width: '48px', height: '48px', borderRadius: '8px',
                        objectFit: 'cover', flex: '0 0 auto',
                        background: '#f3f4f6'
                      }} onError={e => e.target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22%3E%3Crect fill=%22%23e5e7eb%22 width=%2248%22 height=%2248%22/%3E%3C/svg%3E'} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '13px', fontWeight: 600, color: '#111',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                          {p.category || 'General'} • LKR {Number(p.price || 0).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                        <div style={{
                          fontSize: '11px', fontWeight: 700,
                          color: (p.review_count || 0) < 3 ? '#ef4444' : '#22c55e'
                        }}>
                          {p.review_count || 0} reviews
                        </div>
                        <div style={{ fontSize: '10px', color: '#f59e0b' }}>
                          {Number(p.avg_rating || 0).toFixed(1)}★
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && !loading && (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                    No products match "{search}"
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const lbl = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  color: '#374151',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '6px'
};

const presetBtn = {
  padding: '4px 8px',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  background: '#fff',
  fontSize: '10px',
  color: '#6b7280',
  cursor: 'pointer',
  fontWeight: 600,
  flex: 1
};
