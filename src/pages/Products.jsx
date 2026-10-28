import React, { useState, useEffect } from "react";
import RichTextEditor from "../components/RichTextEditor";
import SpecsEditor from "../components/SpecsEditor"; // NN-SPECS
import API from "../api";
import { Package, Search, Plus, Edit, Trash2, CheckCircle, XCircle, Sparkles, Image as ImageIcon, Video, Layers, Upload, Loader2, PlusCircle, X } from "lucide-react";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const handleAutoExtractSupplierSpecs = () => {
    const raw = supplierText || formData.supplier_raw || "";
    if (!raw.trim()) {
      alert("කරුණාකර පළමුව Supplier Attributes Text එක Paste කරන්න!");
      return;
    }
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const extractedSpecs = [];
    const boxItems = [];
    let inBoxSection = false;

    for (const line of lines) {
      const low = line.toLowerCase();
      if (low.includes("package include") || low.includes("package content") || low.includes("what's in the box") || low.includes("packing list") || low.startsWith("package:") || low.startsWith("packaging:")) {
        inBoxSection = true;
        const after = line.includes(":") ? line.split(":").slice(1).join(":").trim() : "";
        if (after) boxItems.push(after);
        continue;
      }
      if (inBoxSection) {
        if (line.includes(":") && !line.match(/^[0-9]+[\s]*x/i) && !line.startsWith("-") && !line.startsWith("*")) {
          const parts = line.split(":");
          if (parts[0].trim().split(/\s+/).length <= 3 && parts[1].trim()) inBoxSection = false;
        }
      }
      if (inBoxSection) {
        const cleaned = line.replace(/^[\*\-\•\d\.\)]+\s*/, "").trim();
        if (cleaned) boxItems.push(cleaned);
        continue;
      }

      let k = "", v = "";
      if (line.includes(":")) {
        const idx = line.indexOf(":");
        k = line.slice(0, idx).trim();
        v = line.slice(idx + 1).trim();
      } else if (line.includes("\t")) {
        const parts = line.split("\t").map(s => s.trim()).filter(Boolean);
        if (parts.length >= 2) { k = parts[0]; v = parts.slice(1).join(" "); }
      } else if (line.includes(" - ")) {
        const parts = line.split(" - ");
        k = parts[0].trim();
        v = parts.slice(1).join(" - ").trim();
      }

      k = k.replace(/^[\*\-\•\d\.\)]+\s*/, "").trim();
      if (k && v) {
        extractedSpecs.push({ id: Date.now() + Math.random(), key: k, value: v });
      } else if (line.match(/^[0-9]+[\s]*x\s+/i) || low.includes("cable") || low.includes("manual") || low.includes("bracket")) {
        boxItems.push(line.replace(/^[\*\-\•]+\s*/, "").trim());
      }
    }

    if (extractedSpecs.length > 0 || boxItems.length > 0) {
      if (typeof setSpecsList === "function") {
        setSpecsList(prev => [...(prev || []), ...extractedSpecs]);
      } else if (typeof setFormData === "function") {
        setFormData(prev => ({
          ...prev,
          specs: [...(prev.specs || []), ...extractedSpecs],
          package_contents: boxItems.length > 0 ? boxItems.join(", ") : prev.package_contents
        }));
      }
      if (boxItems.length > 0 && typeof setPackageContents === "function") {
        setPackageContents(boxItems.join(", "));
      }
      alert(`✅ සාර්ථකයි! Specs ${extractedSpecs.length} ක් සහ Package Contents හඳුනාගෙන Auto-Fill කරන ලදී.`);
    } else {
      alert("Specs වෙන්කර හඳුනා ගැනීමට නොහැකි විය. කරුණාකර text එක නැවත පරීක්ෂා කරන්න.");
    }
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState("basic");
  const [specs, setSpecs] = useState({ items: [], package: "" }); // NN-SPECS
  useEffect(() => {
    if (!modalOpen) return;
    if (!editingId) { setSpecs({ items: [], package: "" }); return; }
    API.get(`/products/${editingId}/specs`).then(r => setSpecs(r.data.specs || { items: [], package: "" })).catch(() => {});
  }, [modalOpen, editingId]);
  
  const [uploadingImg, setUploadingImg] = useState(false);
  const [uploadingVid, setUploadingVid] = useState(false);

  const [formData, setFormData] = useState({
    name: "", name_si: "", description: "", price: "", sale_price: "", dropship_price: "", stock_qty: 0,
    category_id: "", brand_id: "", meta_title: "", meta_description: "", is_active: 1, is_nagnail_official: 1, sku: "", warehouse_location: "",
    image_url: "", gallery_urls: [], video_url: "", variants: []
  });

  const getFullImageUrl = (url) => {
    if (!url || url === "null" || url === "undefined") return "";
    if (typeof url !== "string") return "";
    const clean = url.trim();
    if (clean.startsWith("http://") || clean.startsWith("https://")) return clean;
    if (clean.startsWith("/images/")) return clean;
    if (clean.startsWith("images/")) return `/${clean}`;
    if (clean.startsWith("/")) return clean;
    return `/images/${clean}`;
  };

  const fetchData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([API.get("/products"), API.get("/categories")]);
      setProducts(Array.isArray(prodRes.data) ? prodRes.data : prodRes.data.products || []);
      setCategories(Array.isArray(catRes.data) ? catRes.data : catRes.data.categories || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    API.get("/brands")
      .then(res => setBrands(res.data.brands || []))
      .catch(err => console.error("Brands load failed:", err));
  }, []);

  const openModal = (product = null) => {
    setActiveTab("basic");
    if (product) {
      setEditingId(product.id);
      
      let gallery = [];
      try { gallery = typeof product.gallery_urls === "string" ? JSON.parse(product.gallery_urls) : (product.gallery_urls || []); } catch (e) { gallery = []; }
      if (product.image_url && !gallery.includes(product.image_url)) gallery.unshift(product.image_url);

      let parsedVariants = [];
      try { parsedVariants = typeof product.variants === "string" ? JSON.parse(product.variants) : (product.variants || []); } catch (e) { parsedVariants = []; }

      setFormData({
        name: product.name || "", name_si: product.name_si || "", description: product.description || "",
        price: product.price ?? "", sale_price: product.sale_price ?? "", dropship_price: product.dropship_price ?? "",
        stock_qty: product.stock_qty || 0, category_id: product.category_id || (categories[0]?.id || ""),
        brand_id: product.brand_id ?? "",
        meta_title: product.meta_title || "",
        meta_description: product.meta_description || "",
        is_active: product.is_active ?? 1, is_nagnail_official: product.is_nagnail_official ?? 1,
        sku: product.sku || "", warehouse_location: product.warehouse_location || "",
        image_url: product.image_url || "", gallery_urls: gallery, video_url: product.video_url || "", variants: parsedVariants
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "", name_si: "", description: "", price: "", sale_price: "", dropship_price: "", stock_qty: 0,
        category_id: categories[0]?.id || "", brand_id: "", meta_title: "", meta_description: "", is_active: 1, is_nagnail_official: 1, sku: "", warehouse_location: "",
        image_url: "", gallery_urls: [], video_url: "", variants: []
      });
    }
    setModalOpen(true);
  };

  const handleFileUpload = async (e, type) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    if (type === "image") setUploadingImg(true);
    if (type === "video") setUploadingVid(true);

    try {
      const uploadedUrls = [];
      for (const file of files) {
        const data = new FormData();
        data.append("file", file);
        const res = await API.post("/upload", data, { headers: { "Content-Type": "multipart/form-data" } });
        let url = res.data.url || res.data.filename;
        if (!url.startsWith("http") && !url.startsWith("/")) url = `/images/${url}`;
        if (res.data.success) uploadedUrls.push(url);
      }

      if (type === "image") {
        setFormData(prev => {
          const newGallery = [...(prev.gallery_urls || []), ...uploadedUrls];
          return { ...prev, gallery_urls: newGallery, image_url: prev.image_url || newGallery[0] || "" };
        });
      } else if (type === "video") {
        setFormData(prev => ({ ...prev, video_url: uploadedUrls[0] || "" }));
      }
    } catch (err) { alert("Failed to upload file(s)."); } finally {
      setUploadingImg(false); setUploadingVid(false);
    }
  };

  const removeImage = (indexToRemove) => {
    setFormData(prev => {
      const newGallery = prev.gallery_urls.filter((_, idx) => idx !== indexToRemove);
      return { ...prev, gallery_urls: newGallery, image_url: newGallery.includes(prev.image_url) ? prev.image_url : (newGallery[0] || "") };
    });
  };

  const addVariant = () => {
    setFormData(prev => ({ ...prev, variants: [...(prev.variants || []), { id: Date.now(), name: "", price: "", sku: "", stock: 0 }] }));
  };

  const updateVariant = (index, field, value) => {
    const updatedVariants = [...formData.variants];
    updatedVariants[index][field] = value;
    setFormData({ ...formData, variants: updatedVariants });
  };

  const removeVariant = (index) => {
    const updatedVariants = formData.variants.filter((_, i) => i !== index);
    setFormData({ ...formData, variants: updatedVariants });
  };



  // NN-SEO-AUTOFILL-16C
  const generateSeoDraft = () => {
    const clean = text => String(text || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/\\s+/g, " ")
      .trim();

    const productName = clean(formData.name);
    const productDescription = clean(formData.description);

    if (!productName) {
      alert("Enter a product name on the Basic tab first.");
      setActiveTab("basic");
      return;
    }

    const draftTitle = `${productName} | Buy Online Sri Lanka`;
    const title = draftTitle.length <= 65
      ? draftTitle
      : productName.slice(0, 65).trim();

    const intro = productDescription
      ? productDescription.slice(0, 110).trim()
      : `Shop ${productName} online in Sri Lanka.`;

    const description = (
      `${intro.replace(/[.,;:!?\\s]+$/, "")}. ` +
      "Order from NagNail with Cash on Delivery in Sri Lanka."
    ).slice(0, 170).trim();

    const existingTitle = (formData.meta_title || "").trim();
    const existingDescription = (formData.meta_description || "").trim();

    if ((existingTitle || existingDescription) &&
        !window.confirm(
          "Existing SEO fields contain text. Replace them with generated drafts?"
        )) return;

    setFormData(prev => ({
      ...prev,
      meta_title: title,
      meta_description: description
    }));
  };

  // NN-SEO-SCORE-16B
  const getSeoAudit = () => {
    const title = (formData.meta_title || "").trim();
    const name = (formData.name || "").trim();
    const description = (formData.meta_description || "").trim();
    const hasBrand = Boolean(formData.brand_id);
    const hasImage = Boolean(formData.image_url);
    const hasSku = Boolean((formData.sku || "").trim());
    const hasPrice = Number(formData.price) > 0;

    const checks = [
      {
        label: "Product name",
        passed: name.length >= 10 && name.length <= 150,
        points: 15,
        advice: "Use a clear, accurate product name (10–150 characters)."
      },
      {
        label: "SEO meta title",
        passed: title.length >= 30 && title.length <= 65,
        points: 20,
        advice: "Write a descriptive SEO title, ideally 30–65 characters."
      },
      {
        label: "SEO meta description",
        passed: description.length >= 110 && description.length <= 170,
        points: 20,
        advice: "Write a useful description, ideally 110–170 characters."
      },
      {
        label: "Product image",
        passed: hasImage,
        points: 15,
        advice: "Upload a clear image of the actual product."
      },
      {
        label: "Product brand",
        passed: hasBrand,
        points: 10,
        advice: "Select the verified manufacturer brand, if available.",
        optional: true
      },
      {
        label: "SKU",
        passed: hasSku,
        points: 10,
        advice: "Add your internal product SKU.",
        optional: true
      },
      {
        label: "Valid selling price",
        passed: hasPrice,
        points: 10,
        advice: "Enter a valid selling price in LKR."
      }
    ];

    const score = checks.reduce(
      (sum, check) => sum + (check.passed ? check.points : 0),
      0
    );

    return { score, checks };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.price === "" || formData.price === null || isNaN(parseFloat(formData.price))) {
      alert("Please enter a valid Selling Price on the Basic tab."); setActiveTab("basic"); return;
    }

    const makeFriendly = (url) => {
      if (!url) return "";
      if (url.startsWith("http") || url.startsWith("/")) return url;
      return `/images/${url}`;
    };

    try {
      const payload = { 
        ...formData,
        brand_id: formData.brand_id || null,
        meta_title: formData.meta_title.trim() || null,
        meta_description: formData.meta_description.trim() || null,
        price: parseFloat(formData.price) || 0,
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : 0,
        dropship_price: formData.dropship_price ? parseFloat(formData.dropship_price) : 0,
        stock_qty: parseInt(formData.stock_qty) || 0,
        image_url: makeFriendly(formData.image_url),
        video_url: makeFriendly(formData.video_url),
        gallery_urls: formData.gallery_urls.map(makeFriendly),
        variants: JSON.stringify(formData.variants)
      };

      if (editingId) {
        await API.put(`/products/${editingId}`, payload);
        await API.put(`/products/${editingId}/specs`, specs).catch(() => alert("Product saved but specs failed to save"));
      } else {
        { const nr = await API.post("/products", payload); if (nr.data && nr.data.id) await API.put(`/products/${nr.data.id}/specs`, specs).catch(() => {}); }
      }
      setModalOpen(false);
      fetchData();
    } catch (e) { alert(e.response?.data?.error || "Failed to save product"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try { await API.delete(`/products/${id}`); fetchData(); } catch (e) { alert("Failed to delete product."); }
  };

  const filtered = products.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Package className="w-7 h-7 text-indigo-600" /> Products Catalog</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage warehouse inventory, dropship items, and ERP tracking</p>
        </div>
        <button onClick={() => openModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition shadow-sm"><Plus className="w-4 h-4" /> Add New Product</button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex justify-between items-center shadow-sm">
        <div className="relative w-96">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input type="text" placeholder="Search products by name or SKU..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50" />
        </div>
        <div className="text-sm text-slate-500">Total Products: <span className="font-bold text-slate-800">{filtered.length}</span></div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <th className="p-4">Product Info</th><th className="p-4">Source & Bin</th><th className="p-4">Pricing</th><th className="p-4">Stock</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? <tr><td colSpan="6" className="p-8 text-center text-slate-400">Loading products...</td></tr> : filtered.length === 0 ? <tr><td colSpan="6" className="p-8 text-center text-slate-400">No products found.</td></tr> : filtered.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                      {p.image_url ? <img src={getFullImageUrl(p.image_url)} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-slate-400" />}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 line-clamp-1">{p.name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">SKU: {p.sku || <span className="text-slate-300">N/A</span>}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase rounded-full mb-1 ${p.is_nagnail_official ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"}`}>{p.is_nagnail_official ? "NagNail Warehouse" : "Dropshipping"}</div>
                  <div className="text-xs font-mono font-bold text-amber-700 mt-1">{p.is_nagnail_official ? (p.warehouse_location ? `Bin: ${p.warehouse_location}` : "Bin: Unassigned") : ""}</div>
                </td>
                <td className="p-4">
                  <div className="font-semibold text-slate-800">LKR {parseFloat(p.price || 0).toLocaleString()}</div>
                  {p.sale_price > 0 && <div className="text-xs text-rose-500 line-through">LKR {parseFloat(p.sale_price).toLocaleString()}</div>}
                </td>
                <td className="p-4"><span className={`font-bold ${p.stock_qty <= 5 ? "text-rose-600" : "text-emerald-600"}`}>{p.stock_qty}</span> <span className="text-xs text-slate-500 ml-1">units</span></td>
                <td className="p-4">
                  {p.is_active ? <span className="flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle className="w-3.5 h-3.5" /> Active</span> : <span className="flex items-center gap-1 text-xs font-bold text-slate-400"><XCircle className="w-3.5 h-3.5" /> Hidden</span>}
                </td>
                <td className="p-4 text-right">
                  <button onClick={() => openModal(p)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition mr-1"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(p.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh]">
            <div className="flex-shrink-0 flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Package className="w-5 h-5 text-indigo-600" /> {editingId ? "Edit Product Details" : "Add New Product"}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
            </div>
            
            <div className="flex-shrink-0 flex px-6 border-b border-slate-200 gap-6 pt-2 bg-slate-50/50">
              {["basic", "images", "variants", "specs", "seo"].map(tab => (
                <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`pb-3 text-sm font-bold capitalize transition-all ${activeTab === tab ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}>
                  {tab === "images" ? "Images & Video" : tab === "seo" ? "SEO & Google" : tab}
                </button>
              ))}
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {activeTab === "basic" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2"><label className="block text-xs font-bold text-slate-600 uppercase mb-1">Product Title (English) *</label><input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-slate-50" /></div>
                    <div className="col-span-2"><label className="block text-xs font-bold text-slate-600 uppercase mb-1">Product Title (Sinhala)</label><input type="text" value={formData.name_si} onChange={e => setFormData({ ...formData, name_si: e.target.value })} className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-slate-50" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div><label className="block text-xs font-bold text-slate-600 uppercase mb-1">Category *</label><select value={formData.category_id} onChange={e => setFormData({ ...formData, category_id: e.target.value })} className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50">{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                    <div><label className="block text-xs font-bold text-slate-600 uppercase mb-1">Status</label><select value={formData.is_active} onChange={e => setFormData({ ...formData, is_active: parseInt(e.target.value) })} className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50"><option value={1}>Active (Visible)</option><option value={0}>Hidden (Draft)</option></select></div>
                    <div><label className="block text-xs font-bold text-slate-600 uppercase mb-1">Stock Quantity *</label><input type="number" required value={formData.stock_qty} onChange={e => setFormData({ ...formData, stock_qty: parseInt(e.target.value) || 0 })} className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50" /></div>
                  </div>
                  <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl grid grid-cols-3 gap-4">
                    <div><label className="block text-xs font-bold text-emerald-800 uppercase mb-1">Selling Price (LKR) *</label><input type="number" required value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full border border-emerald-200 p-2.5 rounded-lg text-sm bg-white" /></div>
                    <div><label className="block text-xs font-bold text-emerald-800 uppercase mb-1">Sale Price (LKR)</label><input type="number" value={formData.sale_price} onChange={e => setFormData({ ...formData, sale_price: e.target.value })} className="w-full border border-emerald-200 p-2.5 rounded-lg text-sm bg-white" /></div>
                    <div><label className="block text-xs font-bold text-emerald-800 uppercase mb-1">Dropship Price</label><input type="number" value={formData.dropship_price} onChange={e => setFormData({ ...formData, dropship_price: e.target.value })} className="w-full border border-emerald-200 p-2.5 rounded-lg text-sm bg-white" /></div>
                  </div>
                  <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                    <div className="mb-4"><label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Fulfillment Source</label><select value={formData.is_nagnail_official} onChange={e => setFormData({ ...formData, is_nagnail_official: parseInt(e.target.value) })} className="w-full border border-indigo-200 p-2.5 rounded-lg text-sm font-semibold text-indigo-900 bg-white"><option value={1}>NagNail Official Warehouse</option><option value={0}>Dropshipping Supplier</option></select></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-xs font-bold text-indigo-800 uppercase mb-1">SKU</label><input type="text" value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} className="w-full border border-indigo-200 p-2.5 rounded-lg text-sm bg-white" /></div>
                      <div><label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Warehouse Bin Location</label><input type="text" value={formData.warehouse_location} onChange={e => setFormData({ ...formData, warehouse_location: e.target.value })} className="w-full border border-indigo-200 p-2.5 rounded-lg text-sm bg-white" /></div>
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-xs font-bold text-slate-600 uppercase mb-1">Description <Sparkles className="w-3 h-3 text-amber-500" /></label>
                    <RichTextEditor
                      value={formData.description}
                      onChange={(html) => setFormData({ ...formData, description: html })}
                    />
                  </div>
                </>
              )}

              {activeTab === "images" && (
                <div className="space-y-6">
                  <div className="p-5 border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-2xl bg-indigo-50/30 transition text-center">
                    <label className="cursor-pointer block">
                      <div className="flex flex-col items-center justify-center">
                        {uploadingImg ? <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-2" /> : <Upload className="w-12 h-12 text-indigo-600 mb-2 p-2 bg-indigo-100 rounded-full" />}
                        <span className="text-sm font-bold text-indigo-900">Upload Product Images</span>
                        <span className="text-xs text-slate-500 mt-1">Select one or more image files</span>
                      </div>
                      <input type="file" multiple accept="image/*" onChange={(e) => handleFileUpload(e, "image")} disabled={uploadingImg} className="hidden" />
                    </label>
                    {formData.gallery_urls.length > 0 && (
                      <div className="mt-6 text-left">
                        <span className="text-xs font-bold text-slate-500 uppercase mb-3 block">Gallery:</span>
                        <div className="flex flex-wrap gap-4">
                          {formData.gallery_urls.map((url, idx) => (
                            <div key={idx} className="relative w-28 h-28 rounded-xl border-2 border-slate-200 overflow-hidden bg-white shadow-sm group">
                              <img src={getFullImageUrl(url)} alt="Gallery" className="w-full h-full object-cover" />
                              <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"><X className="w-4 h-4"/></button>
                              {formData.image_url === url ? (
                                <div className="absolute bottom-0 left-0 right-0 bg-indigo-600/90 text-white text-[9px] font-bold text-center py-0.5">MAIN IMAGE</div>
                              ) : (
                                <button type="button" onClick={() => setFormData({ ...formData, image_url: url })} className="absolute bottom-0 left-0 right-0 bg-slate-800/80 text-white text-[9px] font-bold text-center py-0.5 opacity-0 group-hover:opacity-100 transition">SET AS MAIN</button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-5 border-2 border-dashed border-rose-200 hover:border-rose-400 rounded-2xl bg-rose-50/30 transition text-center">
                    <label className="cursor-pointer block">
                      <div className="flex flex-col items-center justify-center">
                        {uploadingVid ? <Loader2 className="w-10 h-10 text-rose-600 animate-spin mb-2" /> : <Video className="w-12 h-12 text-rose-600 mb-2 p-2 bg-rose-100 rounded-full" />}
                        <span className="text-sm font-bold text-rose-900">Upload Product Video</span>
                      </div>
                      <input type="file" accept="video/*" onChange={(e) => handleFileUpload(e, "video")} disabled={uploadingVid} className="hidden" />
                    </label>
                    {formData.video_url && (
                      <div className="mt-4 flex flex-col items-center">
                        <video src={getFullImageUrl(formData.video_url)} controls className="w-full max-w-md max-h-48 rounded-xl border border-slate-200 bg-black shadow-sm" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "seo" && (() => {
                const audit = getSeoAudit();
                return (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-800">
                          Smart SEO Score
                        </h3>
                        <p className="text-xs text-slate-500">
                          Internal product SEO completeness checklist
                        </p>
                      </div>
                      <span className="text-2xl font-extrabold text-indigo-700">
                        {audit.score}/100
                      </span>
                    </div>

                    <div className="h-2 rounded-full bg-indigo-100 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all"
                        style={{ width: `${audit.score}%` }}
                      />
                    </div>

                    <div className="space-y-2">
                      {audit.checks.map(check => (
                        <div key={check.label} className="flex items-start gap-2 text-sm">
                          <span className={check.passed ? "text-emerald-600" : "text-amber-600"}>
                            {check.passed ? "✓" : "!"}
                          </span>
                          <div>
                            <span className="font-semibold text-slate-700">
                              {check.label}
                            </span>
                            <span className="text-xs text-slate-500 ml-2">
                              {check.points} pts
                              {check.optional ? " · optional" : ""}
                            </span>
                            {!check.passed && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                {check.advice}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-slate-500">
                      These are editorial recommendations, not Google ranking
                      factors or Merchant Center approval requirements.
                      Do not invent a brand or SKU just to increase the score.
                    </p>
                  </div>
                );
              })()}

              {activeTab === "seo" && (
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-bold text-slate-800">SEO & Google</h3>
                      <button
                        type="button"
                        onClick={generateSeoDraft}
                        className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
                      >
                        ✨ Generate SEO Draft
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Optimize how this product appears in Google Search.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Product Brand
                    </label>
                    <select
                      value={formData.brand_id || ""}
                      onChange={e => setFormData(prev => ({ ...prev, brand_id: e.target.value }))}
                      className="w-full border border-slate-200 p-2.5 rounded-lg text-sm"
                    >
                      <option value="">Unbranded / Not specified</option>
                      {brands.map(brand => (
                        <option key={brand.id} value={brand.id}>{brand.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                      Select only the actual manufacturer brand. Manage brands in the Brands section.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      SEO Meta Title
                    </label>
                    <input
                      type="text"
                      maxLength={160}
                      value={formData.meta_title || ""}
                      onChange={e => setFormData(prev => ({ ...prev, meta_title: e.target.value }))}
                      placeholder={formData.name || "Product name - Buy Online in Sri Lanka"}
                      className="w-full border border-slate-200 p-2.5 rounded-lg text-sm"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {(formData.meta_title || "").length} characters · Aim for a clear, concise title.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      SEO Meta Description
                    </label>
                    <textarea
                      rows={4}
                      maxLength={320}
                      value={formData.meta_description || ""}
                      onChange={e => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                      placeholder="Describe the product, key features and why customers should buy it."
                      className="w-full border border-slate-200 p-2.5 rounded-lg text-sm"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {(formData.meta_description || "").length} characters · Recommended starting point: around 120–160.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-500 mb-2">
                      Google Search Preview (illustrative)
                    </p>
                    <p className="text-xs text-emerald-700 break-all">
                      https://nagnail.lk/product/{editingId || "new-product"}
                    </p>
                    <p className="text-base text-blue-700 font-medium mt-1 break-words">
                      {formData.meta_title || formData.name || "Product Title"}
                    </p>
                    <p className="text-sm text-slate-600 mt-1 break-words">
                      {formData.meta_description || "Add a meta description to preview your search snippet."}
                    </p>
                    <p className="text-xs text-slate-500 mt-3">
                      Google may rewrite titles and snippets. This is not a guaranteed appearance.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "specs" && (<div className="p-1"><SpecsEditor value={specs} onChange={setSpecs} /></div>)}
              {activeTab === "variants" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                    <div>
                      <h3 className="text-sm font-bold text-indigo-900">Product Variations</h3>
                      <p className="text-xs text-indigo-700">Add different colors, sizes, or types.</p>
                    </div>
                    <button type="button" onClick={addVariant} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition"><PlusCircle className="w-4 h-4" /> Add Variant</button>
                  </div>
                  {formData.variants.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 border border-slate-200 border-dashed rounded-xl"><Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-500">No variants added.</p></div>
                  ) : (
                    <div className="space-y-3">
                      {formData.variants.map((v, index) => (
                        <div key={v.id || index} className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-xl relative group">
                          <button type="button" onClick={() => removeVariant(index)} className="absolute -top-2 -right-2 bg-white border border-slate-200 text-rose-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition shadow-sm hover:bg-rose-50"><X className="w-4 h-4" /></button>
                          <div className="grid grid-cols-4 gap-3 w-full">
                            <div className="col-span-1"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Variant Name</label><input type="text" placeholder="e.g. Red - Size L" value={v.name || ""} onChange={(e) => updateVariant(index, "name", e.target.value)} className="w-full border border-slate-200 p-2 rounded-lg text-sm bg-slate-50" /></div>
                            <div className="col-span-1"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Price (LKR)</label><input type="number" placeholder="Price" value={v.price || ""} onChange={(e) => updateVariant(index, "price", e.target.value)} className="w-full border border-slate-200 p-2 rounded-lg text-sm bg-slate-50" /></div>
                            <div className="col-span-1"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Stock</label><input type="number" placeholder="Qty" value={v.stock || 0} onChange={(e) => updateVariant(index, "stock", parseInt(e.target.value))} className="w-full border border-slate-200 p-2 rounded-lg text-sm bg-slate-50" /></div>
                            <div className="col-span-1"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">SKU</label><input type="text" placeholder="Variant SKU" value={v.sku || ""} onChange={(e) => updateVariant(index, "sku", e.target.value)} className="w-full border border-slate-200 p-2 rounded-lg text-sm bg-slate-50 font-mono" /></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex-shrink-0 flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-600 font-semibold text-sm hover:bg-white transition">Cancel</button>
              <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition shadow-md">{editingId ? "Save Changes" : "Create Product"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
