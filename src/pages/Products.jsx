import React, { useState, useEffect } from "react";
import RichTextEditor from "../components/RichTextEditor";
import SpecsEditor from "../components/SpecsEditor"; // NN-SPECS
import API from "../api";
import { Package, Search, Plus, Edit, Trash2, CheckCircle, XCircle, Sparkles, Image as ImageIcon, Video, Layers, Upload, Loader2, PlusCircle, X, Filter, RotateCcw, ChevronLeft, ChevronRight, Eye, Boxes, AlertTriangle, BarChart3 } from "lucide-react";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  // NN-PRODUCTS-CATALOG-V4: client-side filters never alter stored product data.
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [skuFilter, setSkuFilter] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const resetFilters = () => {
    setSearch(""); setSourceFilter("all"); setStatusFilter("all");
    setStockFilter("all"); setCategoryFilter("all"); setBrandFilter("all");
    setSkuFilter("all"); setMinPrice(""); setMaxPrice(""); setSortBy("newest"); setPage(1);
  };
  const changeFilter = (setter, value) => { setter(value); setPage(1); };

  
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
    category_id: "", brand_id: "", meta_title: "", meta_description: "", is_active: 1, is_nagnail_official: 1, sku: "", gtin: "", mpn: "", warehouse_location: "",
    image_url: "", gallery_urls: [], video_url: "", variants: []
  });

  const [newCategory, setNewCategory] = useState(null);
  const [categoryNotice, setCategoryNotice] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  const normalizeCategory = value => String(value ?? "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ").trim();

  const createCategory = async () => {
    const name = newCategory?.trim();
    const slug = normalizeCategory(name).replace(/ /g, "-");
    if (creatingCategory) return;
    if (!slug) {
      setCategoryNotice("Enter a category name in English.");
      return;
    }

    const findExisting = list => list.find(category =>
      normalizeCategory(category.name) === normalizeCategory(name) || category.slug === slug
    );
    const selectCategory = category => {
      if (Number(category.is_active ?? 1) !== 1) {
        setCategoryNotice("This category already exists but is inactive. Enable it in Categories.");
        return;
      }
      setFormData(previous => ({ ...previous, category_id: String(category.id) }));
      setNewCategory(null);
      setCategoryNotice(`${category.name} selected.`);
    };

    setCreatingCategory(true);
    setCategoryNotice("");
    try {
      const { data } = await API.get("/categories");
      const latest = Array.isArray(data) ? data : data.categories;
      if (!Array.isArray(latest)) throw new Error("Could not load categories.");
      setCategories(latest);

      const existing = findExisting(latest);
      if (existing) {
        selectCategory(existing);
        return;
      }

      try {
        const { data: created } = await API.post("/categories", { name, slug, is_active: 1 });
        if (!created?.success || !created.id) throw new Error("Could not create the category.");
        const category = { id: created.id, name, slug, is_active: 1 };
        setCategories(previous => [...previous, category]);
        selectCategory(category);
      } catch (error) {
        // A second admin may have created this category since the first check.
        const { data: refreshed } = await API.get("/categories");
        const list = Array.isArray(refreshed) ? refreshed : refreshed.categories;
        const existing = Array.isArray(list) && findExisting(list);
        if (!existing) throw error;
        setCategories(list);
        selectCategory(existing);
      }
    } catch (error) {
      setCategoryNotice(error.response?.data?.error || error.message || "Could not create the category.");
    } finally {
      setCreatingCategory(false);
    }
  };

  const suggestCategory = (showFeedback = false) => {
    const normalize = value => String(value ?? "").toLowerCase()
      .replace(/[^a-z0-9]+/g, " ").trim();
    const title = normalize(formData.name);
    const available = categories.filter(category =>
      Number(category.is_active ?? 1) === 1 && category.id != null
    );
    const rules = [
      [/\b(flat irons?|hair straighteners?|hair curlers?|curling irons?|hair dryers?|blow dryers?|hair brushes?|hairbrushes)\b/, ["Hair Care"]],
      [/\b(electric grinders?|blenders?|mixer grinders?)\b/, ["Electric Grinders & Blenders", "Kitchen Appliances", "Kitchen Accessories"]],
      [/\bpower\s?banks?\b/, ["Power Banks", "Power Bank", "Powerbanks", "Powerbank"]],
      [/\b(bluetooth speakers?|wireless speakers?)\b/, ["Bluetooth Speakers", "Speakers"]],
      [/\bspeakers?\b/, ["Speakers", "Bluetooth Speakers"]],
      [/\b(laptop battery|notebook battery)\b/, ["Laptop Battery", "Laptop Batteries"]],
      [/\b(laptop charger|laptop adapter|notebook charger)\b/, ["Laptop Chargers", "Laptop Adapters"]],
      [/\b(laptop keyboard|notebook keyboard)\b/, ["Laptop Keyboards", "Laptop Keyboard"]],
      [/\b(laptop screen|notebook screen)\b/, ["Laptop Screens", "Laptop Screen"]],
      [/\b(kettle|rice cooker|blender|grinder|air fryer|toaster)\b/, ["Kitchen Appliances", "Kitchen Gadgets", "Kitchen Accessories"]],
      [/\b(earbuds?|ear buds?|earphones?|headphones?|headsets?)\b/, ["Headphones & Earphones", "Headphones & Headset", "Earphones"]],
      [/\b(printers?|inkjet|ecotank)\b/, ["Printers", "Printer"]],
    ];

    const rule = rules.find(([pattern]) => pattern.test(title));
    const preferred = rule?.[1].map(normalize) ?? [];
    const knownMatch = preferred
      .map(name => available.find(category => normalize(category.name) === name))
      .find(Boolean);

    const titleMatches = available.filter(category => {
      const name = normalize(category.name);
      return name.includes(" ") && (` ${title} `).includes(` ${name} `);
    });
    const category = knownMatch || (titleMatches.length === 1 ? titleMatches[0] : null);

    if (category) {
      setFormData(previous => ({ ...previous, category_id: String(category.id) }));
      setNewCategory(null);
      setCategoryNotice(`${category.name} selected.`);
    } else if (title) {
      setNewCategory(rule?.[1][0] ?? "");
      setCategoryNotice("Choose an existing category or add a new one.");
    } else if (showFeedback) {
      setCategoryNotice("Enter the English product title first.");
    }
  };

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
        stock_qty: product.stock_qty || 0, category_id: String(product.category_id || ""),
        brand_id: product.brand_id ?? "",
        meta_title: product.meta_title || "",
        meta_description: product.meta_description || "",
        is_active: product.is_active ?? 1, is_nagnail_official: product.is_nagnail_official ?? 1,
        sku: product.sku || "", gtin: product.gtin || "", mpn: product.mpn || "", warehouse_location: product.warehouse_location || "",
        image_url: product.image_url || "", gallery_urls: gallery, video_url: product.video_url || "", variants: parsedVariants
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "", name_si: "", description: "", price: "", sale_price: "", dropship_price: "", stock_qty: 0,
        category_id: "", brand_id: "", meta_title: "", meta_description: "", is_active: 1, is_nagnail_official: 1, sku: "", gtin: "", mpn: "", warehouse_location: "",
        image_url: "", gallery_urls: [], video_url: "", variants: []
      });
    }
    setNewCategory(null);
    setCategoryNotice("");
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

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = products.filter((p) => {
    const name = String(p.name || "").toLowerCase();
    const sku = String(p.sku || "").toLowerCase();
    const id = String(p.id || "");
    const stock = Number(p.stock_qty) || 0;
    const price = Number(p.price) || 0;
    if (normalizedSearch && !name.includes(normalizedSearch) && !sku.includes(normalizedSearch) && !id.includes(normalizedSearch)) return false;
    if (sourceFilter === "warehouse" && Number(p.is_nagnail_official) !== 1) return false;
    if (sourceFilter === "dropship" && Number(p.is_nagnail_official) !== 0) return false;
    if (statusFilter === "active" && Number(p.is_active) !== 1) return false;
    if (statusFilter === "hidden" && Number(p.is_active) !== 0) return false;
    if (stockFilter === "out" && stock > 0) return false;
    if (stockFilter === "low" && (stock <= 0 || stock > 5)) return false;
    if (stockFilter === "available" && stock <= 0) return false;
    if (categoryFilter !== "all" && String(p.category_id ?? "") !== categoryFilter) return false;
    if (brandFilter !== "all" && String(p.brand_id ?? "") !== brandFilter) return false;
    if (skuFilter === "missing" && String(p.sku || "").trim()) return false;
    if (skuFilter === "present" && !String(p.sku || "").trim()) return false;
    if (minPrice !== "" && Number.isFinite(Number(minPrice)) && price < Number(minPrice)) return false;
    if (maxPrice !== "" && Number.isFinite(Number(maxPrice)) && price > Number(maxPrice)) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === "name") return String(a.name || "").localeCompare(String(b.name || ""));
    if (sortBy === "priceLow") return (Number(a.price) || 0) - (Number(b.price) || 0);
    if (sortBy === "priceHigh") return (Number(b.price) || 0) - (Number(a.price) || 0);
    if (sortBy === "stockLow") return (Number(a.stock_qty) || 0) - (Number(b.stock_qty) || 0);
    if (sortBy === "stockHigh") return (Number(b.stock_qty) || 0) - (Number(a.stock_qty) || 0);
    const diff = (Number(b.id) || 0) - (Number(a.id) || 0);
    return sortBy === "oldest" ? -diff : diff;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleProducts = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const countActive = products.filter(p => Number(p.is_active) === 1).length;
  const countLow = products.filter(p => Number(p.stock_qty) > 0 && Number(p.stock_qty) <= 5).length;
  const countOut = products.filter(p => (Number(p.stock_qty) || 0) <= 0).length;
  const countNoSku = products.filter(p => !String(p.sku || "").trim()).length;
  const money = (value) => `LKR ${(Number(value) || 0).toLocaleString("en-LK")}`;
  const controlClass = "w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
  const activeFilterCount = [sourceFilter, statusFilter, stockFilter, categoryFilter, brandFilter, skuFilter].filter(v => v !== "all").length + Number(Boolean(search.trim())) + Number(minPrice !== "") + Number(maxPrice !== "");

  const ProductActions = ({ product }) => (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={() => openModal(product)} aria-label={`Edit ${product.name}`} title="Edit product" className="rounded-xl border border-indigo-100 bg-indigo-50 p-2.5 text-indigo-600 transition hover:bg-indigo-100"><Edit className="h-4 w-4" /></button>
      <button type="button" onClick={() => handleDelete(product.id)} aria-label={`Delete ${product.name}`} title="Delete product" className="rounded-xl border border-rose-100 bg-rose-50 p-2.5 text-rose-600 transition hover:bg-rose-100"><Trash2 className="h-4 w-4" /></button>
    </div>
  );

  return (
    <div className="min-h-full min-w-0 bg-slate-50 px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-extrabold uppercase tracking-[.18em] text-indigo-600">● NAGNAIL / INVENTORY</p>
            <h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl"><Package className="h-7 w-7 shrink-0 text-indigo-600" /> Products Catalog</h1>
            <p className="mt-2 text-sm text-slate-500">Manage warehouse and dropship products, inventory, pricing and SEO.</p>
          </div>
          <button type="button" onClick={() => openModal()} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"><Plus className="h-4 w-4" /> Add New Product</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total Products", count: products.length, icon: Package, shade: "text-indigo-600", click: resetFilters },
          { label: "Active", count: countActive, icon: CheckCircle, shade: "text-emerald-600", click: () => changeFilter(setStatusFilter, "active") },
          { label: "Low Stock (1–5)", count: countLow, icon: AlertTriangle, shade: "text-amber-600", click: () => changeFilter(setStockFilter, "low") },
          { label: "Out of Stock", count: countOut, icon: XCircle, shade: "text-rose-600", click: () => changeFilter(setStockFilter, "out") }
        ].map(item => <button key={item.label} type="button" onClick={item.click} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-200 hover:shadow-md sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2"><span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{item.label}</span><item.icon className={`h-5 w-5 shrink-0 ${item.shade}`} /></div>
          <div className="text-2xl font-extrabold tabular-nums text-slate-950 sm:text-3xl">{loading ? "—" : item.count}</div>
        </button>)}
      </div>

      <section aria-label="Product filters" className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><Filter className="h-4 w-4 text-indigo-600" /> Smart Product Filters {activeFilterCount > 0 && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">{activeFilterCount}</span>}</h2>
          <button type="button" onClick={resetFilters} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100"><RotateCcw className="h-3.5 w-3.5" /> Clear filters</button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <label className="relative sm:col-span-2 lg:col-span-2 xl:col-span-2"><span className="sr-only">Search products</span><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400"/><input value={search} onChange={e => changeFilter(setSearch,e.target.value)} placeholder="Search name, SKU or ID..." className={`${controlClass} pl-10`} /></label>
          <label><span className="sr-only">Product source</span><select className={controlClass} value={sourceFilter} onChange={e => changeFilter(setSourceFilter,e.target.value)}><option value="all">All sources</option><option value="warehouse">NagNail warehouse</option><option value="dropship">Dropshipping</option></select></label>
          <label><span className="sr-only">Status</span><select className={controlClass} value={statusFilter} onChange={e => changeFilter(setStatusFilter,e.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="hidden">Hidden</option></select></label>
          <label><span className="sr-only">Stock availability</span><select className={controlClass} value={stockFilter} onChange={e => changeFilter(setStockFilter,e.target.value)}><option value="all">All stock levels</option><option value="available">In stock</option><option value="low">Low stock (1–5)</option><option value="out">Out of stock (0)</option></select></label>
          <label><span className="sr-only">SKU status</span><select className={controlClass} value={skuFilter} onChange={e => changeFilter(setSkuFilter,e.target.value)}><option value="all">All SKUs</option><option value="missing">SKU missing</option><option value="present">Has SKU</option></select></label>
          <label><span className="sr-only">Category</span><select className={controlClass} value={categoryFilter} onChange={e => changeFilter(setCategoryFilter,e.target.value)}><option value="all">All categories</option>{categories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}</select></label>
          <label><span className="sr-only">Brand</span><select className={controlClass} value={brandFilter} onChange={e => changeFilter(setBrandFilter,e.target.value)}><option value="all">All brands</option>{brands.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}</select></label>
          <label><span className="sr-only">Minimum price</span><input className={controlClass} type="number" min="0" placeholder="Min LKR" value={minPrice} onChange={e => changeFilter(setMinPrice,e.target.value)} /></label>
          <label><span className="sr-only">Maximum price</span><input className={controlClass} type="number" min="0" placeholder="Max LKR" value={maxPrice} onChange={e => changeFilter(setMaxPrice,e.target.value)} /></label>
          <label className="sm:col-span-2"><span className="sr-only">Sort products</span><select className={controlClass} value={sortBy} onChange={e => changeFilter(setSortBy,e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name A–Z</option><option value="priceLow">Price: Low to High</option><option value="priceHigh">Price: High to Low</option><option value="stockLow">Stock: Low to High</option><option value="stockHigh">Stock: High to Low</option></select></label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
          <span>Showing <strong className="text-slate-800">{filtered.length}</strong> of <strong>{products.length}</strong> products{countNoSku > 0 ? ` · ${countNoSku} missing SKU` : ""}</span>
          <span>Filters change this view only — saved products stay unchanged</span>
        </div>
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Product results">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5"><h2 className="text-sm font-extrabold text-slate-900">Product Results</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{filtered.length} matched</span></div>
        {loading ? <div className="p-12 text-center text-sm text-slate-500">Loading products...</div> : filtered.length === 0 ? <div className="p-12 text-center"><Search className="mx-auto mb-3 h-8 w-8 text-slate-300"/><p className="font-bold text-slate-800">No matching products</p><button type="button" className="mt-3 text-sm font-semibold text-indigo-600 hover:underline" onClick={resetFilters}>Clear filters</button></div> : <>
          <div className="divide-y divide-slate-100 md:hidden">
            {visibleProducts.map(p => <article key={p.id} className="p-4 space-y-3">
              <div className="flex items-start gap-3"><div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">{p.image_url ? <img src={getFullImageUrl(p.image_url)} alt="" className="h-full w-full object-cover"/> : <ImageIcon className="m-4 h-7 w-7 text-slate-400" />}</div><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-bold text-slate-900">{p.name}</p><p className="mt-1 break-all font-mono text-[11px] text-slate-500">SKU: {p.sku || "Not set"}</p></div></div>
              <div className="grid grid-cols-2 gap-2 text-xs"><div><p className="text-slate-400">Price</p><p className="font-bold text-slate-900">{money(p.price)}</p></div><div><p className="text-slate-400">Stock</p><p className={`font-bold ${Number(p.stock_qty) <= 5 ? "text-rose-600" : "text-emerald-600"}`}>{p.stock_qty || 0} units</p></div><div><p className="text-slate-400">Source</p><p className="font-semibold text-slate-700">{Number(p.is_nagnail_official) === 1 ? "Warehouse" : "Dropshipping"}</p></div><div><p className="text-slate-400">Status</p><p className={`font-semibold ${Number(p.is_active) === 1 ? "text-emerald-600" : "text-slate-500"}`}>{Number(p.is_active) === 1 ? "Active" : "Hidden"}</p></div></div>
              <div className="flex items-center justify-end border-t border-slate-100 pt-2"><ProductActions product={p}/></div>
            </article>)}
          </div>
          <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[790px] table-fixed text-left text-sm"><thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500"><tr><th className="w-[34%] p-4">Product info</th><th className="w-[18%] p-4">Source & Bin</th><th className="w-[14%] p-4">Price</th><th className="w-[11%] p-4">Stock</th><th className="w-[11%] p-4">Status</th><th className="w-[12%] p-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{visibleProducts.map(p => <tr key={p.id} className="hover:bg-slate-50"><td className="p-4"><div className="flex min-w-0 items-center gap-3"><div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">{p.image_url ? <img src={getFullImageUrl(p.image_url)} alt="" className="h-full w-full object-cover"/> : <ImageIcon className="m-3 h-6 w-6 text-slate-400" />}</div><div className="min-w-0"><p className="line-clamp-2 font-semibold leading-5 text-slate-900" title={p.name}>{p.name}</p><p className="mt-1 truncate font-mono text-[11px] text-slate-400">SKU: {p.sku || "Not set"}</p></div></div></td><td className="p-4"><span className={`inline-flex rounded-lg px-2 py-1 text-[10px] font-extrabold uppercase ${Number(p.is_nagnail_official) === 1 ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700"}`}>{Number(p.is_nagnail_official) === 1 ? "Warehouse" : "Dropshipping"}</span>{Number(p.is_nagnail_official) === 1 && <p className="mt-2 truncate text-xs text-slate-500">Bin: {p.warehouse_location || "Unassigned"}</p>}</td><td className="p-4 font-bold text-slate-900">{money(p.price)}</td><td className="p-4"><span className={`font-bold ${Number(p.stock_qty) <= 5 ? "text-rose-600" : "text-emerald-600"}`}>{p.stock_qty || 0}</span><span className="ml-1 text-xs text-slate-400">units</span></td><td className="p-4"><span className={`inline-flex items-center gap-1 text-xs font-bold ${Number(p.is_active) === 1 ? "text-emerald-600" : "text-slate-400"}`}>{Number(p.is_active) === 1 ? <CheckCircle className="h-4 w-4"/> : <XCircle className="h-4 w-4"/>}{Number(p.is_active) === 1 ? "Active" : "Hidden"}</span></td><td className="p-4"><div className="flex justify-end"><ProductActions product={p}/></div></td></tr>)}</tbody></table></div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-4 text-xs text-slate-500 sm:px-5"><span>{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} products</span><div className="flex items-center gap-2"><button type="button" disabled={currentPage <= 1} onClick={() => setPage(v => Math.max(1,v - 1))} className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="h-4 w-4"/></button><span className="min-w-16 text-center font-semibold text-slate-700">{currentPage} / {totalPages}</span><button type="button" disabled={currentPage >= totalPages} onClick={() => setPage(v => Math.min(totalPages,v + 1))} className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Next page"><ChevronRight className="h-4 w-4"/></button></div></div>
        </>}
      </section>

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
                    <div className="col-span-2"><label className="block text-xs font-bold text-slate-600 uppercase mb-1">Product Title (English) *</label><input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} onBlur={() => { if (editingId == null && !formData.category_id) suggestCategory(); }} className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-slate-50" /></div>
                    <div className="col-span-2"><label className="block text-xs font-bold text-slate-600 uppercase mb-1">Product Title (Sinhala)</label><input type="text" value={formData.name_si} onChange={e => setFormData({ ...formData, name_si: e.target.value })} className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-slate-50" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div><div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                      <label htmlFor="product-category" className="text-xs font-bold text-slate-600 uppercase">Category *</label>
                      <button type="button" disabled={creatingCategory} onClick={() => suggestCategory(true)} className="text-xs font-semibold text-indigo-700 hover:underline">Suggest Category</button>
                    </div><select id="product-category" required value={String(formData.category_id ?? "")} onChange={e => setFormData({ ...formData, category_id: e.target.value })} className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50">
                      <option value="" disabled>Select Category</option>
                      {formData.category_id && !categories.some(c => String(c.id) === String(formData.category_id)) && (
                        <option value={String(formData.category_id)}>Saved category #{formData.category_id}</option>
                      )}
                      {categories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                    </select>
                    {categoryNotice && <p role="status" className="mt-1 text-xs text-slate-600">{categoryNotice}</p>}
                    {newCategory !== null && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <input type="text" aria-label="New category name" placeholder="New category name"
                          value={newCategory} onChange={event => setNewCategory(event.target.value)}
                          onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); createCategory(); } }}
                          disabled={creatingCategory}
                          className="w-full rounded-lg border border-slate-200 p-2 text-sm" />
                        <button type="button" disabled={creatingCategory || !newCategory.trim()}
                          onClick={createCategory}
                          className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                          {creatingCategory ? "Adding…" : "Add Category"}
                        </button>
                      </div>
                    )}
                    </div>
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

                  {/* NN-SEO-IDENTIFIERS-17D */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        GTIN / Barcode (Optional)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={14}
                        value={formData.gtin || ""}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          gtin: e.target.value
                        }))}
                        placeholder="EAN / UPC / GTIN"
                        className="w-full border border-slate-200 p-2.5 rounded-lg text-sm"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Enter the real manufacturer barcode only.
                        Supports GTIN-8, UPC-12, EAN-13 and GTIN-14.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        MPN / Manufacturer Part Number (Optional)
                      </label>
                      <input
                        type="text"
                        maxLength={100}
                        value={formData.mpn || ""}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          mpn: e.target.value
                        }))}
                        placeholder="e.g. Manufacturer model code"
                        className="w-full border border-slate-200 p-2.5 rounded-lg text-sm"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Use the actual manufacturer part number.
                        Leave blank if unknown.
                      </p>
                    </div>
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
