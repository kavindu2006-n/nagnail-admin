import React, { useState, useEffect } from "react";
import API from "../api";
import { 
  Package, Search, Plus, RefreshCw, CheckCircle, AlertTriangle, Printer 
} from "lucide-react";

export default function PackStation() {
  const [queue, setQueue] = useState([]);
  const [counters, setCounters] = useState({});
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailModal, setDetailModal] = useState(false);
  const [manualModal, setManualModal] = useState(false);
  const [productsList, setProductsList] = useState([]);

  // Manual Order Form
  const [manualForm, setManualForm] = useState({
    customer_name: "", phone1: "", phone2: "", address: "", city: "", district: "",
    source: "facebook", priority: "normal", shipping_fee: 350, notes: "",
    items: [{ product_id: "", quantity: 1, unit_price: 0 }]
  });

  const fetchQueue = async () => {
    try {
      const res = await API.get(`/pack/queue?status=${activeTab}&search=${search}`);
      if (res.data.success) {
        setQueue(res.data.queue);
        setCounters(res.data.counters);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await API.get("/products");
      if (res.data.success) {
        setProductsList(res.data.products || res.data.data || []);
      }
    } catch (e) {
      console.error("Products load error:", e);
    }
  };

  useEffect(() => {
    fetchQueue();
    fetchProducts();
    const interval = setInterval(fetchQueue, 15000);
    return () => clearInterval(interval);
  }, [activeTab, search]);

  const openOrderDetail = async (orderId) => {
    try {
      const res = await API.get(`/pack/orders/${orderId}`);
      if (res.data.success) {
        setSelectedOrder(res.data);
        setDetailModal(true);
      }
    } catch (e) {
      alert("Failed to load order detail");
    }
  };

  const markPick = async (productId, currentQty) => {
    if (!selectedOrder) return;
    try {
      await API.post(`/pack/orders/${selectedOrder.order.id}/pick-item`, {
        product_id: productId,
        qty_picked: currentQty
      });
      openOrderDetail(selectedOrder.order.id);
      fetchQueue();
    } catch (e) {
      alert("Failed to pick item");
    }
  };

  const addPackaging = async (pkgId) => {
    if (!selectedOrder) return;
    try {
      await API.post(`/pack/orders/${selectedOrder.order.id}/packaging`, {
        packaging_id: pkgId,
        qty_used: 1
      });
      openOrderDetail(selectedOrder.order.id);
    } catch (e) {
      alert("Failed to add packaging");
    }
  };

  const printWaybill = async () => {
    if (!selectedOrder) return;
    try {
      const res = await API.post(`/pack/orders/${selectedOrder.order.id}/waybill`, { courier: "generic" });
      alert(`Waybill generated & printed! No: ${res.data.waybill_no}`);
      openOrderDetail(selectedOrder.order.id);
      fetchQueue();
    } catch (e) {
      alert("Failed to generate waybill");
    }
  };

  const completePacking = async () => {
    if (!selectedOrder) return;
    try {
      const res = await API.post(`/pack/orders/${selectedOrder.order.id}/packed-ready`);
      alert(res.data.message);
      setDetailModal(false);
      fetchQueue();
    } catch (e) {
      alert(e.response?.data?.error || "Packing failed");
    }
  };

  const reportProblem = async () => {
    const reason = prompt("Enter problem reason (e.g. Out of stock / Address unclear):");
    if (!reason) return;
    try {
      await API.post(`/pack/orders/${selectedOrder.order.id}/problem`, { reason });
      alert("Problem reported");
      setDetailModal(false);
      fetchQueue();
    } catch (e) {
      alert("Failed to report problem");
    }
  };

  const handleProductSelect = (index, productId) => {
    const selected = productsList.find(p => p.id === parseInt(productId));
    const updatedItems = [...manualForm.items];
    updatedItems[index].product_id = productId;
    updatedItems[index].unit_price = selected ? parseFloat(selected.price || selected.sale_price || 0) : 0;
    setManualForm({ ...manualForm, items: updatedItems });
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...manualForm.items];
    updatedItems[index][field] = value;
    setManualForm({ ...manualForm, items: updatedItems });
  };

  const addItemRow = () => {
    setManualForm({
      ...manualForm,
      items: [...manualForm.items, { product_id: "", quantity: 1, unit_price: 0 }]
    });
  };

  const submitManualOrder = async (e) => {
    e.preventDefault();
    const formattedItems = manualForm.items.map(item => ({
      product_id: parseInt(item.product_id),
      quantity: parseInt(item.quantity) || 1,
      unit_price: parseFloat(item.unit_price) || 0
    })).filter(item => item.product_id && item.unit_price > 0);

    if (!formattedItems.length) {
      alert("Please select at least one valid product");
      return;
    }

    try {
      const payload = {
        ...manualForm,
        items: formattedItems,
        shipping_fee: parseFloat(manualForm.shipping_fee) || 350
      };
      const res = await API.post("/orders/manual", payload);
      if (res.data.success) {
        alert("Manual order created successfully and pushed to Packing Queue!");
        setManualModal(false);
        fetchQueue();
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to create manual order");
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-7 h-7 text-indigo-600" /> Warehouse Packing Station
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Real-time order fulfillment & packaging pipeline</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setManualModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create Manual Order
          </button>
          <button 
            onClick={fetchQueue}
            className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 px-3 py-2 rounded-lg text-sm transition shadow-sm"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label: "Pending Packing", key: "pending_packing", color: "border-amber-500 text-amber-600" },
          { label: "Picking", key: "picking", color: "border-blue-500 text-blue-600" },
          { label: "Packing", key: "packing", color: "border-indigo-500 text-indigo-600" },
          { label: "Ready to Dispatch", key: "ready_to_dispatch", color: "border-emerald-500 text-emerald-600" },
          { label: "Problem / Hold", key: "problem", color: "border-rose-500 text-rose-600" },
        ].map(card => (
          <div 
            key={card.key}
            onClick={() => setActiveTab(card.key)}
            className={`p-4 rounded-xl bg-white border-l-4 ${card.color.split(' ')[0]} shadow-sm cursor-pointer hover:shadow transition`}
          >
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</span>
            <div className={`text-2xl font-black mt-1 ${card.color.split(' ')[1]}`}>
              {counters[card.key] || 0}
            </div>
          </div>
        ))}
      </div>

      {/* Search & Tabs */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex justify-between items-center gap-4">
        <div className="flex gap-2">
          {["all", "pending_packing", "picking", "ready_to_dispatch", "problem"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === tab ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.replace("_", " ").toUpperCase()}
            </button>
          ))}
        </div>
        <div className="relative w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search order #, customer, phone, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <th className="p-3">Order</th>
              <th className="p-3">Priority</th>
              <th className="p-3">Source</th>
              <th className="p-3">Items</th>
              <th className="p-3">Status</th>
              <th className="p-3">Waybill</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr><td colSpan="7" className="p-8 text-center text-slate-400">Loading packing queue...</td></tr>
            ) : queue.length === 0 ? (
              <tr><td colSpan="7" className="p-8 text-center text-slate-400">No orders in this queue</td></tr>
            ) : queue.map(item => {
              const addr = typeof item.shipping_address === 'string' ? JSON.parse(item.shipping_address || '{}') : item.shipping_address || {};
              return (
                <tr key={item.order_id} className="hover:bg-slate-50 transition">
                  <td className="p-3 font-semibold text-indigo-600">
                    #{item.order_number}
                    <div className="text-xs font-normal text-slate-500">{addr.customer_name || 'Guest'} · {addr.phone1 || 'No phone'}</div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      item.priority === 'urgent' ? 'bg-rose-100 text-rose-700' :
                      item.priority === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {item.priority.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600 capitalize">{item.source || 'website'}</td>
                  <td className="p-3 font-semibold">{item.item_count} items</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      item.pack_status === 'ready_to_dispatch' ? 'bg-emerald-100 text-emerald-700' :
                      item.pack_status === 'problem' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {item.pack_status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 text-xs font-mono text-slate-600">
                    {item.waybill_no ? item.waybill_no : <span className="text-slate-300">Not printed</span>}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => openOrderDetail(item.order_id)}
                      className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg font-semibold text-xs transition"
                    >
                      Process Order →
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Order Execution Modal */}
      {detailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Packing Order #{selectedOrder.order.order_number}</h2>
                <p className="text-xs text-slate-500 mt-1">Source: <span className="font-semibold capitalize">{selectedOrder.order.source || 'website'}</span></p>
              </div>
              <button onClick={() => setDetailModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-6">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Shipping Details</h3>
                <div className="text-sm font-semibold">{selectedOrder.shipping_address.customer_name}</div>
                <div className="text-xs text-slate-600 mt-1">{selectedOrder.shipping_address.address}</div>
                <div className="text-xs text-slate-600">{selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.district}</div>
                <div className="text-xs font-mono text-indigo-600 mt-2">📞 {selectedOrder.shipping_address.phone1}</div>
                <div className="mt-3 text-xs bg-amber-100 text-amber-800 p-2 rounded font-bold">
                  COD Total: LKR {parseFloat(selectedOrder.order.total_amount).toLocaleString()}
                </div>
              </div>

              <div className="col-span-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Items Pick List</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map(item => (
                    <div key={item.item_id} className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        <img src={item.image_url || "/placeholder.png"} className="w-10 h-10 rounded border object-cover" alt="" />
                        <div>
                          <div className="text-sm font-semibold">{item.name}</div>
                          <div className="text-xs text-slate-500">Bin Location: <span className="font-mono text-indigo-600 font-bold">{item.warehouse_location || "A01"}</span></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold">Qty: {item.quantity}</span>
                        <button
                          onClick={() => markPick(item.product_id, item.quantity)}
                          className={`px-3 py-1 rounded text-xs font-bold ${
                            item.qty_picked >= item.quantity ? "bg-emerald-100 text-emerald-700" : "bg-indigo-600 text-white"
                          }`}
                        >
                          {item.qty_picked >= item.quantity ? "✓ Picked" : "Confirm Pick"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 border-t pt-4">
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Packaging Used</h3>
                <div className="flex gap-2 flex-wrap mb-2">
                  {selectedOrder.available_packaging.map(pkg => (
                    <button key={pkg.id} onClick={() => addPackaging(pkg.id)} className="bg-slate-100 text-xs px-2.5 py-1.5 rounded">
                      + {pkg.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Waybill & Completion</h3>
                <div className="flex gap-2 mb-3">
                  <button onClick={printWaybill} className="bg-slate-800 text-white text-xs px-3 py-2 rounded font-bold flex-1">
                    🖨️ Print Waybill ({selectedOrder.waybill ? selectedOrder.waybill.waybill_no : "New"})
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={completePacking} className="flex-1 bg-emerald-600 text-white font-bold py-2 rounded text-sm">
                    ✓ Packed & Ready to Dispatch
                  </button>
                  <button onClick={reportProblem} className="bg-rose-50 text-rose-600 border border-rose-200 px-3 py-2 rounded text-xs font-semibold">
                    ⚠️ Problem
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Order Creation Modal */}
      {manualModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={submitManualOrder} className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Create Manual Admin Order</h2>
            <div className="space-y-3 text-sm">
              <input 
                type="text" placeholder="Customer Name *" required
                className="w-full border p-2 rounded"
                value={manualForm.customer_name}
                onChange={e => setManualForm({...manualForm, customer_name: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="text" placeholder="Phone 1 *" required
                  className="border p-2 rounded"
                  value={manualForm.phone1}
                  onChange={e => setManualForm({...manualForm, phone1: e.target.value})}
                />
                <input 
                  type="text" placeholder="Phone 2 (Optional)"
                  className="border p-2 rounded"
                  value={manualForm.phone2}
                  onChange={e => setManualForm({...manualForm, phone2: e.target.value})}
                />
              </div>
              <input 
                type="text" placeholder="Shipping Address *" required
                className="w-full border p-2 rounded"
                value={manualForm.address}
                onChange={e => setManualForm({...manualForm, address: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="text" placeholder="City"
                  className="border p-2 rounded"
                  value={manualForm.city}
                  onChange={e => setManualForm({...manualForm, city: e.target.value})}
                />
                <select 
                  className="border p-2 rounded"
                  value={manualForm.source}
                  onChange={e => setManualForm({...manualForm, source: e.target.value})}
                >
                  <option value="facebook">Facebook Order</option>
                  <option value="tiktok">TikTok Order</option>
                  <option value="whatsapp">WhatsApp Order</option>
                  <option value="phone">Phone Call</option>
                </select>
              </div>

              {/* Items List Selection */}
              <div className="border-t pt-3 mt-3">
                <label className="text-xs font-bold text-slate-600 uppercase block mb-2">Order Products *</label>
                {manualForm.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 mb-2 items-center">
                    <select
                      className="border p-2 rounded flex-1 text-sm"
                      value={item.product_id}
                      required
                      onChange={e => handleProductSelect(idx, e.target.value)}
                    >
                      <option value="">-- Select Product --</option>
                      {productsList.map(p => (
                        <option key={p.id} value={p.id}>{p.name} - LKR {parseFloat(p.price || p.sale_price || 0).toLocaleString()}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      className="border p-2 rounded w-20 text-center"
                      value={item.quantity}
                      onChange={e => handleItemChange(idx, "quantity", e.target.value)}
                    />
                  </div>
                ))}
                <button type="button" onClick={addItemRow} className="text-xs text-indigo-600 font-bold hover:underline">
                  + Add Another Product
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" onClick={() => setManualModal(false)} className="px-4 py-2 border rounded text-slate-600">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded font-bold">Create & Push to Packing Queue</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
