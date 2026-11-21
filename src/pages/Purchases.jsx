import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import API from "../api/config";
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  ArrowDownToLine, 
  CheckCircle2, 
  Clock, 
  User, 
  Tag,
  Hash,
  X,
  Trash2
} from "lucide-react";

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  
  // PO Form State
  const [supplierId, setSupplierId] = useState("");
  const [refNo, setRefNo] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [cart, setCart] = useState([]);

  const fetchData = async () => {
    try {
      const [pRes, sRes] = await Promise.all([API.get("/erp/purchases"), API.get("/erp/suppliers")]);
      if (pRes.data.success) setPurchases(pRes.data.purchases);
      if (sRes.data.success) setSuppliers(sRes.data.suppliers);
    } catch (err) { console.error(err); }
  };
  useEffect(() => { fetchData(); }, []);

  const handleSearch = async (e) => {
    setSearch(e.target.value);
    if (e.target.value.length < 2) return setSearchResults([]);
    try {
      const res = await API.get(`/erp/products/search?q=${e.target.value}`);
      if (res.data.success) setSearchResults(res.data.products);
    } catch (err) { }
  };

  const addToCart = (prod) => {
    if (cart.find(c => c.product_id === prod.id)) return;
    setCart([...cart, { product_id: prod.id, name: prod.name, qty: 1, unit_cost: parseFloat(prod.last_cost) || 0 }]);
    setSearch(""); setSearchResults([]);
  };

  // NN-COST: item not in catalog -> created as hidden draft product on save
  const addCustom = () => {
    setCart([...cart, { product_id: null, custom: true, new_name: search.trim(), name: search.trim(), sell_price: 0, qty: 1, unit_cost: 0 }]);
    setSearch(""); setSearchResults([]);
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, idx) => idx !== index));
  };

  const submitPO = async () => {
    if (!supplierId || cart.length === 0) return alert("Select supplier and add items");
    if (cart.some(c => c.custom && !String(c.new_name || "").trim())) return alert("Enter a name for every custom item");
    try {
      await API.post("/erp/purchases", { supplier_id: supplierId, reference_no: refNo, items: cart });
      setShowModal(false); setCart([]); setSupplierId(""); setRefNo("");
      fetchData();
    } catch (err) { alert("Failed to create PO: " + (err.response?.data?.error || err.message)); }
  };

  const receivePO = async (id) => {
    if (!window.confirm("Are you sure? This will officially add items to warehouse stock and lock the cost.")) return;
    try {
      await API.put(`/erp/purchases/${id}/receive`);
      alert("Goods Received! Stock updated.");
      fetchData();
    } catch (err) { alert("Failed to receive goods"); }
  };

  return (
    <Layout>
      <div className="p-6 bg-slate-50 min-h-screen">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <ShoppingCart className="w-7 h-7 text-indigo-600" /> Purchase Orders (PO)
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">Procure inventory from suppliers, trace pipeline costs, and adjust stock</p>
          </div>
          <button 
            onClick={() => setShowModal(true)} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create PO
          </button>
        </div>

        {/* PO List Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <th className="p-4">PO Code / Reference</th>
                <th className="p-4">Supplier</th>
                <th className="p-4">Items</th>
                <th className="p-4">Total Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {purchases.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition">
                  <td className="p-4">
                    <div className="font-semibold text-slate-800 font-mono">PO-{p.id}</div>
                    {p.reference_no ? (
                      <span className="text-xs text-slate-400 font-medium font-mono">{p.reference_no}</span>
                    ) : (
                      <span className="text-xs text-slate-300 italic">No ref</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 font-medium text-slate-700">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {p.supplier_name}
                    </div>
                  </td>
                  <td className="p-4 text-slate-600 font-medium">{p.total_items} units</td>
                  <td className="p-4 font-bold text-slate-800">
                    LKR {parseFloat(p.total_amount).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      p.status === 'received' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {p.status === 'received' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {p.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {p.status === 'ordered' && (
                      <button 
                        onClick={() => receivePO(p.id)} 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ml-auto"
                      >
                        <ArrowDownToLine className="w-3.5 h-3.5" /> Receive Goods
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-400 font-medium">No purchase orders found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <ProductCosts />

        {/* CREATE PO MODAL */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
              
              {/* Modal Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 flex-shrink-0">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-indigo-600" /> Create Purchase Order
                </h2>
                <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
              </div>

              {/* Scrollable Form Body */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                
                {/* Meta Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Supplier *</label>
                    <select 
                      required
                      value={supplierId} 
                      onChange={e => setSupplierId(e.target.value)} 
                      className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    >
                      <option value="">-- Select Supplier --</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Reference No / Invoice ID</label>
                    <input 
                      type="text" 
                      placeholder="e.g. INV-2025-998" 
                      value={refNo} 
                      onChange={e => setRefNo(e.target.value)} 
                      className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none font-medium" 
                    />
                  </div>
                </div>

                {/* Live Product Search Box */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Search Catalog Items *</label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search all products by name or SKU..." 
                      value={search} 
                      onChange={handleSearch} 
                      className="w-full pl-10 pr-3 py-2.5 border border-indigo-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none font-medium" 
                    />
                    
                    {/* Search suggestions dropdown */}
                    {searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white shadow-xl border border-slate-200 rounded-xl mt-1.5 z-50 max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {searchResults.map(prod => (
                          <div 
                            key={prod.id} 
                            onClick={() => addToCart(prod)} 
                            className="p-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center transition"
                          >
                            <span className="font-semibold text-slate-700 text-sm">
                              {prod.name}
                              {prod.sku ? <span className="ml-2 text-[10px] text-slate-400 font-mono">{prod.sku}</span> : null}
                              {!prod.is_active ? <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 rounded">hidden</span> : null}
                            </span>
                            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500 whitespace-nowrap">
                              Stock: {prod.stock_qty}{prod.last_cost != null ? ` · Cost ${parseFloat(prod.last_cost).toLocaleString()}` : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={addCustom} className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Item not in catalog? Add custom item{search.trim() ? ` "${search.trim()}"` : ""}
                  </button>
                </div>

                {/* Cart details */}
                {cart.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white mt-4">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase">
                        <tr>
                          <th className="p-3">Product Name</th>
                          <th className="p-3 w-28">Quantity</th>
                          <th className="p-3 w-32">Unit Cost (LKR)</th>
                          <th className="p-3 text-right">Line Total</th>
                          <th className="p-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cart.map((c, i) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="p-3 font-semibold text-slate-700">
                              {c.custom ? (
                                <div className="space-y-1">
                                  <input type="text" placeholder="New item name *" value={c.new_name}
                                    onChange={e => { const nc = [...cart]; nc[i].new_name = e.target.value; nc[i].name = e.target.value; setCart(nc); }}
                                    className="w-full p-1.5 border border-amber-300 rounded text-sm bg-amber-50" />
                                  <input type="number" min="0" placeholder="Selling price (optional)" value={c.sell_price || ""}
                                    onChange={e => { const nc = [...cart]; nc[i].sell_price = parseFloat(e.target.value) || 0; setCart(nc); }}
                                    className="w-full p-1.5 border border-slate-200 rounded text-xs bg-slate-50" />
                                  <span className="text-[10px] text-amber-600">New: saved as hidden product in catalog</span>
                                </div>
                              ) : c.name}
                            </td>
                            <td className="p-3">
                              <input 
                                type="number" 
                                min="1"
                                value={c.qty} 
                                onChange={e => {
                                  const nc = [...cart]; 
                                  nc[i].qty = parseFloat(e.target.value) || 0; 
                                  setCart(nc);
                                }} 
                                className="w-full p-1.5 border border-slate-200 rounded text-center font-bold text-slate-800 bg-slate-50" 
                              />
                            </td>
                            <td className="p-3">
                              <input 
                                type="number" 
                                min="0"
                                value={c.unit_cost} 
                                onChange={e => {
                                  const nc = [...cart]; 
                                  nc[i].unit_cost = parseFloat(e.target.value) || 0; 
                                  setCart(nc);
                                }} 
                                className="w-full p-1.5 border border-slate-200 rounded text-center font-bold text-indigo-600 bg-slate-50" 
                              />
                            </td>
                            <td className="p-3 font-bold text-slate-900 text-right">
                              LKR {(c.qty * c.unit_cost).toLocaleString()}
                            </td>
                            <td className="p-3 text-center">
                              <button 
                                type="button" 
                                onClick={() => removeFromCart(i)} 
                                className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm font-medium">
                    No products added to purchase order yet. Search above to add.
                  </div>
                )}
              </div>

              {/* Modal Footer with running total */}
              <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
                <div>
                  <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">Estimated Total</p>
                  <p className="font-extrabold text-lg text-indigo-600">
                    LKR {cart.reduce((s, c) => s + (c.qty * c.unit_cost), 0).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)} 
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-500 font-semibold text-xs hover:bg-slate-100 transition bg-white"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={submitPO} 
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700 transition shadow-md"
                  >
                    Save PO
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

// NN-COST: set real cost per product (Dropship + NagNail warehouse) and see real profit
function ProductCosts() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [edit, setEdit] = useState({});
  const [saving, setSaving] = useState(null);

  const load = async () => {
    try {
      const r = await API.get("/erp/product-costs");
      if (r.data.success) setRows(r.data.products);
    } catch (e) { console.error(e); }
  };
  useEffect(() => { load(); }, []);

  const save = async (p) => {
    const v = parseFloat(edit[p.id]);
    if (!(v > 0)) return alert("Enter a cost greater than 0");
    setSaving(p.id);
    try {
      await API.put(`/erp/products/${p.id}/cost`, { unit_cost: v });
      setEdit(e => { const n = { ...e }; delete n[p.id]; return n; });
      await load();
    } catch (e) { alert("Save failed: " + (e.response?.data?.error || e.message)); }
    setSaving(null);
  };

  const n = (x) => (x == null || x === "" ? null : parseFloat(x));
  const money = (x) => "LKR " + Math.round(x).toLocaleString();
  const profitCell = (sell, cost) => {
    if (sell == null || !(sell > 0)) return <span className="text-slate-300">-</span>;
    if (cost == null) return <span className="text-slate-300 text-xs">set cost</span>;
    const pr = sell - cost; const pct = sell ? Math.round((pr / sell) * 100) : 0;
    return <span className={pr < 0 ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"}>{money(pr)} <span className="text-[10px] font-medium">({pct}%)</span></span>;
  };

  const list = rows.filter(p =>
    (!onlyMissing || p.last_cost == null) &&
    (!q || (p.name || "").toLowerCase().includes(q.toLowerCase()) || (p.sku || "").toLowerCase().includes(q.toLowerCase()))
  );
  const missing = rows.filter(p => p.last_cost == null).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
      <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-800 flex items-center gap-2"><Tag className="w-5 h-5 text-indigo-600" /> Product Costs & Real Profit</h2>
          <p className="text-xs text-slate-500">Products without a cost use a 50% guess in reports. {missing} product(s) still need a cost.</p>
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-xs text-slate-600 flex items-center gap-1">
            <input type="checkbox" checked={onlyMissing} onChange={e => setOnlyMissing(e.target.checked)} /> Missing cost only
          </label>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name / SKU" className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-slate-50" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-100 text-slate-600 text-xs uppercase">
            <tr>
              <th className="p-3">Product</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Retail price</th>
              <th className="p-3">Dropship price</th>
              <th className="p-3 w-44">My cost (LKR)</th>
              <th className="p-3">Retail profit</th>
              <th className="p-3">Dropship profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map(p => {
              const cost = edit[p.id] !== undefined && edit[p.id] !== "" ? n(edit[p.id]) : n(p.last_cost);
              const retail = n(p.sale_price) > 0 ? n(p.sale_price) : n(p.price);
              return (
                <tr key={p.id} className={p.last_cost == null ? "bg-amber-50/40" : ""}>
                  <td className="p-3">
                    <div className="font-semibold text-slate-700">{p.name}</div>
                    <div className="text-[10px] text-slate-400">
                      #{p.id}{p.sku ? " · " + p.sku : ""}{p.is_nagnail_official ? " · NagNail" : ""}{n(p.dropship_price) > 0 ? " · Dropship" : ""}{!p.is_active ? " · hidden" : ""}
                    </div>
                  </td>
                  <td className="p-3">{p.stock_qty}</td>
                  <td className="p-3">{retail > 0 ? money(retail) : "-"}</td>
                  <td className="p-3">{n(p.dropship_price) > 0 ? money(n(p.dropship_price)) : "-"}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <input type="number" min="0" value={edit[p.id] !== undefined ? edit[p.id] : (p.last_cost != null ? parseFloat(p.last_cost) : "")}
                        placeholder="not set"
                        onChange={e => setEdit({ ...edit, [p.id]: e.target.value })}
                        className="w-24 p-1.5 border border-slate-200 rounded text-center font-bold text-indigo-600 bg-slate-50" />
                      {edit[p.id] !== undefined && (
                        <button type="button" disabled={saving === p.id} onClick={() => save(p)}
                          className="px-2 py-1 bg-indigo-600 text-white rounded text-xs font-bold disabled:opacity-50">
                          {saving === p.id ? "..." : "Save"}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="p-3">{profitCell(retail, cost)}</td>
                  <td className="p-3">{profitCell(n(p.dropship_price), cost)}</td>
                </tr>
              );
            })}
            {list.length === 0 && <tr><td colSpan="7" className="p-6 text-center text-slate-400">No products.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
