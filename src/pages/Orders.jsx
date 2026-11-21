import { useEffect, useState, useMemo } from "react";
import API from "../api/config";
import Layout from "../components/Layout";
import { ArrowDownToLine, PackageCheck, RotateCw, Search, ShoppingBag, Wallet, FilterX } from "lucide-react";
// NN-ORDERS-V4-2026

const STATUS_COLORS = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-sky-50 text-sky-700 border-sky-200",
  processing: "bg-indigo-50 text-indigo-700 border-indigo-200",
  shipped: "bg-purple-50 text-purple-700 border-purple-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
};

const STATUS_LIST = ["all","pending","confirmed","processing","shipped","delivered","cancelled"];

const API_BASE = "https://nagnail.lk";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [msg, setMsg] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(null);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      const res = await API.get("/orders");
      if (res.data.success) setOrders(res.data.orders);
    } catch(err) { console.error(err); setMsg("Failed to load orders. Please retry."); }
    finally { setLoading(false); }
  };

  const openOrder = async (order) => {
    setSelectedOrder(order);
    setDetailLoading(true);
    try {
      const res = await API.get(`/orders/${order.id}`);
      if (res.data.success) setOrderDetails(res.data.order);
    } catch(err) { console.error(err); }
    finally { setDetailLoading(false); }
  };

  const updateStatus = async (id, status) => {
    try {
      await API.put(`/orders/${id}/status`, { status });
      setMsg(`Order updated to ${status}!`);
      fetchOrders();
      if (selectedOrder?.id === id) {
        setSelectedOrder(prev => ({ ...prev, status }));
        setOrderDetails(prev => prev ? { ...prev, status } : null);
      }
      setTimeout(() => setMsg(""), 3000);
    } catch(err) { console.error(err); setMsg("Failed to update order status."); }
  };

  const handleBulkUpdate = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    setBulkLoading(true);
    const attempted = Array.from(selectedIds);
    const results = await Promise.allSettled(attempted.map(id => API.put(`/orders/${id}/status`, { status: bulkStatus })));
    const failed = attempted.filter((_, i) => results[i].status === "rejected");
    const updated = attempted.length - failed.length;
    setBulkLoading(false);
    setSelectedIds(new Set(failed));
    if (!failed.length) setBulkStatus("");
    setMsg(failed.length ? `Updated ${updated}; Failed to update ${failed.length} order(s).` : `Updated ${updated} orders to ${bulkStatus}`);
    fetchOrders(); setTimeout(() => setMsg(""), 3000);
  };

  const downloadInvoice = async (orderId, orderNumber, e) => {
    if (e) e.stopPropagation();
    setInvoiceLoading(orderId);
    try {
      const response = await fetch(`${API_BASE}/api/admin/orders/${orderId}/invoice`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${(localStorage.getItem("admin_token") || localStorage.getItem("token")) || sessionStorage.getItem("token") || ""}`,
        },
      });
      if (!response.ok) throw new Error("Failed to generate invoice");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NagNail-Invoice-${orderNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setMsg(`Invoice downloaded for ${orderNumber}!`);
      setTimeout(() => setMsg(""), 3000);
    } catch(err) {
      console.error(err);
      setMsg("Failed to download invoice. Try again.");
      setTimeout(() => setMsg(""), 3000);
    } finally {
      setInvoiceLoading(null);
    }
  };

  const exportCSV = () => {
    const rows = [["Order#","Customer","Phone","Email","Status","Payment","Total","Date"]];
    filtered.forEach(o => rows.push([
      o.order_number, o.full_name||o.user_name||"", o.phone||"", o.email||"",
      o.status, o.payment_method, parseFloat(o.total_amount).toFixed(2),
      new Date(o.created_at).toLocaleDateString("en-LK")
    ]));
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `orders-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleAll = () => setSelectedIds(prev => prev.size===filtered.length ? new Set() : new Set(filtered.map(o=>o.id)));

  const getAddr = (addr) => {
    try {
      const a = typeof addr==="string" ? JSON.parse(addr) : addr;
      return `${a.full_name} · ${a.address_line1}, ${a.city}`;
    } catch { return addr||""; }
  };

  const getPhone = (addr) => {
    try { const a = typeof addr==="string" ? JSON.parse(addr) : addr; return a.phone||""; } catch { return ""; }
  };

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const matchStatus = filter==="all" || o.status===filter;
      const matchPayment = paymentFilter === "all" ||
        (paymentFilter === "delivered-unpaid"
          ? o.status === "delivered" && String(o.payment_status || "").toLowerCase() !== "paid"
          : String(o.payment_status || "").toLowerCase() === paymentFilter);
      const matchSearch = !search || o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
        (o.full_name||o.user_name||"").toLowerCase().includes(search.toLowerCase()) ||
        (o.email||"").toLowerCase().includes(search.toLowerCase()) ||
        (o.phone||"").includes(search);
      const matchFrom = !dateFrom || new Date(o.created_at) >= new Date(dateFrom);
      const matchTo = !dateTo || new Date(o.created_at) <= new Date(dateTo+"T23:59:59");
      return matchStatus && matchPayment && matchSearch && matchFrom && matchTo;
    });
  }, [orders, filter, paymentFilter, search, dateFrom, dateTo]);

  const totalRevenue = filtered.filter(o=>o.status!=="cancelled").reduce((s,o)=>s+parseFloat(o.total_amount||0),0);
  const statusCounts = orders.reduce((acc,o)=>{acc[o.status]=(acc[o.status]||0)+1;return acc;},{});
  const deliveredUnpaid = orders.filter(o => o.status === "delivered" && String(o.payment_status || "").toLowerCase() !== "paid");
  const resetFilters = () => { setSearch(""); setDateFrom(""); setDateTo(""); setFilter("all"); setPaymentFilter("all"); };

  return (
    <Layout>
      <div className="w-full min-w-0 max-w-[1680px] mx-auto space-y-5 sm:space-y-6 px-4 py-5 sm:px-6 sm:py-7 xl:px-9 xl:py-8">
        
        {/* Orders V4 executive header */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm px-5 py-6 sm:px-7 sm:py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-indigo-600">● NAGNAIL / ORDER OPERATIONS</p>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">Order Management</h1>
              <p className="mt-1.5 text-sm text-slate-500">Track, manage and fulfil NagNail customer orders from one workspace.</p>
              <p className="mt-2 text-xs font-medium text-slate-500">{orders.length} total orders · LKR {orders.filter(o=>o.status!=="cancelled").reduce((sum,o)=>sum+parseFloat(o.total_amount||0),0).toLocaleString()} order value (excluding cancelled)</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button onClick={fetchOrders} aria-label="Refresh orders" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RotateCw className="h-4 w-4" /> Refresh</button>
              <button onClick={exportCSV} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"><ArrowDownToLine className="h-4 w-4" /> Export CSV</button>
            </div>
          </div>
        </section>

        {deliveredUnpaid.length > 0 && (
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <p className="text-sm font-bold text-amber-900">{deliveredUnpaid.length} delivered order{deliveredUnpaid.length === 1 ? "" : "s"} not recorded as paid</p>
              <p className="mt-0.5 text-xs leading-relaxed text-amber-800">Delivery and payment are separate statuses. Confirm COD collection and courier settlement before recording payment; this page does not automatically mark orders paid.</p>
            </div>
            <button onClick={() => { setFilter("all"); setPaymentFilter("delivered-unpaid"); }} className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100">Review these orders</button>
          </div>
        )}

        {msg && (
          <div className={`px-4 py-3 rounded-lg border text-sm font-semibold flex items-center gap-2 ${msg.includes("Failed") ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
            {msg.includes("Failed") ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            )}
            {msg}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 min-[450px]:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label:"Filtered Revenue", value:`LKR ${totalRevenue.toLocaleString()}`, color:"text-slate-900", accent:"bg-indigo-500" },
            { label:"Filtered Orders", value:filtered.length, color:"text-slate-900", accent:"bg-blue-500" },
            { label:"Pending Status", value:statusCounts.pending||0, color:"text-amber-700", accent:"bg-amber-500" },
            { label:"Delivered Status", value:statusCounts.delivered||0, color:"text-emerald-700", accent:"bg-emerald-500" },
          ].map(k => (
            <div key={k.label} className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-5 relative overflow-hidden group hover:shadow-md transition-shadow min-w-0">
              <div className={`absolute top-0 left-0 w-1 h-full ${k.accent}`}></div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{k.label}</p>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Filters & Status Tabs */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-900">Filter orders</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{filtered.length} matched</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-4 border-b border-slate-100 [scrollbar-width:thin]">
            {STATUS_LIST.map(s => (
              <button key={s} onClick={()=>setFilter(s)}
                className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${
                  filter===s 
                  ? "bg-slate-900 text-white shadow-sm" 
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                }`}>
                {s} <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${filter===s ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  {s==="all"?filtered.length:orders.filter(o=>o.status===s).length}
                </span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_170px_170px_195px]">
            <div className="relative min-w-0 sm:col-span-2 xl:col-span-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
              <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search order#, name, email, phone..."
                className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400" />
            </div>
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
              className="w-full min-w-0 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
            <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
              className="w-full min-w-0 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
            <select aria-label="Filter by payment status" value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
              <option value="all">All payments</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="delivered-unpaid">Delivered / Unpaid</option>
            </select>
            {(dateFrom||dateTo||search||paymentFilter!=="all"||filter!=="all") && (
              <button onClick={resetFilters} className="inline-flex items-center justify-center gap-2 border border-rose-200 text-rose-600 bg-rose-50 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-rose-100 transition-colors"><FilterX className="h-4 w-4" />
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex-wrap animate-fade-in shadow-sm">
            <span className="text-sm font-semibold text-indigo-700 bg-white px-2 py-1 rounded shadow-sm border border-indigo-100">
              {selectedIds.size} orders selected
            </span>
            <select value={bulkStatus} onChange={e=>setBulkStatus(e.target.value)}
              className="border border-indigo-300 rounded-lg px-3 py-1.5 text-sm outline-none bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
              <option value="">Update Status...</option>
              {["confirmed","processing","shipped","delivered","cancelled"].map(s=>(
                <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
              ))}
            </select>
            <button onClick={handleBulkUpdate} disabled={!bulkStatus||bulkLoading}
              className="bg-indigo-600 text-white px-5 py-1.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm">
              {bulkLoading ? "Applying..." : "Apply Action"}
            </button>
            <button onClick={()=>setSelectedIds(new Set())} className="text-indigo-500 text-sm hover:text-indigo-700 hover:underline ml-auto font-medium">
              Cancel Selection
            </button>
          </div>
        )}

        {/* Select All Toggle */}
        <div className="flex items-center justify-between px-1">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer hover:text-slate-900">
            <input type="checkbox" checked={selectedIds.size===filtered.length&&filtered.length>0} onChange={toggleAll} 
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
            Select All Results
          </label>
          <p className="text-xs font-medium text-slate-400">Showing {filtered.length} of {orders.length} orders</p>
        </div>

        {/* Order List */}
        {loading ? (
          <div className="min-h-[40vh] flex flex-col items-center justify-center text-slate-400">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-medium">Loading orders...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-xl p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900">No orders found</h3>
            <p className="text-sm text-slate-500 mt-1">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <div className="space-y-3 pb-8 min-w-0">
            {filtered.map(order => (
              <div key={order.id} className={`bg-white rounded-2xl shadow-sm border min-w-0 overflow-hidden transition-all duration-200 hover:shadow-md ${selectedIds.has(order.id) ? "border-indigo-400 ring-1 ring-indigo-400" : "border-slate-200 hover:border-slate-300"}`}>
                <div className="p-4 sm:p-5 flex flex-wrap sm:flex-nowrap items-start sm:items-center gap-3 sm:gap-4">
                  
                  {/* Checkbox */}
                  <div className="flex-shrink-0 pt-1">
                    <input type="checkbox" checked={selectedIds.has(order.id)} onChange={()=>toggleSelect(order.id)}
                      onClick={e=>e.stopPropagation()} 
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                  </div>

                  {/* Info Area */}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={()=>openOrder(order)}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-1.5">
                      <span className="font-bold text-slate-900 tracking-tight">{order.order_number}</span>
                      <div className="flex flex-wrap gap-2">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${STATUS_COLORS[order.status]}`}>
                          {order.status}
                        </span>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${order.payment_status==="paid"?"bg-emerald-50 text-emerald-700 border-emerald-200":"bg-amber-50 text-amber-700 border-amber-200"}`}>
                          {order.payment_status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-slate-500">
                      <span className="font-semibold text-slate-700 truncate max-w-[200px]">
                        {order.full_name||order.user_name||"Guest Customer"}
                      </span>
                      <span className="hidden sm:inline text-slate-300">•</span>
                      <span className="truncate">{order.email}</span>
                      <span className="hidden sm:inline text-slate-300">•</span>
                      <span className="text-slate-400">{new Date(order.created_at).toLocaleDateString("en-LK")}</span>
                    </div>
                  </div>

                  {/* Action & Total Area */}
                  <div className="flex w-full sm:w-auto items-center justify-end gap-3 flex-shrink-0 border-t border-slate-100 pt-3 sm:border-0 sm:pt-0">
                    <div className="text-right">
                      <p className="font-bold text-slate-900">LKR {parseFloat(order.total_amount).toLocaleString()}</p>
                      <p className="text-xs font-medium text-slate-400 capitalize">{order.payment_method}</p>
                    </div>
                    
                    <button
                      onClick={(e) => downloadInvoice(order.id, order.order_number, e)}
                      disabled={invoiceLoading === order.id}
                      title="Download Invoice PDF"
                      className="p-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors disabled:opacity-50 shadow-sm"
                    >
                      {invoiceLoading === order.id ? (
                        <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ORDER DETAIL MODAL */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4 py-6 overflow-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-auto max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                    {selectedOrder.order_number}
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-wider ${STATUS_COLORS[selectedOrder.status]}`}>
                      {selectedOrder.status}
                    </span>
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    {new Date(selectedOrder.created_at).toLocaleString("en-LK")}
                  </p>
                </div>
                <button onClick={()=>{setSelectedOrder(null);setOrderDetails(null);}} className="text-slate-400 hover:text-slate-700 bg-white border border-slate-200 rounded-lg p-2 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-6">
                {detailLoading ? (
                  <div className="min-h-[30vh] flex flex-col items-center justify-center text-slate-400">
                    <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-sm font-medium">Loading details...</p>
                  </div>
                ) : orderDetails ? (
                  <>
                    {/* Customer & Payment Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Customer Details</p>
                        </div>
                        <p className="font-bold text-slate-900">{orderDetails.full_name||orderDetails.user_name}</p>
                        <p className="text-sm text-slate-500 mt-0.5">{orderDetails.email}</p>
                        <p className="text-sm font-medium text-slate-700 mt-0.5">{orderDetails.phone}</p>
                        {orderDetails.phone && (
                          <a href={`https://wa.me/94${orderDetails.phone?.replace(/^0/,"")?.replace(/\D/,"")}?text=Hi! Regarding your order ${orderDetails.order_number}`}
                            target="_blank" rel="noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 mt-3 w-full text-xs bg-[#25D366] text-white px-3 py-2 rounded-lg font-bold hover:bg-[#128C7E] transition-colors shadow-sm">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                            Message on WhatsApp
                          </a>
                        )}
                      </div>
                      
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Payment Info</p>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">LKR {parseFloat(orderDetails.total_amount).toLocaleString()}</p>
                        <p className="text-sm font-medium text-slate-500 mt-1 capitalize">{orderDetails.payment_method}</p>
                        <div className="mt-2">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-wider ${orderDetails.payment_status==="paid"?"bg-emerald-50 text-emerald-700 border-emerald-200":"bg-amber-50 text-amber-700 border-amber-200"}`}>
                            {orderDetails.payment_status || "Unknown"}
                          </span>
                          {orderDetails.status === "delivered" && String(orderDetails.payment_status || "").toLowerCase() !== "paid" && (
                            <p className="mt-2 text-xs text-amber-700">Delivered, but payment is not recorded as settled. Verify COD collection before marking paid.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Delivery Address */}
                    {orderDetails.shipping_address && (
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                          Delivery Address
                        </p>
                        <p className="text-sm text-slate-700 font-medium leading-relaxed">{getAddr(orderDetails.shipping_address)}</p>
                        {getPhone(orderDetails.shipping_address) && <p className="text-sm text-indigo-600 font-semibold mt-1">{getPhone(orderDetails.shipping_address)}</p>}
                      </div>
                    )}

                    {/* Order Items */}
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Order Items</p>
                      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <ul className="divide-y divide-slate-100">
                          {(orderDetails.items||[]).map((item,idx) => (
                            <li key={idx} className="p-4 flex gap-4 hover:bg-slate-50 transition-colors">
                              <img src={`https://nagnail.lk/images/${item.image_url}`} alt={item.name}
                                className="w-16 h-16 object-cover rounded-lg bg-slate-100 border border-slate-200 flex-shrink-0"
                                onError={e=>e.target.src="https://placehold.co/64x64?text=Img"} />
                              <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <p className="font-bold text-slate-900 text-sm truncate">{item.name}</p>
                                <p className="text-xs font-medium text-slate-500 mt-0.5">Qty: {item.quantity} × LKR {parseFloat(item.unit_price).toLocaleString()}</p>
                                {(() => {
                                  let varName = "";
                                  if (item.selected_variants) {
                                    if (typeof item.selected_variants === 'object') {
                                      varName = item.selected_variants.name || item.selected_variants.value || JSON.stringify(item.selected_variants);
                                    } else if (typeof item.selected_variants === 'string') {
                                      try {
                                        const parsed = JSON.parse(item.selected_variants);
                                        varName = parsed.name || parsed.value || item.selected_variants;
                                      } catch { varName = item.selected_variants; }
                                    }
                                  }

                                  if (!varName && item.variants_display?.length > 0) {
                                    varName = item.variants_display.map(v => `${v.attr || ''}: ${v.value || ''}`).join(', ');
                                  }

                                  if (varName) {
                                    return (
                                      <div className="flex flex-wrap gap-1.5 mt-2">
                                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-0.5 rounded-md shadow-sm">
                                          🏷️ Option: {varName}
                                        </span>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                              <div className="flex-shrink-0 flex items-center">
                                <p className="font-bold text-slate-900">LKR {parseFloat(item.subtotal).toLocaleString()}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                        
                        {/* Summary Footer */}
                        <div className="bg-slate-50 p-4 border-t border-slate-200 space-y-2">
                          <div className="flex justify-between text-sm"><span className="text-slate-500 font-medium">Subtotal</span><span className="font-semibold text-slate-900">LKR {parseFloat(orderDetails.subtotal||0).toLocaleString()}</span></div>
                          <div className="flex justify-between text-sm"><span className="text-slate-500 font-medium">Shipping Fee</span><span className={`font-semibold ${parseFloat(orderDetails.shipping_fee||0)===0?"text-emerald-600":"text-slate-900"}`}>{parseFloat(orderDetails.shipping_fee||0)===0?"FREE":`LKR ${parseFloat(orderDetails.shipping_fee||0).toLocaleString()}`}</span></div>
                          <div className="flex justify-between border-t border-slate-200 pt-3 mt-3"><span className="font-bold text-slate-900">Total Amount</span><span className="font-black text-indigo-600 text-lg">LKR {parseFloat(orderDetails.total_amount).toLocaleString()}</span></div>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {orderDetails.notes && (
                      <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 shadow-sm">
                        <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                          Customer Notes
                        </p>
                        <p className="text-sm text-amber-900 font-medium leading-relaxed">{orderDetails.notes}</p>
                      </div>
                    )}
                  </>
                ) : <p className="text-center text-slate-400 py-10">Failed to load order details</p>}
              </div>

              {/* Modal Footer */}
              <div className="p-5 sm:p-6 border-t border-slate-200 bg-white space-y-4 rounded-b-2xl">
                <button
                  onClick={() => downloadInvoice(selectedOrder.id, selectedOrder.order_number)}
                  disabled={invoiceLoading === selectedOrder.id}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors disabled:opacity-70 shadow-md"
                >
                  {invoiceLoading === selectedOrder.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      Download Invoice PDF
                    </>
                  )}
                </button>

                <div className="pt-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">Change Order Status</p>
                  <div className="flex gap-2 flex-wrap justify-center">
                    {["confirmed","processing","shipped","delivered","cancelled"].map(s => s!==selectedOrder.status && (
                      <button key={s} onClick={()=>updateStatus(selectedOrder.id,s)}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all capitalize border shadow-sm ${
                          s==="delivered"?"bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-700":
                          s==="cancelled"?"bg-rose-600 border-rose-700 text-white hover:bg-rose-700":
                          s==="shipped"?"bg-orange-500 border-orange-600 text-white hover:bg-orange-600":
                          "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"}`}>
                        Move to {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
