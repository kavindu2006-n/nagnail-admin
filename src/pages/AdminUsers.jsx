import { useEffect, useState } from "react";
import API from "../api/config";
import Layout from "../components/Layout";
import useAuthStore from "../store/authStore";

const ROLE_BADGES = {
  superadmin: { label: "Super Admin", bg: "bg-purple-100", text: "text-purple-700" },
  manager:    { label: "Manager",     bg: "bg-blue-100",   text: "text-blue-700" },
  staff:      { label: "Staff",       bg: "bg-gray-100",   text: "text-gray-600" },
};

const ROLE_DESC = {
  superadmin: "Full access including admin user management",
  manager: "Orders, products, customers, payouts — no admin management",
  staff: "Orders and products only",
};

export default function AdminUsers() {
  const { admin } = useAuthStore();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "staff" });
  const [saving, setSaving] = useState(false);

  const canManage = admin?.role === "superadmin";

  useEffect(() => { fetchAdmins(); }, []);

  const fetchAdmins = async () => {
    try {
      const res = await API.get("/admin-users");
      if (res.data.success) setAdmins(res.data.admins);
    } catch (e) {
      setErr(e.response?.data?.error || "Failed to load admins");
    } finally {
      setLoading(false);
    }
  };

  const flash = (setter, text) => { setter(text); setTimeout(() => setter(""), 3500); };

  const openCreate = () => {
    setEditing(null);
    setForm({ full_name: "", email: "", password: "", role: "staff" });
    setShowForm(true);
  };

  const openEdit = (a) => {
    setEditing(a);
    setForm({ full_name: a.full_name, email: a.email, password: "", role: a.role });
    setShowForm(true);
  };

  const handleSave = async () => {
    setErr("");
    if (!form.full_name || !form.email || (!editing && !form.password)) {
      flash(setErr, "Please fill all required fields");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const payload = { full_name: form.full_name, role: form.role };
        if (form.password) payload.password = form.password;
        await API.put(`/admin-users/${editing.id}`, payload);
        flash(setMsg, "Admin updated");
      } else {
        await API.post("/admin-users", form);
        flash(setMsg, "Admin created");
      }
      setShowForm(false);
      fetchAdmins();
    } catch (e) {
      flash(setErr, e.response?.data?.error || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (a) => {
    try {
      await API.put(`/admin-users/${a.id}`, { status: a.status === "active" ? "suspended" : "active" });
      flash(setMsg, `Admin ${a.status === "active" ? "suspended" : "activated"}`);
      fetchAdmins();
    } catch (e) {
      flash(setErr, e.response?.data?.error || "Failed");
    }
  };

  const handleDelete = async (a) => {
    if (!confirm(`Delete admin "${a.full_name}"? This cannot be undone.`)) return;
    try {
      await API.delete(`/admin-users/${a.id}`);
      flash(setMsg, "Admin deleted");
      fetchAdmins();
    } catch (e) {
      flash(setErr, e.response?.data?.error || "Delete failed");
    }
  };

  if (!canManage) {
    return (
      <Layout>
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
          <p className="text-5xl mb-3">🔒</p>
          <h2 className="text-xl font-black text-gray-800 mb-2">Access Restricted</h2>
          <p className="text-gray-500 text-sm">Only Super Admins can manage admin users.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-800">Admin Users</h2>
          <p className="text-gray-500 text-sm mt-1">Manage admin accounts and their roles</p>
        </div>
        <button onClick={openCreate}
          className="bg-[#16a34a] text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-[#15803d] transition-all">
          + Add Admin
        </button>
      </div>

      {msg && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-xl text-sm font-semibold">✅ {msg}</div>}
      {err && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-sm font-semibold">⚠️ {err}</div>}

      {/* Role legend */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {Object.entries(ROLE_DESC).map(([role, desc]) => {
          const b = ROLE_BADGES[role];
          return (
            <div key={role} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
              <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${b.bg} ${b.text} mb-1`}>{b.label}</span>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
          );
        })}
      </div>

      {/* Admin list */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Loading…</div>
        ) : admins.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No admin users yet</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {admins.map((a) => {
              const b = ROLE_BADGES[a.role] || ROLE_BADGES.staff;
              return (
                <div key={a.id} className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0 ${a.status === "suspended" ? "bg-gray-400" : "bg-[#16a34a]"}`}>
                    {a.full_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-gray-800 truncate">{a.full_name}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${b.bg} ${b.text}`}>{b.label}</span>
                      {a.status === "suspended" && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Suspended</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{a.email}</p>
                    <p className="text-xs text-gray-400">
                      {a.last_login ? `Last login ${new Date(a.last_login).toLocaleDateString("en-LK")}` : "Never logged in"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => openEdit(a)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-[#16a34a] hover:text-[#16a34a] transition-all">
                      Edit
                    </button>
                    <button onClick={() => toggleStatus(a)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${a.status === "active" ? "border-amber-200 text-amber-600 hover:bg-amber-50" : "border-green-200 text-green-600 hover:bg-green-50"}`}>
                      {a.status === "active" ? "Suspend" : "Activate"}
                    </button>
                    <button onClick={() => handleDelete(a)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all">
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-gray-800">{editing ? "Edit Admin" : "Add Admin"}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Full Name *</label>
                <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#16a34a]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Email *</label>
                <input type="email" value={form.email} disabled={!!editing}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#16a34a] disabled:bg-gray-50 disabled:text-gray-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  Password {editing ? "(leave blank to keep current)" : "*"}
                </label>
                <input type="password" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={editing ? "••••••••" : "Min 6 characters"}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#16a34a]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Role *</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#16a34a] bg-white">
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  <option value="superadmin">Super Admin</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">{ROLE_DESC[form.role]}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-[#16a34a] text-white font-bold text-sm hover:bg-[#15803d] disabled:opacity-50">
                {saving ? "Saving…" : editing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
