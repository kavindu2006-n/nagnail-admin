import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import API from "../api/config";
import Layout from "../components/Layout";
import {
  Clock, CheckCircle2, Package, Truck, Gift, XCircle, Search,
  Copy, Share2, MapPin, User, Phone, FileText, Plus, Navigation,
  Check, Loader2, ChevronRight, X
} from "lucide-react";

const STATUS_COLORS = {
  pending:    "bg-amber-50 text-amber-700 border-amber-200",
  confirmed:  "bg-blue-50 text-blue-700 border-blue-200",
  processing: "bg-indigo-50 text-indigo-700 border-indigo-200",
  shipped:    "bg-orange-50 text-orange-700 border-orange-200",
  delivered:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled:  "bg-red-50 text-red-700 border-red-200",
};

const STATUS_TIMELINE = [
  { key: "pending",    icon: Clock,        label: "Order Placed",   desc: "Waiting for confirmation" },
  { key: "confirmed",  icon: CheckCircle2, label: "Confirmed",      desc: "Confirmed by NagNail team" },
  { key: "processing", icon: Package,      label: "Processing",     desc: "Packed and prepared" },
  { key: "shipped",    icon: Truck,        label: "Shipped",        desc: "Out for delivery" },
  { key: "delivered",  icon: Gift,         label: "Delivered",      desc: "Successfully delivered" },
];

const STATUSES = ["all", "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
const fmtLKR = (n) => `LKR ${Number(n||0).toLocaleString("en-LK")}`;

function OrderTimeline({ order }) {
  const currentIdx = STATUS_TIMELINE.findIndex(s => s.key === order.status);

  return (
    <div className="py-4 px-2">
      {order.status === "cancelled" ? (
        <div className="flex items-center gap-4 bg-red-50 border border-red-100 rounded-xl p-4">
          <XCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-800">Order Cancelled</p>
            <p className="text-sm text-red-600 mt-0.5">This order has been cancelled.</p>
          </div>
        </div>
      ) : (
        <div className="relative">
          {STATUS_TIMELINE.map((step, idx) => {
            const done = idx <= currentIdx;
            const active = idx === currentIdx;
            const isLast = idx === STATUS_TIMELINE.length - 1;
            const Icon = step.icon;

            return (
              <div key={step.key} className="flex gap-4 mb-0">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border transition-all duration-300 ${
                    done
                      ? active
                        ? "bg-blue-600 border-blue-600 text-white ring-4 ring-blue-50"
                        : "bg-blue-50 border-blue-200 text-blue-600"
                      : "bg-gray-50 border-gray-200 text-gray-400"
                  }`}>
                    {done && !active ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  {!isLast && (
                    <div className={`w-0.5 h-10 mt-1 mb-1 transition-all duration-300 ${done && idx < currentIdx ? "bg-blue-200" : "bg-gray-100"}`} />
                  )}
                </div>
                <div className="flex-1 pb-6 pt-2">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold ${done ? "text-gray-900" : "text-gray-400"}`}>{step.label}</p>
                    {active && (
                      <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Current
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-1 ${done ? "text-gray-500" : "text-gray-400"}`}>{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



function ProductPicker({ onSelect, onCancel }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    API.get("/catalog")
      .then(res => { if (res.data.success) setItems(res.data.products || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter(p => p.name?.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="border border-emerald-200 bg-emerald-50/40 rounded-2xl p-3.5 mb-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-gray-800 text-xs">Select Product</span>
        <button type="button" onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-800 font-semibold">Cancel</button>
      </div>
      <input
        type="text"
        placeholder="Search products..."
        value={q}
        onChange={e => setQ(e.target.value)}
        className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 mb-2"
      />
      {loading ? (
        <div className="text-center py-4 text-xs text-gray-500"><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Loading items...</div>
      ) : (
        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
          {filtered.slice(0, 25).map(p => (
            <div
              key={p.id}
              onClick={() => onSelect(p)}
              className="flex items-center gap-2.5 p-2 bg-white rounded-xl border border-gray-100 hover:border-emerald-400 cursor-pointer transition active:scale-[0.99]"
            >
              <img src={`https://nagnail.lk/images/${p.image_url}`} alt="" className="w-10 h-10 rounded-lg object-contain bg-gray-50 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-xs truncate">{p.name}</p>
                <p className="text-[11px] text-emerald-700 font-bold">Base: LKR {Number(p.dropship_price || p.price).toLocaleString()}</p>
              </div>
              <button type="button" className="px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-bold rounded-lg flex-shrink-0">Pick</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EditOrderModal({ order, onClose, onSuccess }) {
  const [selectedProduct, setSelectedProduct] = useState({
    id: order.product_id,
    name: order.product_name,
    image_url: order.image_url,
    base_price: parseFloat(order.base_price)
  });
  const [showPicker, setShowPicker] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: order.customer_name || "",
    customer_phone: order.customer_phone || "",
    customer_phone2: order.customer_phone2 || "",
    customer_address: order.customer_address || "",
    customer_city: order.customer_city || "",
    notes: order.notes || "",
    quantity: order.quantity || 1,
    selling_price: order.selling_price || ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const qty = parseInt(formData.quantity) || 1;
  const sell = parseFloat(formData.selling_price) || 0;
  const currentBase = selectedProduct.base_price || parseFloat(order.base_price);
  const profit = Math.max(0, Math.round((sell - currentBase) * qty));

  const handlePickProduct = (prod) => {
    const baseP = parseFloat(prod.dropship_price || prod.price);
    setSelectedProduct({
      id: prod.id,
      name: prod.name,
      image_url: prod.image_url,
      base_price: baseP
    });
    if (sell < baseP) {
      setFormData(prev => ({ ...prev, selling_price: baseP + 500 }));
    }
    setShowPicker(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...formData,
        product_id: selectedProduct.id
      };
      const res = await API.put(`/orders/${order.id}`, payload);
      if (res.data.success) {
        onSuccess(res.data.order);
        onClose();
      } else {
        setError(res.data.error || "Failed to update order");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Error updating order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/60 backdrop-blur-sm px-0 sm:px-4 overflow-y-auto">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col p-5 sm:p-6 relative">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Edit Order #{order.order_number}</h3>
            <p className="text-xs text-amber-600 font-semibold mt-0.5">Status: Pending (Editable)</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="mb-3 p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3.5 overflow-y-auto pr-1 flex-1 text-xs sm:text-sm">
          {/* Active Product Card */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl flex items-center gap-3">
            <img src={`https://nagnail.lk/images/${selectedProduct.image_url}`} alt="" className="w-12 h-12 rounded-xl object-contain bg-white border flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-xs truncate">{selectedProduct.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">Base: <span className="font-semibold text-emerald-700">LKR {currentBase.toLocaleString()}</span></p>
            </div>
            <button
              type="button"
              onClick={() => setShowPicker(!showPicker)}
              className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition flex-shrink-0"
            >
              Change Item
            </button>
          </div>

          {showPicker && <ProductPicker onSelect={handlePickProduct} onCancel={() => setShowPicker(false)} />}

          {/* Pricing & Profit Calculation */}
          <div className="grid grid-cols-2 gap-3 bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Selling Price (LKR)</label>
              <input required type="number" step="any" className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-gray-800"
                value={formData.selling_price} onChange={e=>setFormData({...formData, selling_price: e.target.value})} />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Quantity</label>
              <input required min="1" max="50" type="number" className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-gray-800"
                value={formData.quantity} onChange={e=>setFormData({...formData, quantity: parseInt(e.target.value) || 1})} />
            </div>
            <div className="col-span-2 flex items-center justify-between pt-1 border-t border-emerald-200/60 text-xs">
              <span className="text-gray-600 font-medium">Estimated Profit:</span>
              <span className="font-extrabold text-emerald-700 text-sm">LKR {profit.toLocaleString()}</span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Customer Name</label>
            <input required type="text" className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.customer_name} onChange={e=>setFormData({...formData, customer_name: e.target.value})} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Phone 1 (Main)</label>
              <input required type="tel" className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.customer_phone} onChange={e=>setFormData({...formData, customer_phone: e.target.value})}/>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Phone 2 (Optional)</label>
              <input type="tel" className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.customer_phone2} onChange={e=>setFormData({...formData, customer_phone2: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Delivery Address</label>
            <input required type="text" className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.customer_address} onChange={e=>setFormData({...formData, customer_address: e.target.value})} />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-1">City / Town</label>
            <input required type="text" className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.customer_city} onChange={e=>setFormData({...formData, customer_city: e.target.value})} />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Special Notes</label>
            <textarea rows="2" className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.notes} onChange={e=>setFormData({...formData, notes: e.target.value})} />
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-1.5 shadow-md">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddParcelItemModal({ baseOrder, onClose, onSuccess }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showPicker, setShowPicker] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [sellingPrice, setSellingPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handlePick = (p) => {
    setSelectedProduct(p);
    setShowPicker(false);
    const baseP = parseFloat(p.dropship_price || p.price);
    setSellingPrice(baseP + 500);
  };

  const currentBase = selectedProduct ? parseFloat(selectedProduct.dropship_price || selectedProduct.price) : 0;
  const sell = parseFloat(sellingPrice) || 0;
  const profit = Math.max(0, Math.round((sell - currentBase) * quantity));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return setError("Please select an item");
    if (sell <= currentBase) return setError(`Selling price must be higher than base price (LKR ${currentBase})`);

    setSaving(true);
    setError("");
    try {
      const payload = {
        product_id: selectedProduct.id,
        quantity,
        selling_price: sell,
        customer_name: baseOrder.customer_name,
        customer_phone: baseOrder.customer_phone,
        customer_phone2: baseOrder.customer_phone2 || undefined,
        customer_address: baseOrder.customer_address,
        customer_city: baseOrder.customer_city,
        notes: baseOrder.notes || "",
        group_with: baseOrder.group_no || baseOrder.order_number
      };

      const res = await API.post("/orders", payload);
      if (res.data.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.data.error || "Failed to add item to parcel");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Error adding item to parcel");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/60 backdrop-blur-sm px-0 sm:px-4 overflow-y-auto">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col p-5 sm:p-6 relative">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">+ Add Item to Parcel</h3>
            <p className="text-xs text-gray-500 mt-0.5">Delivered together with #{baseOrder.order_number}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="mb-3 p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs sm:text-sm">
          {selectedProduct ? (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl flex items-center gap-3">
              <img src={`https://nagnail.lk/images/${selectedProduct.image_url}`} alt="" className="w-12 h-12 rounded-xl object-contain bg-white border flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-xs truncate">{selectedProduct.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">Base: <span className="font-semibold text-emerald-700">LKR {currentBase.toLocaleString()}</span></p>
              </div>
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="px-3 py-1.5 bg-gray-900 text-white rounded-xl text-xs font-bold transition flex-shrink-0"
              >
                Change
              </button>
            </div>
          ) : null}

          {showPicker && <ProductPicker onSelect={handlePick} onCancel={() => { if (selectedProduct) setShowPicker(false); else onClose(); }} />}

          {selectedProduct && (
            <div className="grid grid-cols-2 gap-3 bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Selling Price (LKR)</label>
                <input required type="number" step="any" className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-gray-800"
                  value={sellingPrice} onChange={e=>setSellingPrice(e.target.value)} />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Quantity</label>
                <input required min="1" max="50" type="number" className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-gray-800"
                  value={quantity} onChange={e=>setQuantity(parseInt(e.target.value) || 1)} />
              </div>
              <div className="col-span-2 flex items-center justify-between pt-1 border-t border-emerald-200/60 text-xs">
                <span className="text-gray-600 font-medium">Extra Profit from Item:</span>
                <span className="font-extrabold text-emerald-700 text-sm">LKR {profit.toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-2xl text-xs text-blue-800 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <span>📦 Same Parcel Destination:</span>
            </p>
            <p className="truncate font-semibold">{baseOrder.customer_name} ({baseOrder.customer_phone})</p>
            <p className="truncate text-blue-600">{baseOrder.customer_address}, {baseOrder.customer_city}</p>
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition">
              Cancel
            </button>
            <button type="submit" disabled={saving || !selectedProduct} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-1.5 shadow-md">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add to Parcel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OrderDetailModal({ order, onClose, onEdit, onAddItem, onDelete, onInvoice, invoiceBusy }) {
  const shareWhatsApp = () => {
    const statusMessages = {
      pending: "has been placed and is awaiting confirmation",
      confirmed: "has been confirmed ✅",
      processing: "is being packed and prepared 📦",
      shipped: "is on the way! 🚚 Expected delivery in 1-2 days",
      delivered: "has been delivered successfully 🎉",
      cancelled: "has been cancelled",
    };
    const msg = `Hi ${order.customer_name}! 👋\n\nYour order update:\n\n📦 Order: ${order.order_number}\n🛍️ Product: ${order.product_name}\n📊 Status: Your order ${statusMessages[order.status] || order.status}\n\n${order.status === "shipped" ? `🔍 Track: https://nagnail.lk/track?order=${order.order_number}\n\n` : ""}Thank you for your order! 🙏`;
    window.open(`https://wa.me/${order.customer_phone?.replace(/^0/, "94")}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4 py-6 overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              {order.order_number}
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${STATUS_COLORS[order.status]} uppercase tracking-wider`}>
                {order.status}
              </span>
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(order.created_at).toLocaleDateString("en-LK", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute:"2-digit" })}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-6">

          {/* Product Info */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex gap-4 items-center">
            <img src={`https://nagnail.lk/images/${order.image_url}`} alt=""
              className="w-16 h-16 rounded-lg object-cover bg-white shadow-sm flex-shrink-0"
              onError={e => e.target.src = "https://placehold.co/64x64?text=?"} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900 line-clamp-2">{order.product_name}</p>
              <div className="flex gap-4 mt-2 text-xs">
                <div className="flex flex-col">
                  <span className="text-gray-500">Cost Price</span>
                  <span className="font-medium text-gray-900">{fmtLKR(order.base_price)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500">Selling Price</span>
                  <span className="font-medium text-gray-900">{fmtLKR(order.selling_price)}</span>
                </div>
              </div>
            </div>
            <div className="text-right flex flex-col items-end justify-center">
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Profit</span>
              <span className="font-bold text-emerald-600 text-sm mt-0.5">+{fmtLKR(order.profit)}</span>
            </div>
          </div>

          {/* Customer Info */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Customer Details</h4>
            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex gap-3 text-sm items-start">
                <User className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <span className="block text-gray-900 font-medium">{order.customer_name}</span>
                </div>
              </div>
              <div className="flex gap-3 text-sm items-start">
                <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <span className="block text-gray-900">{order.customer_phone}</span>
                </div>
              </div>
              <div className="flex gap-3 text-sm items-start">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <span className="block text-gray-900">{order.customer_address}</span>
                  <span className="block text-gray-500 text-xs mt-0.5">{order.customer_city}</span>
                </div>
              </div>
              {order.notes && (
                <div className="flex gap-3 text-sm items-start pt-2 border-t border-gray-50 mt-2">
                  <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                  <span className="text-gray-600 italic text-sm">{order.notes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Order Status</h4>
            <div className="bg-white border border-gray-100 rounded-xl p-2 shadow-sm">
              <OrderTimeline order={order} />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex flex-col gap-2.5">
          <button onClick={shareWhatsApp}
            className="flex-1 bg-emerald-500 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 shadow-sm">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Update Customer
          </button>


          {/* Mobile-Friendly Pending Action Buttons */}
          {order.status === "pending" && (
            <div className="pt-2 flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(order)}
                  className="flex-1 py-3 px-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9"/>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                  </svg>
                  Edit Order / Item
                </button>
                <button
                  type="button"
                  onClick={() => onAddItem(order)}
                  className="flex-1 py-3 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  + Add Item to Parcel
                </button>
              </div>
              <button
                type="button"
                onClick={() => onDelete(order)}
                className="w-full py-2.5 px-3 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                Delete Order
              </button>
            </div>
          )}


          {/* Track + Invoice row */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onInvoice(order)}
              disabled={invoiceBusy === order.id}
              className="flex-1 bg-white border border-pink-200 text-pink-600 py-2.5 rounded-lg font-semibold text-sm hover:bg-pink-50 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
            >
              {invoiceBusy === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Invoice PDF
            </button>
            <a href={`https://nagnail.lk/track?order=${order.order_number}`} target="_blank" rel="noreferrer"
              className="flex-1 bg-white border border-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold text-sm hover:bg-gray-50 transition-colors text-center flex items-center justify-center gap-2 shadow-sm">
              <Navigation className="w-4 h-4" />
              Track Order
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [addItemOrder, setAddItemOrder] = useState(null);
  const [invoiceDl, setInvoiceDl] = useState(null);

  useEffect(() => { fetchOrders(); }, []);

  const downloadInvoice = async (order) => {
    setInvoiceDl(order.id);
    try {
      const res = await API.get(`/orders/${order.id}/invoice`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `NagNail-Invoice-${order.order_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Could not download invoice. Please try again.");
      console.error(err);
    } finally {
      setInvoiceDl(null);
    }
  };

  const handleDeleteOrder = async (ord) => {
    if (!window.confirm(`Are you sure you want to delete pending order #${ord.order_number}? This cannot be undone.`)) return;
    try {
      const res = await API.delete(`/orders/${ord.id}`);
      if (res.data.success) {
        setDetailOrder(null);
        fetchOrders();
      } else {
        alert(res.data.error || "Could not delete order");
      }
    } catch(err) {
      alert(err.response?.data?.error || "Error deleting order");
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await API.get("/orders");
      if (res.data.success) setOrders(res.data.orders);
    } catch(err) { console.error(err); }
    finally { setLoading(false); }
  };

  const shareWhatsApp = (order, e) => {
    e.stopPropagation();
    const msg = `Hi! Your order update ✅\n\n📦 Order: ${order.order_number}\n🛍️ Product: ${order.product_name}\n📊 Status: ${order.status.toUpperCase()}\n\n🔍 Track: https://nagnail.lk/track?order=${order.order_number}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const copyMsg = (order, e) => {
    e.stopPropagation();
    const msg = `Order: ${order.order_number}\nProduct: ${order.product_name}\nStatus: ${order.status.toUpperCase()}\nTrack: https://nagnail.lk/track?order=${order.order_number}`;
    navigator.clipboard.writeText(msg);
    setCopied(order.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const filtered = useMemo(() => orders.filter(o => {
    const matchFilter = filter === "all" || o.status === filter;
    const matchSearch = !search ||
      o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_phone?.includes(search) ||
      o.customer_city?.toLowerCase().includes(search.toLowerCase()) ||
      o.product_name?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  }), [orders, filter, search]);

  const totalProfit = filtered.filter(o => o.status !== "cancelled")
    .reduce((s, o) => s + parseFloat(o.profit || 0), 0);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage and track your dropshipping orders
            </p>
          </div>
          <Link to="/orders/new"
            className="bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            New Order
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 text-gray-500 mb-2">
              <Package className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Total Orders</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 text-emerald-600 mb-2">
              <Gift className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Total Profit</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {fmtLKR(orders.filter(o=>o.status!=="cancelled").reduce((s,o)=>s+parseFloat(o.profit||0),0))}
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 text-amber-600 mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Pending</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">
              {orders.filter(o=>o.status==="pending").length}
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 text-blue-600 mb-2">
              <Truck className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">In Transit</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {orders.filter(o=>["processing", "shipped"].includes(o.status)).length}
            </p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search order#, customer, city..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 w-full md:w-auto scrollbar-hide">
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all whitespace-nowrap border ${
                  filter === s
                    ? "bg-gray-900 border-gray-900 text-white shadow-sm"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}>
                {s} <span className="ml-1 opacity-70">({s === "all" ? orders.length : orders.filter(o => o.status === s).length})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Order List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
            <p className="text-sm text-gray-500 font-medium">Loading orders...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200 border-dashed">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-900 font-medium">No orders found</p>
            <p className="text-sm text-gray-500 mt-1 mb-4">You haven't placed any orders matching this criteria yet.</p>
            <Link to="/orders/new"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
              <Plus className="w-4 h-4" />
              Place New Order
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map(order => (
              <div
                key={order.id}
                onClick={() => setDetailOrder(order)}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group">

                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">

                  {/* Image & Product Mini */}
                  <img src={`https://nagnail.lk/images/${order.image_url}`} alt=""
                    className="w-16 h-16 sm:w-14 sm:h-14 object-cover rounded-lg border border-gray-100 flex-shrink-0"
                    onError={e => e.target.src = "https://placehold.co/56x56?text=?"} />

                  {/* Main Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900 text-sm">{order.order_number}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${STATUS_COLORS[order.status]} uppercase tracking-wide`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-700 truncate">{order.product_name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {order.customer_name}</span>
                      <span className="hidden sm:flex items-center gap-1"><MapPin className="w-3 h-3" /> {order.customer_city}</span>
                      <span className="hidden sm:inline text-gray-300">•</span>
                      <span>{new Date(order.created_at).toLocaleDateString("en-LK", { month: "short", day: "numeric" })}</span>
                    </div>
                  </div>

                  {/* Profit & Actions */}
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 sm:gap-1">
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Your Profit</p>
                      <p className="font-bold text-emerald-600 text-base">+{fmtLKR(order.profit)}</p>
                    </div>

                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <button onClick={e => copyMsg(order, e)}
                        title="Copy Details"
                        className={`p-1.5 rounded-md border transition-all ${
                          copied === order.id
                            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                            : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700"
                        }`}>
                        {copied === order.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button onClick={e => shareWhatsApp(order, e)}
                        title="Share on WhatsApp"
                        className="p-1.5 rounded-md bg-white text-gray-500 border border-gray-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all">
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); downloadInvoice(order); }}
                        title="Download Invoice PDF"
                        disabled={invoiceDl === order.id}
                        className="p-1.5 rounded-md bg-white text-gray-500 border border-gray-200 hover:bg-pink-50 hover:text-pink-600 hover:border-pink-200 transition-all disabled:opacity-60">
                        {invoiceDl === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                      </button>
                      <a href={`https://nagnail.lk/track?order=${order.order_number}`}
                        target="_blank" rel="noreferrer"
                        title="Track Order"
                        onClick={e => e.stopPropagation()}
                        className="p-1.5 rounded-md bg-white text-gray-500 border border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all">
                        <Navigation className="w-4 h-4" />
                      </a>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors hidden sm:block ml-2" />
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Detail Modal */}
      {detailOrder && (
        <OrderDetailModal
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          onEdit={(ord) => { setDetailOrder(null); setEditingOrder(ord); }}
          onAddItem={(ord) => { setDetailOrder(null); setAddItemOrder(ord); }}
          onDelete={handleDeleteOrder}
          onInvoice={downloadInvoice}
          invoiceBusy={invoiceDl}
        />
      )}
      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSuccess={() => { fetchOrders(); }}
        />
      )}
      {addItemOrder && (
        <AddParcelItemModal
          baseOrder={addItemOrder}
          onClose={() => setAddItemOrder(null)}
          onSuccess={() => { fetchOrders(); }}
        />
      )}
    </Layout>
  );
}
