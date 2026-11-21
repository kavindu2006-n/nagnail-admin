import { useEffect, useState, useMemo } from "react";
import API from "../api/config";
import Layout from "../components/Layout";
import { 
  Users as UsersIcon, 
  Search, 
  Download, 
  UserCheck, 
  UserX, 
  Calendar, 
  Phone, 
  Mail, 
  MessageSquare, 
  ShoppingBag, 
  Heart, 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  Ban, 
  ArrowRight, 
  Loader2,
  ShieldAlert,
  ArrowUpDown
} from "lucide-react";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await API.get("/users");
      if (res.data.success) setUsers(res.data.users);
    } catch(err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openUser = async (user) => {
    setSelectedUser(user);
    setUserStats(null);
    setStatsLoading(true);
    try {
      const res = await API.get(`/users/${user.id}/stats`);
      if (res.data.success) setUserStats(res.data.stats);
    } catch(err) { console.error(err); }
    setStatsLoading(false);
  };

  const handleBlock = async (user, status) => {
    try {
      await API.put(`/users/${user.id}/block`, { status });
      setMsg(`User ${status === "suspended" ? "suspended" : "activated"} successfully!`);
      fetchUsers();
      if (selectedUser?.id === user.id) setSelectedUser(prev => ({ ...prev, status }));
      setTimeout(() => setMsg(""), 3000);
    } catch(err) { console.error(err); }
  };

  const exportCSV = () => {
    const rows = [["ID","Name","Email","Phone","Role","Status","Joined"]];
    filtered.forEach(u => rows.push([
      u.id, 
      u.full_name||"", 
      u.email||"", 
      u.phone||"", 
      u.role||"", 
      u.status||"", 
      new Date(u.created_at).toLocaleDateString("en-LK")
    ]));
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `customers-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const filtered = useMemo(() => {
    return users.filter(u => {
      const matchSearch = !search ||
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.phone?.includes(search);
      const matchStatus = statusFilter === "all" || u.status === statusFilter;
      return matchSearch && matchStatus;
    }).sort((a, b) => {
      if (sortBy === "name") return (a.full_name||"").localeCompare(b.full_name||"");
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [users, search, statusFilter, sortBy]);

  const activeCount = users.filter(u => u.status === "active").length;
  const suspendedCount = users.filter(u => u.status === "suspended").length;
  const thisMonth = users.filter(u => {
    const d = new Date(u.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <Layout>
      <div className="p-6 bg-slate-50 min-h-screen">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <UsersIcon className="w-7 h-7 text-indigo-600" /> Customers Directory
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">Manage customer profiles, order history, lifetime spend, and moderation</p>
          </div>
          <button 
            onClick={exportCSV} 
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition shadow-sm"
          >
            <Download className="w-4 h-4 text-slate-500" /> Export CSV
          </button>
        </div>

        {/* Feedback Alert Message */}
        {msg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl mb-6 text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {msg}
          </div>
        )}

        {/* KPI Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Customers</p>
              <p className="text-2xl font-extrabold text-slate-800 mt-1">{users.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <UsersIcon className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">{activeCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Suspended</p>
              <p className="text-2xl font-extrabold text-rose-600 mt-1">{suspendedCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <UserX className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">New This Month</p>
              <p className="text-2xl font-extrabold text-blue-600 mt-1">{thisMonth}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter & Search Controls */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex flex-wrap gap-3 items-center justify-between shadow-sm">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by customer name, email, phone..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-medium" 
            />
          </div>

          <div className="flex gap-3">
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-medium text-slate-700 outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended Only</option>
            </select>

            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-medium text-slate-700 outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Customers Table */}
        {loading ? (
          <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-400 font-medium">Loading customers directory...</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center text-xs font-semibold text-slate-500">
              <span>Showing {filtered.length} of {users.length} registered customers</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4 pl-6">Customer</th>
                    <th className="p-4">Contact Details</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Joined Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filtered.map(u => (
                    <tr 
                      key={u.id} 
                      onClick={() => openUser(u)}
                      className="hover:bg-slate-50 transition cursor-pointer group"
                    >
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm ${
                            u.status === "suspended" ? "bg-rose-500" : "bg-indigo-600"
                          }`}>
                            {u.full_name?.charAt(0)?.toUpperCase() || "U"}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-2">
                              {u.full_name}
                            </div>
                            <div className="text-xs text-slate-400 font-medium">ID: #{u.id}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {u.email}
                          </div>
                          {u.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {u.phone}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          u.role === "seller" 
                            ? "bg-blue-50 text-blue-700 border border-blue-200" 
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}>
                          {u.role || "buyer"}
                        </span>
                      </td>

                      <td className="p-4 text-xs font-mono text-slate-500">
                        {new Date(u.created_at).toLocaleDateString("en-LK", {
                          year: "numeric", month: "short", day: "numeric"
                        })}
                      </td>

                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          u.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}>
                          {u.status === "active" ? <CheckCircle2 className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                          {u.status || "active"}
                        </span>
                      </td>

                      <td className="p-4 pr-6 text-right">
                        <span className="text-xs font-semibold text-indigo-600 group-hover:text-indigo-700 inline-flex items-center gap-1">
                          View Profile <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-12 text-center text-slate-400 font-medium">
                        No customers found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CUSTOMER DETAIL MODAL */}
        {selectedUser && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                <div className="flex items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm ${
                    selectedUser.status === "suspended" ? "bg-rose-500" : "bg-indigo-600"
                  }`}>
                    {selectedUser.full_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{selectedUser.full_name}</h3>
                    <p className="text-xs text-slate-500 font-medium">{selectedUser.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setSelectedUser(null); setUserStats(null); }} 
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Modal Scrollable Body */}
              <div className="overflow-y-auto flex-1 p-6 space-y-5">
                
                {/* Contact Attributes */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Phone Number</p>
                    <p className="text-sm font-semibold text-slate-800 font-mono">{selectedUser.phone || "Not provided"}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Account Role</p>
                    <p className="text-sm font-semibold text-slate-800 capitalize">{selectedUser.role || "buyer"}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Account Status</p>
                    <span className={`inline-flex items-center gap-1 text-xs font-bold uppercase ${
                      selectedUser.status === "active" ? "text-emerald-600" : "text-rose-600"
                    }`}>
                      {selectedUser.status === "active" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                      {selectedUser.status || "active"}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Registration Date</p>
                    <p className="text-sm font-semibold text-slate-800 font-mono">{new Date(selectedUser.created_at).toLocaleDateString("en-LK")}</p>
                  </div>
                </div>

                {/* Lifetime Order Stats */}
                {statsLoading ? (
                  <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-medium">Fetching customer purchasing telemetry...</p>
                  </div>
                ) : userStats ? (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3.5 text-center">
                        <ShoppingBag className="w-4 h-4 text-indigo-600 mx-auto mb-1" />
                        <p className="text-lg font-extrabold text-indigo-900">{userStats.total_orders || 0}</p>
                        <p className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">Orders</p>
                      </div>

                      <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3.5 text-center">
                        <DollarSign className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                        <p className="text-base font-extrabold text-emerald-900">
                          LKR {parseFloat(userStats.total_spent || 0).toLocaleString()}
                        </p>
                        <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Total Spent</p>
                      </div>

                      <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-3.5 text-center">
                        <Heart className="w-4 h-4 text-rose-600 mx-auto mb-1" />
                        <p className="text-lg font-extrabold text-rose-900">{userStats.wishlist_count || 0}</p>
                        <p className="text-[10px] uppercase font-bold text-rose-600 tracking-wider">Wishlist</p>
                      </div>
                    </div>

                    {/* Recent Orders List */}
                    {userStats.recent_orders?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">Recent Orders</p>
                        <div className="space-y-2">
                          {userStats.recent_orders.map(o => (
                            <div key={o.id} className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                              <div>
                                <p className="text-xs font-bold text-slate-800 font-mono">{o.order_number}</p>
                                <p className="text-[11px] text-slate-400 font-medium mt-0.5">{new Date(o.created_at).toLocaleDateString("en-LK")}</p>
                              </div>
                              <div className="text-right">
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                  {
                                    pending: "bg-amber-50 text-amber-700 border border-amber-200",
                                    confirmed: "bg-blue-50 text-blue-700 border border-blue-200",
                                    processing: "bg-purple-50 text-purple-700 border border-purple-200",
                                    shipped: "bg-indigo-50 text-indigo-700 border border-indigo-200",
                                    delivered: "bg-emerald-50 text-emerald-700 border border-emerald-200",
                                    cancelled: "bg-rose-50 text-rose-700 border border-rose-200"
                                  }[o.status] || "bg-slate-100 text-slate-600 border border-slate-200"
                                }`}>
                                  {o.status}
                                </span>
                                <p className="text-xs font-bold text-slate-800 mt-1">LKR {parseFloat(o.total_amount).toLocaleString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </div>

              {/* Action Buttons Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-2.5 flex-shrink-0">
                {selectedUser.phone && (
                  <a 
                    href={`https://wa.me/94${selectedUser.phone?.replace(/^0/,"")?.replace(/\D/,"")}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs transition shadow-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                )}
                
                {selectedUser.status === "active" ? (
                  <button 
                    onClick={() => handleBlock(selectedUser, "suspended")}
                    className="flex-1 flex items-center justify-center gap-2 border border-rose-200 text-rose-600 hover:bg-rose-50 bg-white py-2.5 rounded-xl font-bold text-xs transition"
                  >
                    <Ban className="w-3.5 h-3.5" /> Suspend
                  </button>
                ) : (
                  <button 
                    onClick={() => handleBlock(selectedUser, "active")}
                    className="flex-1 flex items-center justify-center gap-2 border border-emerald-200 text-emerald-600 hover:bg-emerald-50 bg-white py-2.5 rounded-xl font-bold text-xs transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Activate
                  </button>
                )}

                <button 
                  onClick={() => { setSelectedUser(null); setUserStats(null); }} 
                  className="px-5 border border-slate-200 text-slate-600 hover:bg-slate-100 bg-white py-2.5 rounded-xl font-bold text-xs transition"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
