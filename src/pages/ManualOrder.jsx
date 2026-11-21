import { useState } from "react";
import Layout from "../components/Layout";
import API from "../api/config";
import { Search, Trash2, Plus, ShoppingBag } from "lucide-react";

// NN-MANUAL-ORDER
const SOURCES = ["WhatsApp", "Facebook", "TikTok", "Instagram", "Phone", "Walk-in", "Other"];
const inp = "w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none";
const lbl = "block text-xs font-bold text-slate-600 uppercase mb-1";

export default function ManualOrder() {
  const empty = { customer_name: "", phone: "", address: "", city: "", district: "", source: "WhatsApp", shipping_fee: 400, discount: 0, notes: "", paid: false, paid_note: "", status: "confirmed", send_whatsapp: true };
  const [f, setF] = useState(empty);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const set = (k, v) => setF(o => ({ ...o, [k]: v }));

  const search = async (v) => {
    setQ(v);
    if (v.length < 2) return setResults([]);
    try { const r = await API.get(`/erp/products/search?q=${encodeURIComponent(v)}`); if (r.data.success) setResults(r.data.products); } catch (e) { }
  };
  const add = (p) => {
    const price = parseFloat(p.sale_price) > 0 ? parseFloat(p.sale_price) : parseFloat(p.price) || 0;
    setItems([...items, { product_id: p.id, name: p.name, stock: p.stock_qty, quantity: 1, unit_price: price, variant: "" }]);
    setQ(""); setResults([]);
  };
  const upd = (i, k, v) => { const n = [...items]; n[i] = { ...n[i], [k]: v }; setItems(n); };

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.unit_price) || 0) * (parseInt(i.quantity) || 0), 0);
  const discount = Math.min(parseFloat(f.discount) || 0, subtotal);
  const total = subtotal - discount + (parseFloat(f.shipping_fee) || 0);

  const submit = async () => {
    if (!f.customer_name.trim() || !f.phone.trim() || !f.address.trim()) return alert("Name, phone and address are required");
    if (!items.length) return alert("Add at least one product");
    const low = items.find(i => parseInt(i.quantity) > (parseInt(i.stock) || 0));
    let allow = false;
    if (low) { if (!window.confirm(`"${low.name}" has only ${low.stock} in stock. Create the order anyway (stock will go negative)?`)) return; allow = true; }
    setBusy(true);
    try {
      const r = await API.post("/manual-orders", { ...f, allow_negative_stock: allow, items: items.map(i => ({ product_id: i.product_id, quantity: parseInt(i.quantity), unit_price: i.unit_price, variant: i.variant })) });
      setDone(r.data); setF(empty); setItems([]);
    } catch (e) { alert("Failed: " + (e.response?.data?.error || e.message)); }
    setBusy(false);
  };

  return (
    <Layout>
      <div className="p-6 bg-slate-50 min-h-screen max-w-5xl">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-1"><ShoppingBag className="w-7 h-7 text-indigo-600" /> Manual Order</h1>
        <p className="text-slate-500 text-sm mb-6">Add orders received via WhatsApp, Facebook, TikTok or phone. Stock is deducted automatically.</p>

        {done && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-sm">
            <div className="font-bold text-emerald-800">✅ Order {done.order_number} created - LKR {Math.round(done.total).toLocaleString()}</div>
            {done.whatsapp && <div className={done.whatsapp.success ? "text-emerald-700" : "text-rose-600"}>WhatsApp: {done.whatsapp.success ? "sent" : "not sent (" + (done.whatsapp.reason || done.whatsapp.error || "error") + ")"}</div>}
            <a href="/orders" className="text-indigo-600 font-bold underline">Open NagNail Orders →</a>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h2 className="font-bold text-slate-700">Customer</h2>
            <div><label className={lbl}>Name *</label><input className={inp} value={f.customer_name} onChange={e => set("customer_name", e.target.value)} /></div>
            <div><label className={lbl}>Phone * (07XXXXXXXX)</label><input className={inp} value={f.phone} onChange={e => set("phone", e.target.value)} placeholder="0771234567" /></div>
            <div><label className={lbl}>Address *</label><textarea rows="2" className={inp} value={f.address} onChange={e => set("address", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>City</label><input className={inp} value={f.city} onChange={e => set("city", e.target.value)} /></div>
              <div><label className={lbl}>District</label><input className={inp} value={f.district} onChange={e => set("district", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Order source</label>
                <select className={inp} value={f.source} onChange={e => set("source", e.target.value)}>{SOURCES.map(s => <option key={s}>{s}</option>)}</select></div>
              <div><label className={lbl}>Status</label>
                <select className={inp} value={f.status} onChange={e => set("status", e.target.value)}><option value="confirmed">Confirmed</option><option value="pending">Pending</option></select></div>
            </div>
            <div><label className={lbl}>Notes</label><input className={inp} value={f.notes} onChange={e => set("notes", e.target.value)} /></div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h2 className="font-bold text-slate-700">Products</h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input className={inp + " pl-9"} value={q} onChange={e => search(e.target.value)} placeholder="Search product name / SKU..." />
              {results.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white shadow-xl border border-slate-200 rounded-xl mt-1 z-50 max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {results.map(p => (
                    <div key={p.id} onClick={() => add(p)} className="p-3 hover:bg-slate-50 cursor-pointer flex justify-between text-sm">
                      <span className="font-semibold text-slate-700">{p.name}{!p.is_active ? " (hidden)" : ""}</span>
                      <span className="text-xs text-slate-500 whitespace-nowrap">LKR {Math.round(parseFloat(p.sale_price) > 0 ? p.sale_price : p.price || 0).toLocaleString()} · Stock {p.stock_qty}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {items.length === 0 && <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 text-sm">Search above to add products</div>}
            {items.map((it, i) => (
              <div key={i} className="border border-slate-200 rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="font-semibold text-sm text-slate-700">{it.name}<div className={"text-[11px] " + ((parseInt(it.quantity) > (parseInt(it.stock) || 0)) ? "text-rose-600 font-bold" : "text-slate-400")}>Stock: {it.stock}</div></div>
                  <button type="button" onClick={() => setItems(items.filter((_, x) => x !== i))} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="text-[10px] font-bold text-slate-500 uppercase">Qty</label><input type="number" min="1" className={inp + " p-1.5"} value={it.quantity} onChange={e => upd(i, "quantity", e.target.value)} /></div>
                  <div><label className="text-[10px] font-bold text-slate-500 uppercase">Unit price</label><input type="number" min="0" className={inp + " p-1.5"} value={it.unit_price} onChange={e => upd(i, "unit_price", e.target.value)} /></div>
                  <div><label className="text-[10px] font-bold text-slate-500 uppercase">Variant</label><input className={inp + " p-1.5"} value={it.variant} onChange={e => upd(i, "variant", e.target.value)} placeholder="Red / XL" /></div>
                </div>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div><label className={lbl}>Delivery fee</label><input type="number" min="0" className={inp} value={f.shipping_fee} onChange={e => set("shipping_fee", e.target.value)} /></div>
              <div><label className={lbl}>Discount (LKR)</label><input type="number" min="0" className={inp} value={f.discount} onChange={e => set("discount", e.target.value)} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.paid} onChange={e => set("paid", e.target.checked)} /> Already paid (not COD)</label>
            {f.paid && <input className={inp} value={f.paid_note} onChange={e => set("paid_note", e.target.value)} placeholder="e.g. Bank transfer - BOC ref 1234" />}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.send_whatsapp} onChange={e => set("send_whatsapp", e.target.checked)} /> Send WhatsApp confirmation to customer</label>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-xl border border-slate-200 p-5 flex flex-wrap justify-between items-center gap-4">
          <div className="text-sm text-slate-600 space-y-0.5">
            <div>Subtotal: LKR {Math.round(subtotal).toLocaleString()}</div>
            {discount > 0 && <div>Discount: -LKR {Math.round(discount).toLocaleString()}</div>}
            <div>Delivery: LKR {Math.round(parseFloat(f.shipping_fee) || 0).toLocaleString()}</div>
            <div className="text-lg font-extrabold text-indigo-600">Total: LKR {Math.round(total).toLocaleString()} {f.paid ? "(Paid)" : "(COD)"}</div>
          </div>
          <button type="button" disabled={busy} onClick={submit} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-50">
            <Plus className="w-4 h-4" /> {busy ? "Creating..." : "Create Order"}
          </button>
        </div>
      </div>
    </Layout>
  );
}
