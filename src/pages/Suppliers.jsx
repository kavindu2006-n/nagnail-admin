import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import API from "../api/config";
import { 
  Building2, 
  Plus, 
  Search, 
  Phone, 
  MessageSquare, 
  MapPin, 
  User, 
  CheckCircle2 
} from "lucide-react";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ 
    name: "", 
    contact_person: "", 
    phone: "", 
    whatsapp: "", 
    address: "" 
  });

  const fetchSuppliers = async () => {
    try {
      const res = await API.get("/erp/suppliers");
      if (res.data.success) setSuppliers(res.data.suppliers);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post("/erp/suppliers", form);
      setShowModal(false);
      setForm({ name: "", contact_person: "", phone: "", whatsapp: "", address: "" });
      fetchSuppliers();
    } catch (err) { alert("Failed to add supplier"); }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.contact_person?.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.includes(search)
  );

  return (
    <Layout>
      <div className="p-6 bg-slate-50 min-h-screen">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="w-7 h-7 text-indigo-600" /> Suppliers Directory
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">Manage wholesale vendors, import contacts, and procurement partners</p>
          </div>
          <button 
            onClick={() => setShowModal(true)} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Supplier
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex justify-between items-center shadow-sm">
          <div className="relative w-96">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by vendor name, person, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-medium"
            />
          </div>
          <div className="text-sm text-slate-500 font-medium">
            Active Vendors: <span className="font-bold text-slate-800">{filteredSuppliers.length}</span>
          </div>
        </div>

        {/* Suppliers Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <th className="p-4">Supplier Name</th>
                <th className="p-4">Contact Person</th>
                <th className="p-4">Phone &amp; WhatsApp</th>
                <th className="p-4">Location / Address</th>
                <th className="p-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredSuppliers.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition">
                  <td className="p-4 font-bold text-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                        {s.name?.charAt(0) || "S"}
                      </div>
                      <span>{s.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {s.contact_person || <span className="text-slate-300 font-normal italic">Unassigned</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      {s.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {s.phone}
                        </div>
                      )}
                      {s.whatsapp && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-mono font-medium">
                          <MessageSquare className="w-3 h-3" />
                          WA: {s.whatsapp}
                        </div>
                      )}
                      {!s.phone && !s.whatsapp && <span className="text-xs text-slate-300">-</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium max-w-xs truncate" title={s.address}>
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {s.address || <span className="text-slate-300 font-normal italic">No address listed</span>}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      {s.status || "ACTIVE"}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400 font-medium">No suppliers match your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ADD SUPPLIER MODAL */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" /> Add New Supplier
                </h2>
                <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Supplier / Vendor Name *</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="e.g. Pettah Wholesale Depot" 
                    value={form.name} 
                    onChange={e => setForm({...form, name: e.target.value})} 
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none font-medium" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Contact Person</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Mr. Samantha Perera" 
                    value={form.contact_person} 
                    onChange={e => setForm({...form, contact_person: e.target.value})} 
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Phone Number</label>
                    <input 
                      type="text" 
                      placeholder="077xxxxxxx" 
                      value={form.phone} 
                      onChange={e => setForm({...form, phone: e.target.value})} 
                      className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">WhatsApp</label>
                    <input 
                      type="text" 
                      placeholder="077xxxxxxx" 
                      value={form.whatsapp} 
                      onChange={e => setForm({...form, whatsapp: e.target.value})} 
                      className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Physical Address / Warehouse Location</label>
                  <textarea 
                    placeholder="Street, City, Store No..." 
                    value={form.address} 
                    onChange={e => setForm({...form, address: e.target.value})} 
                    rows="3"
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-500 font-semibold text-xs hover:bg-slate-50 transition">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700 transition shadow-md">
                    Save Supplier
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
