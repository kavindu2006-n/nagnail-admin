import { useEffect, useState, useMemo } from "react";
import API from "../api/config";
import Layout from "../components/Layout";

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  shipped: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};
const STATUSES = ["all", "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
const NEXT_STATUS = { pending: "confirmed", confirmed: "processing", processing: "shipped", shipped: "delivered" };
const NEXT_LABEL = { confirmed: "Confirm", processing: "Process", shipped: "Ship", delivered: "Deliver" };

const fmtLKR = (v) => `LKR ${parseFloat(v || 0).toLocaleString()}`;
const courierLabel = (c) => String(c || "").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

/* ============================================================
   DEMO DATA — sandbox preview වලට විතරයි (API එක connect නැති විට)
   Production build එකකදී මේ block එක run වෙන්නේ කිසිම වෙලාවක නැහැ.
   ============================================================ */
const demoOrders = () => {
  const h = (n) => new Date(Date.now() - n * 3600 * 1000).toISOString().slice(0, 19).replace("T", " ");
  return [
    { id: 101, order_number: "DN14555437", status: "pending", created_at: h(2), base_price: 550, selling_price: 1000, profit: 450, quantity: 1,
      dropshipper_name: "H. L Nishanthi", dropshipper_business: "Pretty Tips Boutique", dropshipper_email: "nishanthi@gmail.com", dropshipper_phone: "94774026239",
      customer_name: "නිමල් පෙරේරා", customer_phone: "94771234567", customer_phone2: null, customer_city: "Battaramulla", customer_address: "92/A Heenatikubura, Thalangama North",
      product_name: "Gel Nail Polish Set - Rose Series", notes: "Pink color එක ඕන", waybill_no: null, courier: null, shipped_at: null, is_return: 0, variants_display: [] },
    { id: 102, order_number: "DN91045611", status: "shipped", created_at: h(6), base_price: 990, selling_price: 1400, profit: 410, quantity: 1,
      dropshipper_name: "Chamidu Ashan", dropshipper_business: "Nail Art SB", dropshipper_email: "ashan@gmail.com", dropshipper_phone: "94785815517",
      customer_name: "Sanduni Fernando", customer_phone: "94768583742", customer_phone2: "94740309242", customer_city: "Kosgama", customer_address: "239/2, Kahawa",
      product_name: "Acrylic Nail Kit Pro 12pc", notes: null, waybill_no: "DN91045611WB", courier: "royal_express", shipped_at: h(3), is_return: 0, variants_display: [] },
    { id: 103, order_number: "DN85344895", status: "shipped", created_at: h(9), base_price: 1269, selling_price: 1500, profit: 462, quantity: 2,
      dropshipper_name: "Nipun Tharaka", dropshipper_business: "Glam Nail Studio", dropshipper_email: "nipun@gmail.com", dropshipper_phone: "94760496131",
      customer_name: "Aariz Mohammed", customer_phone: "94750818959", customer_phone2: null, customer_city: "Sammanthurai", customer_address: "36A Hura Road, Block J East 3",
      product_name: "Nail Extension Tips (500pcs) + Glue Combo", notes: "", waybill_no: "RE88213400", courier: "royal_express", shipped_at: h(4), is_return: 0,
      variants_display: [{ attr: "Colour", value: "Milky White", color_hex: "#f5f0e6" }] },
    { id: 104, order_number: "DN76727305", status: "delivered", created_at: h(28), base_price: 1340, selling_price: 1790, profit: 450, quantity: 1,
      dropshipper_name: "Nilanka Kumar", dropshipper_business: "BeautyLK Store", dropshipper_email: "nilanka@gmail.com", dropshipper_phone: "94772814217",
      customer_name: "Kumari Silva", customer_phone: "94774145791", customer_phone2: null, customer_city: "Badulla", customer_address: "Meegahakula",
      product_name: "Cat Eye Gel Polish - 6 Colors", notes: "Fast delivery ප්ලීස්", waybill_no: "RE77129034", courier: "royal_express", shipped_at: h(20), is_return: 0, variants_display: [] },
    { id: 105, order_number: "DN54068096", status: "cancelled", created_at: h(50), base_price: 1690, selling_price: 2308, profit: 618, quantity: 1,
      dropshipper_name: "Maduka Nethsara", dropshipper_business: "", dropshipper_email: "maduka@gmail.com", dropshipper_phone: "94758065522",
      customer_name: "Tharindu Bandara", customer_phone: "94743128663", customer_phone2: null, customer_city: "Pilimathalawa", customer_address: "6/3, Atamurupitiya, Kotaligoda",
      product_name: "Professional LED Nail Lamp 48W", notes: "මිටි දෙන්න පුළුවන්ද බැලන්න", waybill_no: null, courier: null, shipped_at: null, is_return: 1, variants_display: [] },
    { id: 106, order_number: "DN11413678", status: "confirmed", created_at: h(12), base_price: 650, selling_price: 900, profit: 250, quantity: 1,
      dropshipper_name: "Hugo Almeida", dropshipper_business: "AZORA Boutique", dropshipper_email: "hugo@gmail.com", dropshipper_phone: "94743785487",
      customer_name: "Michelle Perera", customer_phone: "94712908834", customer_phone2: null, customer_city: "Ahangama", customer_address: "Prince Gunasekara Mawatha",
      product_name: "Press-On Nails - French Tip (24 nails)", notes: null, waybill_no: null, courier: null, shipped_at: null, is_return: 0, variants_display: [] },
    { id: 107, order_number: "DN19430074", status: "processing", created_at: h(26), base_price: 690, selling_price: 1000, profit: 310, quantity: 1,
      dropshipper_name: "Nipun Tharaka", dropshipper_business: "Glam Nail Studio", dropshipper_email: "nipun@gmail.com", dropshipper_phone: "94760496131",
      customer_name: "රශ්මිකා ජයවර්ධන", customer_phone: "94766614065", customer_phone2: "9477169627", customer_city: "Negombo", customer_address: "66/6 St. Marys Road, Pallansena",
      product_name: "Nail Sticker Set - 30 Designs", notes: null, waybill_no: null, courier: null, shipped_at: null, is_return: 0, variants_display: [] },
    { id: 108, order_number: "DN78268449", status: "shipped", created_at: h(58), base_price: 1350, selling_price: 1900, profit: 550, quantity: 1,
      dropshipper_name: "Shehan Sandeepa", dropshipper_business: "Nail Bar Kandy", dropshipper_email: "shehan@gmail.com", dropshipper_phone: "94711369838",
      customer_name: "Dilani Rathnayake", customer_phone: "94711369838", customer_phone2: null, customer_city: "Puttalama", customer_address: "Nirmalapura, Daluwa",
      product_name: "Builder Gel - Clear 15ml", notes: "Pink color එක ඕන", waybill_no: "RE76900125", courier: "royal_express", shipped_at: h(30), is_return: 0, variants_display: [] },
    { id: 109, order_number: "DN63712236", status: "delivered", created_at: h(150), base_price: 1090, selling_price: 1500, profit: 410, quantity: 1,
      dropshipper_name: "උරේෂා සංජීවනී", dropshipper_business: "Uresha Beauty Corner", dropshipper_email: "uresha@gmail.com", dropshipper_phone: "94743891143",
      customer_name: "නිරෝෂනා ගුණවර්ධන", customer_phone: "94743891143", customer_phone2: null, customer_city: "Kiribathgoda", customer_address: "259/3 Talawathugoda",
      product_name: "Gel Top Coat + Base Coat Set", notes: null, waybill_no: "RE70012455", courier: "royal_express", shipped_at: h(140), is_return: 0, variants_display: [] },
    { id: 110, order_number: "DN53762564", status: "cancelled", created_at: h(90), base_price: 890, selling_price: 1300, profit: 410, quantity: 1,
      dropshipper_name: "Sammy Raiz", dropshipper_business: "SR Traders", dropshipper_email: "sammy@gmail.com", dropshipper_phone: "94759182165",
      customer_name: "Kasun Wickramasinghe", customer_phone: "94759182165", customer_phone2: null, customer_city: "Kandy", customer_address: "29/7 Welamboda",
      product_name: "Nail Drill Machine 35000RPM", notes: null, waybill_no: null, courier: null, shipped_at: null, is_return: 0, variants_display: [] },
    { id: 111, order_number: "DN10488799", status: "shipped", created_at: h(48), base_price: 1269, selling_price: 1500, profit: 231, quantity: 1,
      dropshipper_name: "Samila Dewshan", dropshipper_business: "", dropshipper_email: "samila@gmail.com", dropshipper_phone: "94765673736",
      customer_name: "Fathima Rizwan", customer_phone: "94765673736", customer_phone2: null, customer_city: "Kanthale", customer_address: "No.54 Ariyawansha Mawatha",
      product_name: "Nail Art Brushes - 15pc Set", notes: null, waybill_no: "RE75521100", courier: "royal_express", shipped_at: h(40), is_return: 0, variants_display: [] },
    { id: 112, order_number: "DN28386896", status: "delivered", created_at: h(100), base_price: 1090, selling_price: 1500, profit: 410, quantity: 1,
      dropshipper_name: "Asanka Deepani", dropshipper_business: "Deepani Nails", dropshipper_email: "asanka@gmail.com", dropshipper_phone: "94756546275",
      customer_name: "සමන්මලී ජයසිංහ", customer_phone: "94774103787", customer_phone2: "94756546275", customer_city: "Colombo", customer_address: "228/A Nalinpriyamawatha, Siyabalagoda",
      product_name: "Polygel Nail Kit - Beginner Set", notes: "Please safe item and fast delivery", waybill_no: "RE74120099", courier: "royal_express", shipped_at: h(96), is_return: 0, variants_display: [] },
    { id: 113, order_number: "DN06456918", status: "pending", created_at: h(1), base_price: 990, selling_price: 1400, profit: 410, quantity: 3,
      dropshipper_name: "Isanka Ariyarathna", dropshipper_business: "Glam Nail Studio", dropshipper_email: "isanka@gmail.com", dropshipper_phone: "94717490210",
      customer_name: "තිලකරත්න මුදියන්සේලාගේ", customer_phone: "94761229532", customer_phone2: null, customer_city: "Colombo 05", customer_address: "No 163, Kirulapona Avenue",
      product_name: "Quick Dip Powder - Berry Set", notes: "3ක් ඕන, gifts වලට", waybill_no: null, courier: null, shipped_at: null, is_return: 0, variants_display: [] },
    { id: 114, order_number: "DN74581283", status: "confirmed", created_at: h(20), base_price: 690, selling_price: 1000, profit: 310, quantity: 1,
      dropshipper_name: "M.M Amila Perera", dropshipper_business: "Amila Beauty Products", dropshipper_email: "amila@gmail.com", dropshipper_phone: "94768583742",
      customer_name: "Gayan Wijesuriya", customer_phone: "94768583742", customer_phone2: "94740309242", customer_city: "Galgamuwa", customer_address: "120/5 Palukandewa",
      product_name: "Cuticle Oil Pen - 3 Pack", notes: null, waybill_no: null, courier: null, shipped_at: null, is_return: 0, variants_display: [] },
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

export default function DropshipOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [menuId, setMenuId] = useState(null);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      const res = await API.get("/dropship-orders");
      if (res.data.success) setOrders(res.data.orders);
    } catch (err) {
      console.error(err);
      if (import.meta.env.DEV) setOrders(demoOrders());
    } finally { setLoading(false); }
  };

  const openOrder = async (id) => {
    setDetailLoading(true);
    try {
      const res = await API.get(`/dropship-orders/${id}`);
      if (res.data.success) setSelectedOrder(res.data.order);
    } catch (err) {
      console.error(err);
      if (import.meta.env.DEV) setSelectedOrder(orders.find((o) => o.id === id) || null);
    } finally { setDetailLoading(false); }
  };

  const showMsg = (text) => { setMsg(text); setTimeout(() => setMsg(""), 3000); };

  const copyText = async (text, message) => {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
    }
    showMsg(message || "Copied!");
  };

  const applyStatusLocal = (id, status, extra = {}) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status, ...extra } : o)));
    setSelectedOrder((prev) => (prev && prev.id === id ? { ...prev, status, ...extra } : prev));
  };

  const updateStatus = async (id, status) => {
    // NN-DS-B: waybill on ship, return flag on cancel
    let waybill_no, is_return;
    if (status === "shipped") { const w = window.prompt("Royal Express waybill number (හිස්ව තිබ්බත් කමක් නෑ)", ""); if (w === null) return; waybill_no = w.trim(); }
    if (status === "cancelled") is_return = window.confirm("මේක customer parcel එක භාර නොගත්ත RETURN එකක්ද?\n\nOK = Return\nCancel = සාමාන්‍ය cancel");
    try {
      await API.put(`/dropship-orders/${id}/status`, { status, waybill_no, is_return });
      showMsg(`Status updated to ${status}`);
      fetchOrders();
      if (selectedOrder?.id === id) setSelectedOrder((prev) => ({ ...prev, status }));
    } catch (err) {
      console.error(err);
      if (import.meta.env.DEV) {
        applyStatusLocal(id, status, {
          ...(status === "shipped" ? { waybill_no: waybill_no || "RE-DEMO", courier: "royal_express", shipped_at: new Date().toISOString().slice(0, 19).replace("T", " ") } : {}),
          ...(status === "cancelled" ? { is_return: is_return ? 1 : 0 } : {}),
        });
        showMsg(`(DEMO) Status updated to ${status}`);
      }
    }
  };

  const bulkUpdate = async (status) => {
    if (!selected.length) return;
    if (!confirm(`Update ${selected.length} orders to "${status}"?`)) return;
    try {
      await API.put("/dropship-orders/bulk-status", { ids: selected, status });
      showMsg(`${selected.length} orders updated to ${status}`);
      setSelected([]);
      fetchOrders();
    } catch (err) {
      console.error(err);
      if (import.meta.env.DEV) {
        setOrders((prev) => prev.map((o) => (selected.includes(o.id) ? { ...o, status } : o)));
        showMsg(`(DEMO) ${selected.length} orders updated to ${status}`);
        setSelected([]);
      }
    }
  };

  const toggleSelect = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleAll = () => setSelected(selected.length === filtered.length ? [] : filtered.map((o) => o.id));

  const filtered = useMemo(() => orders.filter((o) => {
    const q = search.toLowerCase();
    const matchFilter = filter === "all" || o.status === filter;
    const matchSearch = !q ||
      o.order_number?.toLowerCase().includes(q) ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.customer_phone?.toLowerCase().includes(q) ||
      o.customer_city?.toLowerCase().includes(q) ||
      o.dropshipper_name?.toLowerCase().includes(q) ||
      o.dropshipper_business?.toLowerCase().includes(q) ||
      o.waybill_no?.toLowerCase().includes(q);
    const matchFrom = !dateFrom || new Date(o.created_at) >= new Date(dateFrom);
    const matchTo = !dateTo || new Date(o.created_at) <= new Date(dateTo + "T23:59:59");
    return matchFilter && matchSearch && matchFrom && matchTo;
  }), [orders, filter, search, dateFrom, dateTo]);

  const todayStr = new Date().toDateString();
  const stats = useMemo(() => ({
    total: orders.length,
    today: orders.filter((o) => new Date(o.created_at).toDateString() === todayStr).length,
    pending: orders.filter((o) => o.status === "pending").length,
    profit: filtered.filter((o) => o.status !== "cancelled").reduce((s, o) => s + parseFloat(o.profit || 0) * (o.quantity || 1), 0),
    filteredCount: filtered.length,
  }), [orders, filtered, todayStr]);

  const exportCSV = () => {
    const rows = [["Order#", "Dropshipper", "Shop", "Customer", "Phone", "City", "Product", "Qty", "Base", "Sell", "Profit", "Status", "Return", "Waybill", "Shipped", "Date"]];
    filtered.forEach((o) => rows.push([
      o.order_number, o.dropshipper_name || "", o.dropshipper_business || "", o.customer_name || "",
      o.customer_phone || "", o.customer_city || "", o.product_name || "", o.quantity || 1,
      parseFloat(o.base_price).toFixed(2), parseFloat(o.selling_price).toFixed(2), parseFloat(o.profit).toFixed(2),
      o.status, o.is_return ? "RETURN" : "", o.waybill_no || "",
      o.shipped_at ? new Date(o.shipped_at).toLocaleDateString("en-LK") : "",
      new Date(o.created_at).toLocaleDateString("en-LK"),
    ]));
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `dropship-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const renderStatusChip = (o) => (
    <>
      <span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_COLORS[o.status]}`}>{o.status.toUpperCase()}</span>
      {Number(o.is_return) === 1 && (
        <span className="block mt-1 text-xs font-bold text-red-600 border border-red-200 bg-red-50 rounded-full px-2 py-0.5 w-fit">↩ RETURN</span>
      )}
    </>
  );

  return (
    <Layout>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-800">Dropship Orders</h2>
          <p className="text-gray-500 text-sm mt-1">{orders.length} total orders · {stats.today} today</p>
        </div>
        {selected.length > 0 && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
            <span className="text-blue-700 font-bold text-sm">{selected.length} selected</span>
            <div className="flex gap-1">
              {["confirmed", "processing", "shipped", "delivered", "cancelled"].map((s) => (
                <button key={s} onClick={() => bulkUpdate(s)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold text-white ${
                    s === "delivered" ? "bg-green-500" : s === "cancelled" ? "bg-red-500" : s === "shipped" ? "bg-orange-500" : "bg-gray-500"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">✅ {msg}</div>}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Orders", value: stats.filteredCount, color: "text-gray-800", bg: "bg-gray-50" },
          { label: "Today", value: stats.today, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Pending (action needed)", value: stats.pending, color: "text-yellow-600", bg: "bg-yellow-50" },
          { label: "Profit (filtered, not cancelled)", value: fmtLKR(stats.profit), color: "text-green-600", bg: "bg-green-50" },
        ].map((k) => (
          <div key={k.label} className={`${k.bg} rounded-2xl p-4`}>
            <p className={`text-xl font-black ${k.color}`}>{k.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3 mb-3">
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#16a34a]" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#16a34a]" />
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(""); setDateTo(""); }}
            className="border-2 border-red-200 text-red-500 px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-red-50">✕ Clear dates</button>
        )}
        <button onClick={exportCSV}
          className="ml-auto flex items-center gap-2 border-2 border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:border-[#16a34a] hover:text-[#16a34a]">📥 Export CSV</button>
      </div>
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search: order #, customer, phone, city, dropshipper, shop, waybill..."
          className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#16a34a] text-sm" />
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                filter === s ? "bg-gray-900 text-white" : "bg-white border-2 border-gray-200 text-gray-600 hover:border-gray-400"}`}>
              {s} ({s === "all" ? orders.length : orders.filter((o) => o.status === s).length})
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20"><div className="animate-spin w-10 h-10 border-4 border-[#16a34a] border-t-transparent rounded-full mx-auto"></div></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400"><p className="text-4xl mb-2">📦</p><p>No orders found</p></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} className="rounded" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">ORDER</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 hidden md:table-cell">DROPSHIPPER / SHOP</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 hidden md:table-cell">CUSTOMER</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">PRODUCT</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">PROFIT</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">STATUS</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((order) => {
                const next = NEXT_STATUS[order.status];
                return (
                  <tr key={order.id} onClick={() => openOrder(order.id)} className="hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.includes(order.id)} onChange={() => toggleSelect(order.id)} className="rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-800 font-mono text-xs">{order.order_number}</p>
                      <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString("en-LK", { month: "short", day: "numeric" })}</p>
                      {order.waybill_no && (
                        <p onClick={(e) => { e.stopPropagation(); copyText(order.waybill_no, `Waybill ${order.waybill_no} copied! 📋`); }}
                          title="Click to copy"
                          className="text-xs text-orange-600 font-mono mt-0.5 cursor-pointer hover:underline w-fit">📦 {order.waybill_no}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="font-semibold text-gray-700 text-xs">{order.dropshipper_name}</p>
                      {order.dropshipper_business
                        ? <p className="text-xs text-[#16a34a] font-semibold">🏪 {order.dropshipper_business}</p>
                        : <p className="text-xs text-gray-400">{order.dropshipper_email}</p>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="font-semibold text-gray-700 text-xs">{order.customer_name}</p>
                      <p className="text-xs text-gray-400">{order.customer_phone}</p>
                      {order.customer_phone2 && <p className="text-xs text-gray-400">📞 {order.customer_phone2}</p>}
                    </td>
                    <td className="px-4 py-3 max-w-32">
                      <p className="text-xs text-gray-700 line-clamp-2">{order.product_name}</p>
                      {Number(order.quantity) > 1 && (
                        <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-md">×{order.quantity}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-black text-[#16a34a] text-sm">{fmtLKR(order.profit)}</p>
                    </td>
                    <td className="px-4 py-3">{renderStatusChip(order)}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        {next && (
                          <button onClick={() => updateStatus(order.id, next)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all ${
                              next === "delivered" ? "bg-green-500 hover:bg-green-600" :
                              next === "shipped" ? "bg-orange-500 hover:bg-orange-600" :
                              next === "confirmed" ? "bg-blue-500 hover:bg-blue-600" :
                              "bg-purple-500 hover:bg-purple-600"}`}>
                            {NEXT_LABEL[next]} →
                          </button>
                        )}
                        <div className="relative">
                          <button onClick={() => setMenuId(menuId === order.id ? null : order.id)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200"
                            title="More statuses">⋯</button>
                          {menuId === order.id && (
                            <>
                              <div className="fixed inset-0 z-30" onClick={() => setMenuId(null)}></div>
                              <div className="absolute right-0 top-full mt-1 z-40 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-36">
                                {STATUSES.filter((s) => s !== "all" && s !== order.status && s !== next).map((s) => (
                                  <button key={s} onClick={() => { setMenuId(null); updateStatus(order.id, s); }}
                                    className={`block w-full text-left px-4 py-2 text-xs font-bold capitalize hover:bg-gray-50 ${
                                      s === "cancelled" ? "text-red-600" : s === "delivered" ? "text-green-600" : "text-gray-700"}`}>
                                    {s === "cancelled" ? "✕ Cancel" : `→ ${s}`}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </div>
      )}

      {/* Detail Modal */}
      {(selectedOrder || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4 py-6" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {detailLoading ? (
              <div className="p-12 text-center"><div className="animate-spin w-8 h-8 border-4 border-[#16a34a] border-t-transparent rounded-full mx-auto"></div></div>
            ) : selectedOrder && (
              <>
                <div className="flex items-center justify-between p-5 border-b">
                  <div>
                    <h3 className="font-black text-gray-800 font-mono">{selectedOrder.order_number}</h3>
                    <p className="text-xs text-gray-400">{new Date(selectedOrder.created_at).toLocaleString("en-LK")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderStatusChip(selectedOrder)}
                    <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 p-5 space-y-4">
                  {/* Product */}
                  <div className="flex gap-3 bg-gray-50 rounded-xl p-3">
                    <img src={`https://nagnail.lk/images/${selectedOrder.product_image}`} alt=""
                      className="w-16 h-16 object-cover rounded-xl bg-white"
                      onError={(e) => { e.target.src = "https://placehold.co/64x64?text=?"; }} />
                    <div className="flex-1">
                      <p className="font-bold text-gray-800 text-sm">{selectedOrder.product_name}</p>
                      {Number(selectedOrder.quantity) > 1 && (
                        <p className="text-xs font-bold text-blue-600 mt-0.5">Qty: ×{selectedOrder.quantity}</p>
                      )}
                      {selectedOrder.variants_display?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedOrder.variants_display.map((v, i) => (
                            <span key={i} className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                              {v.color_hex && <span className="w-3 h-3 rounded-full inline-block border" style={{ backgroundColor: v.color_hex }}></span>}
                              {v.attr}: {v.value}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs">
                        <span className="text-red-500 font-bold">Cost: {fmtLKR(selectedOrder.base_price)}</span>
                        <span className="text-blue-500 font-bold">Sell: {fmtLKR(selectedOrder.selling_price)}</span>
                        <span className="text-[#16a34a] font-bold">Profit: {fmtLKR(selectedOrder.profit)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dropshipper */}
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs font-bold text-gray-400 mb-1">DROPSHIPPER</p>
                    <p className="font-bold text-gray-800">{selectedOrder.dropshipper_name}</p>
                    {selectedOrder.dropshipper_business && (
                      <p className="text-sm text-[#16a34a] font-bold">🏪 {selectedOrder.dropshipper_business}</p>
                    )}
                    <p className="text-xs text-gray-500">{selectedOrder.dropshipper_email} · {selectedOrder.dropshipper_phone}</p>
                  </div>

                  {/* Customer */}
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs font-bold text-gray-400 mb-1">CUSTOMER & DELIVERY</p>
                    <p className="font-bold text-gray-800">{selectedOrder.customer_name}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs text-gray-500">{selectedOrder.customer_phone}</p>
                      {selectedOrder.customer_phone2 && <p className="text-xs text-gray-500">📞 {selectedOrder.customer_phone2}</p>}
                      {selectedOrder.customer_phone && (
                        <>
                          <a href={`tel:${selectedOrder.customer_phone}`}
                            className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-lg font-bold hover:bg-blue-600">📞 Call</a>
                          <a href={`https://wa.me/94${selectedOrder.customer_phone?.replace(/^0/, "")?.replace(/\D/g, "")}`}
                            target="_blank" rel="noreferrer"
                            className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-lg font-bold hover:bg-green-600">💬 WA</a>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{selectedOrder.customer_address}, {selectedOrder.customer_city}</p>
                  </div>

                  {/* Shipping */}
                  {(selectedOrder.waybill_no || selectedOrder.shipped_at || selectedOrder.courier) && (
                    <div className="bg-orange-50 rounded-xl p-3">
                      <p className="text-xs font-bold text-gray-400 mb-1">🚚 SHIPPING</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-mono font-bold text-gray-800">{selectedOrder.waybill_no || "—"}</p>
                        {selectedOrder.waybill_no && (
                          <button onClick={() => copyText(selectedOrder.waybill_no, `Waybill ${selectedOrder.waybill_no} copied! 📋`)}
                            className="text-xs bg-white border border-orange-200 text-orange-600 px-2 py-0.5 rounded-lg font-bold hover:bg-orange-100">📋 Copy</button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {courierLabel(selectedOrder.courier)}
                        {selectedOrder.shipped_at && ` · Shipped ${new Date(selectedOrder.shipped_at).toLocaleString("en-LK")}`}
                      </p>
                    </div>
                  )}

                  {selectedOrder.notes && (
                    <div className="bg-yellow-50 rounded-xl p-3">
                      <p className="text-xs font-bold text-gray-400 mb-1">NOTES</p>
                      <p className="text-sm text-gray-700">{selectedOrder.notes}</p>
                    </div>
                  )}

                  {/* Status update */}
                  <div>
                    <p className="text-xs font-bold text-gray-400 mb-2">UPDATE STATUS</p>
                    <div className="flex gap-2 flex-wrap">
                      {["confirmed", "processing", "shipped", "delivered", "cancelled"].map((s) => (
                        <button key={s} onClick={() => updateStatus(selectedOrder.id, s)}
                          disabled={selectedOrder.status === s}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 ${
                            s === "delivered" ? "bg-green-500 text-white hover:bg-green-600" :
                            s === "cancelled" ? "bg-red-500 text-white hover:bg-red-600" :
                            s === "shipped" ? "bg-orange-500 text-white hover:bg-orange-600" :
                            "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>
                          → {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
