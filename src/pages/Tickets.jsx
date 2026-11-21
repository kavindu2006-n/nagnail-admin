import { useState, useEffect } from "react";
import Layout from "../components/Layout";

const API = "";
const useAdminToken = () => localStorage.getItem("admin_token") || "";

const apiFetch = (method, path, body, token) =>
  fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }).then(r => r.json());

const apiGet  = (path, token)       => apiFetch("GET",  path, null, token);
const apiPost = (path, body, token) => apiFetch("POST", path, body, token);
const apiPut  = (path, body, token) => apiFetch("PUT",  path, body, token);

const TABS = [
  { label:"Overview",   icon:"📊" },
  { label:"Events",     icon:"🎪" },
  { label:"Orders",     icon:"📋" },
  { label:"Organisers", icon:"👥" },
  { label:"Receipts",   icon:"🏦" },
];

const statusBadge = (status) => {
  const map = {
    confirmed:             "bg-green-100 text-green-700 border-green-200",
    pending:               "bg-yellow-100 text-yellow-700 border-yellow-200",
    bank_transfer_pending: "bg-blue-100 text-blue-700 border-blue-200",
    receipt_uploaded:      "bg-purple-100 text-purple-700 border-purple-200",
    cancelled:             "bg-red-100 text-red-700 border-red-200",
    refunded:              "bg-gray-100 text-gray-600 border-gray-200",
    on_sale:               "bg-green-100 text-green-700 border-green-200",
    draft:                 "bg-gray-100 text-gray-600 border-gray-200",
    paused:                "bg-yellow-100 text-yellow-700 border-yellow-200",
    ended:                 "bg-blue-100 text-blue-700 border-blue-200",
    rejected:              "bg-red-100 text-red-700 border-red-200",
  };
  return `text-xs px-2.5 py-1 rounded-full font-medium border ${map[status] || "bg-gray-100 text-gray-600 border-gray-200"}`;
};

const statusLabel = (s) => ({
  confirmed:"✅ Confirmed", pending:"⏳ Pending",
  bank_transfer_pending:"🏦 Awaiting Transfer", receipt_uploaded:"📋 Receipt Uploaded",
  cancelled:"❌ Cancelled", refunded:"↩ Refunded", on_sale:"🟢 On Sale",
  draft:"📝 Draft", paused:"⏸ Paused", ended:"🏁 Ended", rejected:"❌ Rejected",
}[s] || s);

export default function Tickets() {
  const token = useAdminToken();
  const [tab, setTab]           = useState(0);
  const [overview, setOverview] = useState(null);
  const [events, setEvents]     = useState([]);
  const [orders, setOrders]     = useState([]);
  const [orgs, setOrgs]         = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [orderSearch, setOrderSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    apiGet("/api/tickets/admin/overview", token)
      .then(d => setOverview(d)).catch(()=>{}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab===1) apiGet("/api/tickets/admin/events", token).then(d => setEvents(d.events||[])).catch(()=>{});
    if (tab===2) apiGet("/api/tickets/admin/orders", token).then(d => setOrders(d.orders||[])).catch(()=>{});
    if (tab===3) apiGet("/api/tickets/admin/organisers", token).then(d => setOrgs(d.organisers||[])).catch(()=>{});
    if (tab===4) apiGet("/api/tickets/admin/pending-receipts", token).then(d => setReceipts(d.orders||[])).catch(()=>{});
  }, [tab]);

  const s = overview?.stats || {};

  const approveReceipt = async (ref) => {
    try {
      const d = await apiPost(`/api/tickets/admin/approve-receipt/${ref}`, {}, token);
      if (d.success) { setReceipts(p => p.filter(r => r.order_ref !== ref)); alert("✅ Ticket approved & sent to WhatsApp!"); }
      else alert("Error: " + d.error);
    } catch(e) { alert("Error: " + e.message); }
  };

  const rejectReceipt = async (ref) => {
    if (!window.confirm(`Reject receipt for ${ref}?`)) return;
    try {
      await apiPost(`/api/tickets/admin/reject-receipt/${ref}`, {}, token);
      setReceipts(p => p.filter(r => r.order_ref !== ref));
    } catch(e) { alert("Error: " + e.message); }
  };

  const updateEventStatus   = async (id, status)   => { await apiPut(`/api/tickets/admin/events/${id}`, {status}, token); setEvents(p => p.map(e => e.id===id?{...e,status}:e)); };
  const updateEventFeatured = async (id, featured) => { await apiPut(`/api/tickets/admin/events/${id}`, {featured:featured?1:0}, token); setEvents(p => p.map(e => e.id===id?{...e,featured}:e)); };
  const approveOrg          = async (id, approved) => { await apiPut(`/api/tickets/admin/organisers/${id}/approve`, {approved}, token); setOrgs(p => p.map(o => o.id===id?{...o,approved:approved?1:0}:o)); };
  const refundOrder         = async (ref) => { if (!window.confirm(`Refund ${ref}?`)) return; await apiPut(`/api/tickets/admin/orders/${ref}/refund`, {}, token); setOrders(p => p.map(o => o.order_ref===ref?{...o,status:"refunded"}:o)); };

  const filteredEvents = events.filter(e => !eventSearch || e.title?.toLowerCase().includes(eventSearch.toLowerCase()) || e.organiser_name?.toLowerCase().includes(eventSearch.toLowerCase()));
  const filteredOrders = orders.filter(o => !orderSearch || o.order_ref?.toLowerCase().includes(orderSearch.toLowerCase()) || o.primary_attendee?.toLowerCase().includes(orderSearch.toLowerCase()) || o.primary_email?.toLowerCase().includes(orderSearch.toLowerCase()));

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-800">🎟️ Ticket Platform</h1>
            <p className="text-gray-500 text-sm mt-0.5">tickets.nagnail.lk — Full Management</p>
          </div>
          <a href="https://tickets.nagnail.lk" target="_blank" rel="noreferrer"
            className="flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-semibold transition shadow-sm">
            View Live Site ↗
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {loading ? [...Array(5)].map((_,i) => <div key={i} className="bg-white rounded-2xl p-5 h-24 animate-pulse"/>)
          : [
            { l:"Total Revenue",   v:`LKR ${((parseInt(s.totalRevenue)||0)/1000).toFixed(1)}K`, icon:"💰", sub:`${s.totalTickets||0} tickets` },
            { l:"Live Events",     v:s.onSaleEvents||0,    icon:"🎪", sub:`${s.totalEvents||0} total` },
            { l:"Tickets Sold",    v:s.totalTickets||0,    icon:"🎟️", sub:"all time" },
            { l:"Pending Receipts",v:receipts.length||"—", icon:"🏦", sub:"need review", highlight: receipts.length > 0 },
            { l:"Organisers",      v:`${s.approvedOrganisers||0}/${s.totalOrganisers||0}`, icon:"👥", sub:"approved" },
          ].map(x => (
            <div key={x.l} className={`bg-white rounded-2xl p-5 shadow-sm border transition ${x.highlight?"border-orange-300 bg-orange-50":"border-gray-100"}`}>
              <div className="text-2xl mb-2">{x.icon}</div>
              <p className="text-2xl font-black text-gray-800">{x.v}</p>
              <p className="text-gray-500 text-xs mt-0.5">{x.l}</p>
              <p className="text-gray-400 text-xs">{x.sub}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {TABS.map((t,i) => (
              <button key={t.label} onClick={() => setTab(i)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all ${
                  tab===i ? "border-b-2 border-purple-600 text-purple-600 bg-purple-50/50" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                }`}>
                {t.icon} {t.label}
                {t.label==="Receipts" && receipts.length>0 && (
                  <span className="bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{receipts.length}</span>
                )}
              </button>
            ))}
          </div>

          <div className="p-6">

            {/* ── OVERVIEW ── */}
            {tab===0 && overview && (
              <div className="grid lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">📋 Recent Orders</h3>
                  <div className="space-y-2">
                    {(overview.recentOrders||[]).slice(0,8).map(o => (
                      <div key={o.order_ref} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition cursor-pointer border border-gray-50 hover:border-gray-200"
                        onClick={() => setSelectedOrder(o)}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                            <span className="text-purple-600 font-bold text-xs">{o.primary_attendee?.[0]||"?"}</span>
                          </div>
                          <div>
                            <p className="font-mono text-xs text-purple-600 font-bold">{o.order_ref}</p>
                            <p className="text-gray-500 text-xs">{o.event_title?.slice(0,30)}... · {o.tier_name}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-gray-800 text-sm">LKR {parseInt(o.total).toLocaleString()}</p>
                          <span className={statusBadge(o.status)}>{statusLabel(o.status)}</span>
                        </div>
                      </div>
                    ))}
                    {!overview.recentOrders?.length && <p className="text-gray-400 text-sm text-center py-8">No orders yet</p>}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">📊 Revenue by Category</h3>
                  <div className="space-y-4">
                    {(overview.revenueByCategory||[]).map(c => {
                      const max = Math.max(...(overview.revenueByCategory||[{revenue:1}]).map(x=>parseInt(x.revenue)||0));
                      const pct = max > 0 ? Math.round((parseInt(c.revenue)||0)/max*100) : 0;
                      return (
                        <div key={c.category}>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="text-gray-600 font-semibold">{c.category}</span>
                            <div className="text-right">
                              <span className="text-gray-800 font-bold">LKR {parseInt(c.revenue).toLocaleString()}</span>
                              <span className="text-gray-400 text-xs ml-2">({c.orders} orders)</span>
                            </div>
                          </div>
                          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{width:`${pct}%`, background:"linear-gradient(90deg,#7c22c8,#9b3fe8)"}}/>
                          </div>
                        </div>
                      );
                    })}
                    {!overview.revenueByCategory?.length && <p className="text-gray-400 text-sm text-center py-8">No revenue data yet</p>}
                  </div>

                  {/* Quick stats */}
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="bg-purple-50 rounded-xl p-4">
                      <p className="text-purple-600 text-xs font-semibold mb-1">Avg Order Value</p>
                      <p className="text-purple-800 font-black text-lg">
                        LKR {s.totalTickets > 0 ? Math.round((parseInt(s.totalRevenue)||0) / (parseInt(s.totalTickets)||1)).toLocaleString() : "—"}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4">
                      <p className="text-green-600 text-xs font-semibold mb-1">Confirmed Rate</p>
                      <p className="text-green-800 font-black text-lg">
                        {overview.recentOrders?.length > 0
                          ? Math.round(overview.recentOrders.filter(o=>o.status==="confirmed").length/overview.recentOrders.length*100) + "%"
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── EVENTS ── */}
            {tab===1 && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-gray-700">All Events <span className="text-gray-400 font-normal">({filteredEvents.length})</span></h3>
                  <input type="text" placeholder="🔍 Search events..." value={eventSearch}
                    onChange={e => setEventSearch(e.target.value)}
                    className="text-sm border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 w-56"/>
                </div>
                <div className="space-y-3">
                  {filteredEvents.map(e => {
                    const sold = parseInt(e.total_sold)||0;
                    const cap  = parseInt(e.total_capacity)||1;
                    const pct  = Math.round(sold/cap*100);
                    return (
                      <div key={e.id} className="flex items-center gap-4 p-4 border border-gray-100 rounded-2xl hover:border-purple-200 hover:bg-purple-50/30 transition group">
                        {e.banner_image||e.thumb_image
                          ? <img src={e.thumb_image||e.banner_image} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0"/>
                          : <div className="w-16 h-16 rounded-xl bg-purple-100 flex items-center justify-center text-2xl flex-shrink-0">🎪</div>
                        }
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-gray-800 truncate">{e.title}</p>
                            {e.featured ? <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-200">⭐ Featured</span> : null}
                          </div>
                          <p className="text-gray-400 text-xs mb-2">{e.organiser_name} · 📅 {e.event_date?.slice(0,10)} · 📍 {e.city}</p>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{width:`${pct}%`, background:pct>=90?"#ef4444":pct>=70?"#f59e0b":"#9b3fe8"}}/>
                            </div>
                            <span className="text-xs text-gray-500 flex-shrink-0">{sold}/{cap} ({pct}%)</span>
                            <span className="text-xs font-bold text-gray-700">LKR {((parseInt(e.revenue)||0)/1000).toFixed(1)}K</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => updateEventFeatured(e.id, !e.featured)}
                            className="text-xs px-3 py-1.5 rounded-lg border transition hover:bg-yellow-50"
                            style={{borderColor: e.featured?"#f59e0b":"#e5e7eb", color: e.featured?"#d97706":"#9ca3af"}}>
                            {e.featured ? "★ Unfeature" : "☆ Feature"}
                          </button>
                          <select value={e.status} onChange={ev => updateEventStatus(e.id, ev.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white">
                            {["draft","on_sale","paused","ended","cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <span className={statusBadge(e.status)}>{statusLabel(e.status)}</span>
                        </div>
                      </div>
                    );
                  })}
                  {!filteredEvents.length && (
                    <div className="text-center py-16 text-gray-400">
                      <p className="text-4xl mb-2">🎪</p>
                      <p>No events found</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── ORDERS ── */}
            {tab===2 && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-gray-700">All Orders <span className="text-gray-400 font-normal">({filteredOrders.length})</span></h3>
                  <input type="text" placeholder="🔍 Search ref, name, email..." value={orderSearch}
                    onChange={e => setOrderSearch(e.target.value)}
                    className="text-sm border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 w-64"/>
                </div>
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-gray-500 text-xs">
                        <th className="px-4 py-3 font-semibold">Order</th>
                        <th className="px-4 py-3 font-semibold">Customer</th>
                        <th className="px-4 py-3 font-semibold">Event</th>
                        <th className="px-4 py-3 font-semibold">Qty</th>
                        <th className="px-4 py-3 font-semibold">Total</th>
                        <th className="px-4 py-3 font-semibold">Payment</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Date</th>
                        <th className="px-4 py-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredOrders.map(o => (
                        <tr key={o.id} className="hover:bg-purple-50/30 transition group">
                          <td className="px-4 py-3 font-mono text-xs text-purple-600 font-bold">{o.order_ref}</td>
                          <td className="px-4 py-3">
                            <p className="text-gray-800 text-xs font-semibold">{o.primary_attendee}</p>
                            <p className="text-gray-400 text-xs">{o.primary_whatsapp}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-gray-800 text-xs font-medium max-w-32 truncate">{o.event_title}</p>
                            <p className="text-gray-400 text-xs">{o.tier_name}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs text-center font-bold">{o.quantity}</td>
                          <td className="px-4 py-3 text-gray-800 text-xs font-black">LKR {parseInt(o.total).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                              {o.payment_method==="bank_transfer"?"🏦 Bank":o.payment_method==="stripe"?"💳 Card":"💳"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={statusBadge(o.status)}>{statusLabel(o.status)}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{o.created_at?.slice(0,10)}</td>
                          <td className="px-4 py-3">
                            {o.status==="confirmed" && (
                              <button onClick={() => refundOrder(o.order_ref)}
                                className="text-xs text-red-500 hover:text-red-700 font-medium opacity-0 group-hover:opacity-100 transition border border-red-200 px-2 py-1 rounded-lg hover:bg-red-50">
                                Refund
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!filteredOrders.length && (
                    <div className="text-center py-16 text-gray-400">
                      <p className="text-4xl mb-2">📋</p>
                      <p>No orders found</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── ORGANISERS ── */}
            {tab===3 && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-gray-700">Organisers <span className="text-gray-400 font-normal">({orgs.length})</span></h3>
                  <div className="flex gap-2 text-xs">
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full">{orgs.filter(o=>o.approved).length} approved</span>
                    <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">{orgs.filter(o=>!o.approved).length} pending</span>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {orgs.map(o => (
                    <div key={o.id} className={`border rounded-2xl p-5 hover:shadow-md transition ${o.approved?"border-green-100":"border-yellow-100 bg-yellow-50/30"}`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black text-white flex-shrink-0"
                          style={{background:"linear-gradient(135deg,#7c22c8,#9b3fe8)"}}>
                          {o.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800 truncate">{o.name}</p>
                          <p className="text-gray-400 text-xs truncate">{o.email}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${o.approved?"bg-green-100 text-green-700":"bg-yellow-100 text-yellow-700"}`}>
                          {o.approved ? "✓" : "⏳"}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
                        <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                          <p className="text-gray-400 mb-0.5">Events</p>
                          <p className="font-black text-gray-800">{o.event_count||0}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                          <p className="text-gray-400 mb-0.5">Commission</p>
                          <p className="font-black text-gray-800">{o.commission_rate}%</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                          <p className="text-gray-400 mb-0.5">Since</p>
                          <p className="font-black text-gray-800">{o.created_at?.slice(2,7)}</p>
                        </div>
                      </div>
                      {o.phone && <p className="text-gray-400 text-xs mb-3">📱 {o.phone}</p>}
                      <div className="flex gap-2">
                        {o.approved
                          ? <button onClick={() => approveOrg(o.id, false)}
                              className="flex-1 text-xs text-red-500 border border-red-200 py-2 rounded-xl hover:bg-red-50 transition font-medium">
                              Suspend
                            </button>
                          : <button onClick={() => approveOrg(o.id, true)}
                              className="flex-1 text-xs bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl transition font-semibold">
                              ✅ Approve
                            </button>
                        }
                      </div>
                    </div>
                  ))}
                  {!orgs.length && (
                    <div className="col-span-3 text-center py-16 text-gray-400">
                      <p className="text-4xl mb-2">👥</p>
                      <p>No organisers yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── RECEIPTS ── */}
            {tab===4 && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-gray-700">
                    Pending Bank Transfer Receipts
                    {receipts.length > 0 && <span className="ml-2 bg-orange-100 text-orange-700 text-xs px-2.5 py-1 rounded-full">{receipts.length} pending</span>}
                  </h3>
                  <button onClick={() => apiGet("/api/tickets/admin/pending-receipts", token).then(d => setReceipts(d.orders||[]))}
                    className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition text-gray-600">
                    🔄 Refresh
                  </button>
                </div>

                {receipts.length === 0 ? (
                  <div className="text-center py-20 text-gray-400">
                    <p className="text-5xl mb-3">✅</p>
                    <p className="font-semibold text-gray-600">All clear!</p>
                    <p className="text-sm mt-1">No pending receipts to review</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {receipts.map(r => (
                      <div key={r.order_ref} className="border border-orange-200 rounded-2xl overflow-hidden bg-orange-50/20 hover:shadow-md transition">
                        <div className="p-5">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-mono text-purple-600 font-bold">{r.order_ref}</p>
                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200">
                                  🏦 Bank Transfer
                                </span>
                              </div>
                              <p className="font-bold text-gray-800 text-lg">{r.event_title}</p>
                              <p className="text-gray-500 text-sm">{r.tier_name} · {r.quantity} ticket{r.quantity>1?"s":""}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-black text-gray-800 text-xl">LKR {parseFloat(r.total).toLocaleString()}</p>
                              <p className="text-gray-400 text-xs mt-1">
                                {r.receipt_uploaded_at
                                  ? `Uploaded ${new Date(r.receipt_uploaded_at).toLocaleString()}`
                                  : `Created ${new Date(r.created_at).toLocaleString()}`}
                              </p>
                            </div>
                          </div>

                          <div className="grid sm:grid-cols-3 gap-3 mb-4">
                            <div className="bg-white rounded-xl p-3 border border-gray-100">
                              <p className="text-gray-400 text-xs mb-1">👤 Attendee</p>
                              <p className="font-semibold text-gray-800 text-sm">{r.primary_attendee}</p>
                            </div>
                            <div className="bg-white rounded-xl p-3 border border-gray-100">
                              <p className="text-gray-400 text-xs mb-1">📱 WhatsApp</p>
                              <a href={`https://wa.me/${r.attendee_whatsapp?.replace(/[^0-9]/g,'')}`} target="_blank" rel="noreferrer"
                                className="font-semibold text-green-600 text-sm hover:underline">{r.attendee_whatsapp}</a>
                            </div>
                            <div className="bg-white rounded-xl p-3 border border-gray-100">
                              <p className="text-gray-400 text-xs mb-1">📧 Email</p>
                              <p className="font-semibold text-gray-800 text-sm truncate">{r.attendee_email}</p>
                            </div>
                          </div>

                          {r.receipt_image ? (
                            <div className="mb-4">
                              <a href={`https://tickets.nagnail.lk${r.receipt_image}`} target="_blank" rel="noreferrer"
                                className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-600 text-sm px-4 py-2 rounded-xl hover:bg-blue-100 transition font-medium">
                                🖼️ View Payment Receipt →
                              </a>
                            </div>
                          ) : (
                            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                              <p className="text-yellow-700 text-sm">⚠️ Customer hasn't uploaded receipt yet</p>
                            </div>
                          )}

                          <div className="flex gap-3">
                            <button onClick={() => approveReceipt(r.order_ref)}
                              className="flex-1 py-3 rounded-xl text-white font-bold transition hover:opacity-90"
                              style={{background:"linear-gradient(135deg,#166534,#16a34a)", boxShadow:"0 4px 12px rgba(22,163,74,0.3)"}}>
                              ✅ Approve & Send Ticket
                            </button>
                            <button onClick={() => rejectReceipt(r.order_ref)}
                              className="px-6 py-3 rounded-xl text-red-600 font-semibold border border-red-200 hover:bg-red-50 transition">
                              ❌ Reject
                            </button>
                            <a href={`https://wa.me/${r.attendee_whatsapp?.replace(/[^0-9]/g,'')}?text=Hi%20${r.primary_attendee}%2C%20we%20received%20your%20order%20${r.order_ref}.%20`}
                              target="_blank" rel="noreferrer"
                              className="px-6 py-3 rounded-xl text-green-600 font-semibold border border-green-200 hover:bg-green-50 transition text-sm flex items-center gap-1">
                              💬 WhatsApp
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </Layout>
  );
}
