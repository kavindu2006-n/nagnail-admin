import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import API from "../api/config";
import { 
  Warehouse as WarehouseIcon, 
  AlertTriangle, 
  Search, 
  Boxes, 
  TrendingUp, 
  TrendingDown, 
  RotateCcw, 
  Clock, 
  ShieldAlert, 
  Layers, 
  CheckCircle2 
} from "lucide-react";

export default function Warehouse() {
  const [summary, setSummary] = useState(null);
  const [reconciliation, setReconciliation] = useState(null);
  const [reconError, setReconError] = useState("");
  const [reconSearch, setReconSearch] = useState("");
  const [movements, setMovements] = useState([]);
  const [showModal, setShowModal] = useState(false);
  
  // Adjustment state
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProd, setSelectedProd] = useState(null);
  const [adjType, setType] = useState("damage");
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");

  const fetchData = async () => {
    API.get("/erp/warehouse/reconciliation-v5")
      .then(res => {
        if (!res.data?.success) throw new Error("Reconciliation unavailable");
        setReconciliation(res.data);
        setReconError("");
      })
      .catch(err => {
        setReconError(err.response?.data?.error || err.message);
        setReconciliation(null);
      });
    try {
      const [sRes, mRes] = await Promise.all([
        API.get("/erp/warehouse/summary"),
        API.get("/erp/warehouse/movements")
      ]);
      if (sRes.data.success) setSummary(sRes.data.summary);
      if (mRes.data.success) setMovements(mRes.data.movements);
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

  const submitAdjustment = async (e) => {
    e.preventDefault();
    if (!selectedProd || !qty) return alert("Select product and quantity");
    
    // Convert to negative if damage or lost
    let finalQty = parseInt(qty);
    if (['damage', 'adjustment'].includes(adjType) && finalQty > 0) {
      finalQty = -finalQty;
    }

    try {
      await API.post("/erp/warehouse/adjust", {
        product_id: selectedProd.id,
        type: adjType,
        qty_change: finalQty,
        notes
      });
      setShowModal(false);
      setSelectedProd(null);
      setQty(""); setNotes(""); setSearch("");
      fetchData();
    } catch (err) { alert("Failed to record adjustment"); }
  };

  return (
    <Layout>
      <div className="p-6 bg-slate-50 min-h-screen">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <WarehouseIcon className="w-7 h-7 text-indigo-600" /> Warehouse &amp; Inventory Ledger
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">Real-time FIFO asset valuation, movement logs, and stock reconciliations</p>
          </div>
          <button 
            onClick={() => setShowModal(true)} 
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition shadow-sm"
          >
            <AlertTriangle className="w-4 h-4" /> Stock Adjustment / Damage
          </button>
        </div>

        
        {/* NN-WAREHOUSE-V5-UI */}
        <section className="mb-6 space-y-4">
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
            <h2 className="font-bold text-indigo-900 text-lg">
              Real Stock Reconciliation V5
            </h2>
            <p className="mt-1 text-sm text-indigo-800">
              Purchase Order receipts are confirmed.
              Current physical stock and its value require reconciliation.
              This report never adjusts inventory.
            </p>
          </div>

          {reconError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              Reconciliation API error: {reconError}
            </div>
          )}

          {!reconciliation && !reconError && (
            <p className="text-sm text-slate-500">Loading stock reconciliation...</p>
          )}

          {reconciliation && (() => {
            const s = reconciliation.summary || {};
            const money = v => Number(v || 0).toLocaleString("en-LK", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            });
            const number = v => Number(v || 0).toLocaleString("en-LK");
            const tiles = [
              ["PO Received", number(s.po_received_units) + " units"],
              ["PO Item Cost", "LKR " + money(s.po_received_cost)],
              ["Recorded Ledger Sales", number(s.ledger_sales) + " units"],
              ["DropNail Delivered", number(s.dropship_delivered) + " units"],
              ["DropNail Shipped", number(s.dropship_shipped) + " units"],
              ["Unverified Legacy Batches", number(s.legacy_batch_units) + " units"],
              ["Unverified Legacy Value", "LKR " + money(s.legacy_batch_value)],
              ["Current Physical Value", "Not verified"]
            ];
            const rows = (reconciliation.products || []).filter(p =>
              (String(p.name || "") + " " + String(p.sku || "") + " " + String(p.id))
                .toLowerCase()
                .includes(reconSearch.toLowerCase().trim())
            );

            return (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {tiles.map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold text-slate-500">{label}</p>
                      <p className="mt-2 text-lg font-extrabold text-slate-800 break-words">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <strong>Important:</strong> PO receipts are not necessarily remaining stock.
                  DropNail sales may overlap with previous inventory or occur before PO receipt.
                  Legacy batches are not confirmed physical stock.
                  Do not deduct all historical sales from PO receipts.
                </div>

                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="p-4 flex flex-wrap justify-between gap-3 items-center border-b">
                    <div>
                      <h3 className="font-bold text-slate-800">
                        Product-wise Stock Reconciliation
                      </h3>
                      <p className="text-xs text-slate-500">
                        {rows.length} matching products · Read-only
                      </p>
                    </div>
                    <input
                      value={reconSearch}
                      onChange={e => setReconSearch(e.target.value)}
                      placeholder="Search product, SKU or ID"
                      className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full sm:w-64"
                    />
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                      <thead className="bg-slate-100 text-slate-600 text-xs">
                        <tr>
                          {[
                            "Product",
                            "PO Received",
                            "Ledger Sold",
                            "DN Delivered",
                            "DN Shipped",
                            "PO Batch Balance",
                            "Catalog Stock",
                            "Legacy Batch",
                            "PO Batch Cost"
                          ].map(h => (
                            <th key={h} className="p-3 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rows.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="p-3 min-w-56">
                              <div className="font-semibold text-slate-800">{p.name}</div>
                              <div className="text-xs text-slate-400">
                                #{p.id} {p.sku || ""}
                              </div>
                            </td>
                            <td className="p-3 font-semibold">{number(p.po_received)}</td>
                            <td className="p-3">{number(p.ledger_sales)}</td>
                            <td className="p-3">{number(p.dropnail_delivered)}</td>
                            <td className="p-3">{number(p.dropnail_shipped)}</td>
                            <td className="p-3">{number(p.po_batch_remaining)}</td>
                            <td className="p-3 text-amber-700 font-semibold">
                              {number(p.catalog_stock)}
                            </td>
                            <td className="p-3">{number(p.legacy_batch_units)}</td>
                            <td className="p-3 whitespace-nowrap">
                              LKR {money(p.po_batch_value)}
                            </td>
                          </tr>
                        ))}
                        {rows.length === 0 && (
                          <tr>
                            <td colSpan={9} className="p-8 text-center text-slate-500">
                              No matching products
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            );
          })()}
        </section>

        {/* Valuation KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Legacy FIFO Value (Unverified)</p>
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
                LKR {summary?.inventory_value ? parseFloat(summary.inventory_value).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
              </p>
            </div>
            <p className="text-[11px] font-medium text-emerald-600 mt-3 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Includes non-PO / cost-seeded batches
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Official SKUs</p>
              <p className="text-2xl font-extrabold text-slate-800 tracking-tight mt-1">
                {summary?.total_products || 0}
              </p>
            </div>
            <p className="text-[11px] font-medium text-slate-400 mt-3">NagNail in-house catalog</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Catalog Stock Units (Unverified)</p>
              <p className="text-2xl font-extrabold text-indigo-600 tracking-tight mt-1">
                {summary?.total_units?.toLocaleString() || 0}
              </p>
            </div>
            <p className="text-[11px] font-medium text-slate-400 mt-3">Across all bins &amp; shelves</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Low Stock Warnings</p>
              <p className="text-2xl font-extrabold text-rose-600 tracking-tight mt-1">
                {summary?.low_stock_count || 0}
              </p>
            </div>
            <p className="text-[11px] font-medium text-rose-500 mt-3">Items below reorder limit</p>
          </div>
        </div>

        {/* Movements Audit Log */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" /> Stock Movement Audit Ledger
            </h2>
            <span className="text-xs font-medium text-slate-400">{movements.length} logged records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                  <th className="p-4">Date &amp; Time</th>
                  <th className="p-4">Product Name</th>
                  <th className="p-4">Operation Type</th>
                  <th className="p-4">Quantity Change</th>
                  <th className="p-4">Audit Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {movements.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 text-xs font-mono text-slate-500">
                      {new Date(m.created_at).toLocaleString('en-LK', {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="p-4 font-bold text-slate-800">{m.product_name}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        m.type === 'purchase'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : m.type === 'damage'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : m.type === 'return'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {m.type === 'purchase' && <TrendingUp className="w-3 h-3" />}
                        {m.type === 'damage' && <ShieldAlert className="w-3 h-3 text-rose-600" />}
                        {m.type === 'return' && <RotateCcw className="w-3 h-3 text-purple-600" />}
                        {m.type === 'adjustment' && <TrendingDown className="w-3 h-3 text-amber-600" />}
                        {m.type}
                      </span>
                    </td>
                    <td className={`p-4 font-bold font-mono ${m.qty_change > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {m.qty_change > 0 ? `+${m.qty_change}` : m.qty_change} units
                    </td>
                    <td className="p-4 text-xs text-slate-500 font-medium max-w-xs truncate" title={m.notes}>
                      {m.notes || <span className="text-slate-300 italic">-</span>}
                    </td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400 font-medium">No stock movement history recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ADJUSTMENT MODAL */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" /> Manual Stock Adjustment
                </h2>
                <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
              </div>
              <form onSubmit={submitAdjustment} className="p-6 space-y-4">
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Search Product *</label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Type SKU or item title..." 
                      value={selectedProd ? selectedProd.name : search} 
                      onChange={e => {
                        if (selectedProd) setSelectedProd(null);
                        handleSearch(e);
                      }} 
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none font-medium" 
                    />
                  </div>

                  {/* Search Dropdown */}
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white shadow-xl border border-slate-200 rounded-xl mt-1 z-50 max-h-40 overflow-y-auto divide-y divide-slate-100">
                      {searchResults.map(p => (
                        <div 
                          key={p.id} 
                          onClick={() => { setSelectedProd(p); setSearchResults([]); }} 
                          className="p-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center transition"
                        >
                          <span className="text-sm font-semibold text-slate-700">{p.name}</span>
                          <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500">Stock: {p.stock_qty}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedProd && (
                    <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 font-medium flex justify-between items-center">
                      <span>Selected: <strong>{selectedProd.name}</strong></span>
                      <span className="font-bold">Current Stock: {selectedProd.stock_qty}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Adjustment Type *</label>
                  <select 
                    value={adjType} 
                    onChange={e => setType(e.target.value)} 
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                  >
                    <option value="damage">❌ Damaged / Broken Stock (Subtract)</option>
                    <option value="adjustment">📉 Manual Correction (Subtract)</option>
                    <option value="return">↺ Customer Return (Add Back)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Units Quantity *</label>
                  <input 
                    required 
                    type="number" 
                    min="1" 
                    placeholder="e.g. 2" 
                    value={qty} 
                    onChange={e => setQty(e.target.value)} 
                    className="w-full border border-slate-200 p-2 rounded-lg text-sm bg-slate-50 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Audit Reason / Notes</label>
                  <textarea 
                    placeholder="e.g. Dropped during packaging station packing" 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                    rows="3"
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)} 
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-500 font-semibold text-xs hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg font-bold text-xs hover:bg-amber-700 transition shadow-md"
                  >
                    Apply Adjustment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
