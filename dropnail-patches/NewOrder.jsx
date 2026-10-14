import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import API from "../api/config";
import Layout from "../components/Layout";
import {
  Package,
  Search,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Calculator,
  User,
  Phone,
  MapPin,
  Home,
  Tag,
  ShoppingBag,
  Sparkles,
  AlertTriangle,
  X
} from "lucide-react";

const fmt = (n) => Number(n || 0).toLocaleString("en-LK");
const suggestedPrice = (base) => Math.ceil((base * 1.35) / 100) * 100;

export default function NewOrder() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [qty, setQty] = useState(1); // NN-QTY
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "", city: "" });
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [placed, setPlaced] = useState(null);
  const [attributes, setAttributes] = useState([]);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [productImages, setProductImages] = useState([]);
  const [activeImg, setActiveImg] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [groupWith, setGroupWith] = useState(null); // NN-DS-B

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const pid = searchParams.get("product");
    if (pid && products.length > 0) {
      const p = products.find((x) => x.id === parseInt(pid));
      if (p) selectProduct(p);
    }
  }, [products, searchParams]);

  const fetchProducts = async () => {
    try {
      const res = await API.get("/catalog");
      if (res.data.success) setProducts(res.data.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const selectProduct = async (p) => {
    setSelected(p);
    setActiveImg(`https://nagnail.lk/images/${p.image_url}`);
    setSelectedVariants({});
    setSellingPrice("");
    setQty(1); // NN-QTY reset on new product
    try {
      const [imgRes, attrRes] = await Promise.all([
        fetch(`https://nagnail.lk/api/products/${p.id}/images`).then((r) => (r.ok ? r.json() : { success: false })),
        fetch(`https://nagnail.lk/api/products/${p.id}/attributes`).then((r) => (r.ok ? r.json() : { success: false })),
      ]);
      if (imgRes.success && imgRes.images?.length > 0) {
        setProductImages(imgRes.images);
        setActiveImg(`https://nagnail.lk/images/${imgRes.images[0].image_url}`);
      } else {
        setProductImages([]);
      }
      if (attrRes.success && attrRes.attributes?.length > 0) {
        setAttributes(attrRes.attributes);
        const defaults = {};
        attrRes.attributes.forEach((attr) => {
          if (attr.values?.length > 0) defaults[attr.id] = attr.values[0].id;
        });
        setSelectedVariants(defaults);
      } else {
        setAttributes([]);
      }
    } catch {
      setProductImages([]);
      setAttributes([]);
    }
    setStep(2);
  };

  const basePrice = selected ? parseFloat(selected.dropship_price || selected.price || 0) : 0;
  const sell = parseFloat(sellingPrice) || 0;
  const stockQty = selected ? parseInt(selected.stock_qty) || 0 : 0; // NN-QTY
  const maxQty = Math.min(50, Math.max(1, stockQty > 0 ? stockQty : 50)); // NN-QTY backend cap = 50
  const qtyNum = Math.max(1, Math.min(maxQty, parseInt(qty) || 1)); // NN-QTY
  const profit = (sell - basePrice) * qtyNum; // NN-QTY total profit
  const suggested = suggestedPrice(basePrice);

  const handlePlace = async () => {
    if (!customer.name || !customer.phone || !customer.address || !customer.city) {
      return alert("Please fill all required customer details");
    }
    if (sell <= basePrice) {
      return alert(`Selling price must be higher than your cost (LKR ${fmt(basePrice)})`);
    }
    if (stockQty > 0 && qtyNum > stockQty) {
      return alert(`Only ${stockQty} in stock — please reduce quantity`); // NN-QTY
    }
    setLoading(true);
    try {
      const res = await API.post("/orders", {
        product_id: selected.id,
        quantity: qtyNum, // NN-QTY
        selling_price: sell,
        customer_price: sell,
        group_with: groupWith,
        selected_variants: Object.keys(selectedVariants).length > 0 ? selectedVariants : null,
        customer_name: customer.name,
        customer_phone: customer.phone, customer_phone2: customer.phone2 || null,
        customer_address: customer.address,
        customer_city: customer.city,
        city: customer.city,
        notes,
      });
      if (res.data.success) {
        setPlaced(res.data.order || res.data);
        setStep(4);
      } else {
        alert(res.data.error || "Failed to place order");
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  const filtered = products.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  const steps = [
    { num: 1, label: "Product" },
    { num: 2, label: "Price" },
    { num: 3, label: "Customer" },
    { num: 4, label: "Done" },
  ];

  // ── SUCCESS SCREEN ──
  if (step === 4 && placed) {
    return (
      <Layout>
        <div className="max-w-md mx-auto py-10 px-4 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Order Placed!</h2>
          <p className="text-slate-500 text-sm mb-8">
            NagNail warehouse will pack &amp; ship this order to your customer.
          </p>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 text-left mb-6 space-y-3">
            {[
              { label: "Order Number", value: placed.order_number || "—" },
              { label: "Customer", value: customer.name },
              { label: "Product", value: selected?.name },
              { label: "Quantity", value: "×" + qtyNum }, // NN-QTY
              { label: "Your Cost (per item)", value: `LKR ${fmt(basePrice)}` },
              { label: "Selling Price (per item)", value: `LKR ${fmt(sell)}` },
              {
                label: qtyNum > 1 ? `Your Profit (${qtyNum} items)` : "Your Profit",
                value: `+ LKR ${fmt(profit)}`,
                highlight: true,
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0"
              >
                <span className="text-slate-500 text-sm font-medium">{row.label}</span>
                <span
                  className={`font-bold text-sm text-right max-w-[60%] truncate ${
                    row.highlight ? "text-emerald-600 text-base font-extrabold" : "text-slate-800"
                  }`}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => { setGroupWith(placed.group_no || placed.order_number); setPlaced(null); setSelected(null); setSellingPrice(""); setStep(1); }}
            className="w-full mb-3 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-sm transition shadow-sm"
          >
            ➕ මේ customer ටම තව product එකක් (එකම parcel එක)
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setPlaced(null);
                setStep(1);
                setSelected(null);
                setSellingPrice("");
                setCustomer({ name: "", phone: "", address: "", city: "" });
                setNotes("");
                setGroupWith(null);
                setQty(1); // NN-QTY
              }}
              className="flex-1 border border-slate-300 text-slate-700 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 transition"
            >
              New Order
            </button>
            <Link
              to="/orders"
              className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition text-center shadow-sm"
            >
              View Orders
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        {groupWith && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-sm text-emerald-800 flex items-center justify-between gap-3">
            <span>📦 <b>{groupWith}</b> parcel එකටම එකතු වෙනවා — customer: <b>{customer.name}</b> (විස්තර ආයෙ දාන්න ඕනෑ නෑ)</span>
            <button onClick={() => setGroupWith(null)} className="text-xs font-bold underline shrink-0">Cancel</button>
          </div>
        )}
        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" /> Place New Order
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Select product → set selling price → enter customer details
          </p>
        </div>

        {/* Step Indicator */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      step > s.num
                        ? "bg-emerald-500 text-white"
                        : step === s.num
                        ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
                  </div>
                  <p
                    className={`text-[10px] font-bold mt-1.5 uppercase tracking-wider ${
                      step === s.num ? "text-indigo-600" : "text-slate-400"
                    }`}
                  >
                    {s.label}
                  </p>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 rounded ${
                      step > s.num ? "bg-emerald-400" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ════════ STEP 1 — SELECT PRODUCT ════════ */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium bg-white shadow-sm"
                autoFocus
              />
            </div>

            {loadingProducts ? (
              <div className="py-16 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Loading catalog...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
                <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filtered.map((p) => {
                  const base = parseFloat(p.dropship_price || p.price || 0);
                  const earn = suggestedPrice(base) - base;
                  return (
                    <button
                      key={p.id}
                      onClick={() => selectProduct(p)}
                      disabled={p.stock_qty <= 0}
                      className="bg-white rounded-2xl border border-slate-200 p-3 text-left hover:border-indigo-400 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex gap-3 group"
                    >
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                        <img
                          src={`https://nagnail.lk/images/${p.image_url}`}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          onError={(e) => (e.target.src = "https://placehold.co/80x80?text=?")}
                        />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <p className="font-bold text-slate-800 text-sm line-clamp-2 leading-snug group-hover:text-indigo-600">
                            {p.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium mt-1 flex items-center gap-1">
                            <Tag className="w-3 h-3" /> {p.category_name || "General"}
                          </p>
                        </div>
                        <div className="flex gap-3 mt-2">
                          <span className="text-[11px] font-bold text-slate-500">
                            Cost: <span className="text-slate-800">LKR {fmt(base)}</span>
                          </span>
                          <span className="text-[11px] font-bold text-emerald-600">
                            +LKR {fmt(earn)}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════ STEP 2 — PRICE & VARIANTS ════════ */}
        {step === 2 && selected && (
          <div className="space-y-4">
            {/* Selected Product Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex gap-4">
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                <img
                  src={activeImg}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => (e.target.src = "https://placehold.co/96x96?text=?")}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm line-clamp-2">{selected.name}</p>
                <p className="text-xs text-slate-400 mt-1">{selected.category_name}</p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Your Cost</p>
                    <p className="font-extrabold text-slate-800 text-sm font-mono">LKR {fmt(basePrice)}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-emerald-600 font-bold uppercase">Suggested</p>
                    <p className="font-extrabold text-emerald-700 text-sm font-mono">LKR {fmt(suggested)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Thumbnails */}
            {productImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {productImages.map((img, idx) => {
                  const url = `https://nagnail.lk/images/${img.image_url}`;
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveImg(url)}
                      className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition ${
                        activeImg === url ? "border-indigo-600" : "border-slate-200"
                      }`}
                    >
                      <img src={url} className="w-full h-full object-cover" alt="" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Variants */}
            {attributes.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <p className="font-bold text-slate-800 text-sm">Select Variants</p>
                {attributes.map((attr) => (
                  <div key={attr.id}>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      {attr.name}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {attr.values?.map((val) => (
                        <button
                          key={val.id}
                          onClick={() =>
                            setSelectedVariants((prev) => ({ ...prev, [attr.id]: val.id }))
                          }
                          className={`px-3.5 py-2 rounded-xl border text-sm font-semibold transition ${
                            selectedVariants[attr.id] === val.id
                              ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                              : "border-slate-200 text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          {attr.display_type === "color" && val.color_hex ? (
                            <span className="flex items-center gap-2">
                              <span
                                className="w-4 h-4 rounded-full border border-slate-300"
                                style={{ backgroundColor: val.color_hex }}
                              />
                              {val.value}
                            </span>
                          ) : (
                            val.value
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selling Price + Quantity */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-indigo-600" /> Set Selling Price
              </p>
              <p className="text-xs text-slate-400 mb-4">
                What will your customer pay? (Must be above LKR {fmt(basePrice)})
              </p>
              <div className="relative mb-4">
                <span className="absolute left-3.5 top-3 text-xs font-bold text-slate-400">LKR</span>
                <input
                  type="number"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder={`Suggested: ${fmt(suggested)}`}
                  min={basePrice + 1}
                  step={50}
                  className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-bold"
                  autoFocus
                />
              </div>

              {/* NN-QTY: Quantity selector */}
              <div className="mb-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Quantity{" "}
                  <span className="text-slate-400 normal-case font-medium">
                    (1–{maxQty}{stockQty > 0 ? ` · ${fmt(stockQty)} in stock` : ""})
                  </span>
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, (parseInt(q) || 1) - 1))}
                    className="w-12 h-12 rounded-xl border border-slate-200 text-xl font-extrabold text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={qty}
                    min={1}
                    max={maxQty}
                    onChange={(e) =>
                      setQty(
                        e.target.value === ""
                          ? ""
                          : Math.max(1, Math.min(maxQty, parseInt(e.target.value) || 1))
                      )
                    }
                    className="w-24 text-center py-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-lg font-extrabold font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(maxQty, (parseInt(q) || 1) + 1))}
                    className="w-12 h-12 rounded-xl border border-slate-200 text-xl font-extrabold text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition"
                  >
                    +
                  </button>
                  {qtyNum > 1 && (
                    <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1.5 rounded-lg">
                      ×{qtyNum} items
                    </span>
                  )}
                </div>
              </div>

              {sell > 0 && (
                <div
                  className={`rounded-xl p-4 text-center border ${
                    profit > 0
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-rose-50 border-rose-200"
                  }`}
                >
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Your Profit
                  </p>
                  <p
                    className={`text-2xl font-extrabold font-mono ${
                      profit > 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {profit > 0 ? "+" : ""}LKR {fmt(profit)}
                  </p>
                  {qtyNum > 1 && sell > basePrice && (
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      LKR {fmt(sell - basePrice)} × {qtyNum} items
                    </p>
                  )}
                  {sell <= basePrice && (
                    <p className="text-xs text-rose-500 font-medium mt-1 flex items-center justify-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Price must be higher than cost
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Nav Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 border border-slate-300 text-slate-600 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 transition flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={() => {
                  if (!sellingPrice || sell <= basePrice)
                    return alert("Please set a selling price higher than your cost");
                  setStep(3);
                }}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-sm flex items-center justify-center gap-1.5"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ════════ STEP 3 — CUSTOMER DETAILS ════════ */}
        {step === 3 && selected && (
          <div className="space-y-4">
            {/* Mini Summary */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-3">
              <img
                src={activeImg || `https://nagnail.lk/images/${selected.image_url}`}
                alt=""
                className="w-14 h-14 rounded-xl object-cover bg-white shrink-0"
                onError={(e) => (e.target.src = "https://placehold.co/56x56?text=?")}
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm line-clamp-1">{selected.name}</p>
                <p className="text-xs text-indigo-600 font-bold mt-1">
                  Sell: LKR {fmt(sell)} · Qty: ×{qtyNum} · Profit: +LKR {fmt(profit)}
                </p>
              </div>
            </div>

            {/* Customer Form */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <p className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" /> Customer Details
              </p>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    placeholder="Customer full name"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="tel"
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    placeholder="07XXXXXXXX"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium"
                  />
<input
                    type="tel"
                    value={customer.phone2 || ""}
                    onChange={(e) => setCustomer({ ...customer, phone2: e.target.value })}
                    placeholder="Phone 2 (optional)"
                    className="mt-2 w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Delivery Address *
                </label>
                <div className="relative">
                  <Home className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={customer.address}
                    onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                    placeholder="Street, house no, landmark..."
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  City *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={customer.city}
                    onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
                    placeholder="Colombo, Kandy, Galle..."
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special instructions..."
                  rows={2}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium resize-none"
                />
              </div>
            </div>

            {/* Nav Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 border border-slate-300 text-slate-600 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 transition flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handlePlace}
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Placing...
                  </>
                ) : (
                  <>
                    Place Order <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
