import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import API from "../api/config";
import { 
  Receipt, 
  Building, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  DollarSign, 
  FileText,
  Briefcase
} from "lucide-react";

export default function Expenses() {
  const [activeTab, setActiveTab] = useState("expenses");
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [capital, setCapital] = useState({ accounts: [], transactions: [] });
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCapitalModal, setShowCapitalModal] = useState(false);

  // Form states
  const [expForm, setExpForm] = useState({
    category_id: "", amount: "", expense_date: new Date().toISOString().split("T")[0], description: ""
  });
  const [capForm, setCapForm] = useState({
    account_id: "", type: "injection", amount: "", transaction_date: new Date().toISOString().split("T")[0], notes: ""
  });

  const fetchExpenses = async () => {
    try {
      const res = await API.get("/erp/expenses");
      if (res.data.success) {
        setCategories(res.data.categories);
        setExpenses(res.data.expenses);
      }
    } catch (err) { console.error(err); }
  };

  const fetchCapital = async () => {
    try {
      const res = await API.get("/erp/capital");
      if (res.data.success) {
        setCapital({ accounts: res.data.accounts, transactions: res.data.transactions });
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchExpenses();
    fetchCapital();
  }, []);

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post("/erp/expenses", expForm);
      setShowExpenseModal(false);
      setExpForm({ category_id: "", amount: "", expense_date: new Date().toISOString().split("T")[0], description: "" });
      fetchExpenses();
    } catch (err) { alert("Failed to log expense"); }
  };

  const handleCapitalSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post("/erp/capital/transaction", capForm);
      setShowCapitalModal(false);
      setCapForm({ account_id: "", type: "injection", amount: "", transaction_date: new Date().toISOString().split("T")[0], notes: "" });
      fetchCapital();
    } catch (err) { alert("Failed to record capital transaction"); }
  };

  const totalExpenseSum = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  return (
    <Layout>
      <div className="p-6 bg-slate-50 min-h-screen">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Receipt className="w-7 h-7 text-indigo-600" /> Expenses &amp; Capital
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">Track fuel, IT expenses, warehouse maintenance, and capital flow</p>
          </div>
          <div>
            {activeTab === 'expenses' ? (
              <button 
                onClick={() => setShowExpenseModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition shadow-sm"
              >
                <Plus className="w-4 h-4" /> Log Expense
              </button>
            ) : (
              <button 
                onClick={() => setShowCapitalModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition shadow-sm"
              >
                <Plus className="w-4 h-4" /> Record Capital Entry
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 mb-6 gap-6 pt-2">
          <button
            onClick={() => setActiveTab("expenses")}
            className={`pb-3 text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === "expenses" 
                ? "border-b-2 border-indigo-600 text-indigo-600" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Briefcase className="w-4 h-4" /> Operational Expenses
          </button>
          <button
            onClick={() => setActiveTab("capital")}
            className={`pb-3 text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === "capital" 
                ? "border-b-2 border-indigo-600 text-indigo-600" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Building className="w-4 h-4" /> Capital Ledger (LKR 1M Baseline)
          </button>
        </div>

        {activeTab === "expenses" ? (
          <>
            {/* Total Expense Summary Bar */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 mb-6 flex justify-between items-center shadow-sm">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Logged Expenses</p>
                <p className="text-2xl font-bold text-rose-600 mt-1">LKR {totalExpenseSum.toLocaleString()}</p>
              </div>
              <div className="text-right text-xs text-slate-400 max-w-sm">
                Active tracking for fuel, ads, IT assets, and warehouse upkeep.
              </div>
            </div>

            {/* Expenses Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4">Date</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Description / Purpose</th>
                    <th className="p-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {expenses.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50 transition">
                      <td className="p-4 text-slate-500 font-medium font-mono text-xs">{e.expense_date}</td>
                      <td className="p-4">
                        <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs font-bold">
                          {e.category_name}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 font-medium">{e.description || "-"}</td>
                      <td className="p-4 font-bold text-rose-600 text-right">LKR {parseFloat(e.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-slate-400">No operational expenses logged yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            {/* Capital Accounts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {capital.accounts.map(acc => (
                <div key={acc.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-slate-800 text-base">{acc.name}</h3>
                    <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      {acc.type}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Contributed</p>
                      <p className="text-lg font-bold text-slate-800">LKR {parseFloat(acc.total_contributed).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Withdrawn</p>
                      <p className="text-lg font-bold text-slate-500">LKR {parseFloat(acc.total_withdrawn).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Capital Ledger Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                <h2 className="font-bold text-slate-800 text-sm">Capital Movement Ledger</h2>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4">Date</th>
                    <th className="p-4">Account</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {capital.transactions.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 transition">
                      <td className="p-4 text-xs font-mono text-slate-500">{t.transaction_date}</td>
                      <td className="p-4 font-semibold text-slate-700">{t.account_name}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          t.type === 'injection' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {t.type === 'injection' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {t.type}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-indigo-600">LKR {parseFloat(t.amount).toLocaleString()}</td>
                      <td className="p-4 text-xs text-slate-500 font-medium">{t.notes || "-"}</td>
                    </tr>
                  ))}
                  {capital.transactions.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-400">No capital transactions recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* LOG EXPENSE MODAL */}
        {showExpenseModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-indigo-600" /> Log Operational Expense
                </h2>
                <button type="button" onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
              </div>
              <form onSubmit={handleExpenseSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Category *</label>
                  <select 
                    required 
                    value={expForm.category_id} 
                    onChange={e => setExpForm({...expForm, category_id: e.target.value})} 
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Amount (LKR) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">LKR</span>
                    <input 
                      required 
                      type="number" 
                      step="0.01" 
                      placeholder="e.g. 3500" 
                      value={expForm.amount} 
                      onChange={e => setExpForm({...expForm, amount: e.target.value})} 
                      className="w-full pl-12 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Expense Date *</label>
                  <input 
                    required 
                    type="date" 
                    value={expForm.expense_date} 
                    onChange={e => setExpForm({...expForm, expense_date: e.target.value})} 
                    className="w-full border border-slate-200 p-2 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Description / Purpose</label>
                  <textarea 
                    placeholder="e.g. Fuel for wholesale pickup at Pettah" 
                    value={expForm.description} 
                    onChange={e => setExpForm({...expForm, description: e.target.value})} 
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none" 
                    rows="3"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowExpenseModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-500 font-semibold text-xs hover:bg-slate-50 transition">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700 transition shadow-md">
                    Save Expense
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* LOG CAPITAL MODAL */}
        {showCapitalModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Building className="w-5 h-5 text-indigo-600" /> Record Capital Entry
                </h2>
                <button type="button" onClick={() => setShowCapitalModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
              </div>
              <form onSubmit={handleCapitalSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Capital Account *</label>
                  <select 
                    required 
                    value={capForm.account_id} 
                    onChange={e => setCapForm({...capForm, account_id: e.target.value})} 
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">-- Select Account --</option>
                    {capital.accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Transaction Type</label>
                  <select 
                    value={capForm.type} 
                    onChange={e => setCapForm({...capForm, type: e.target.value})} 
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="injection">📥 Capital Injection (Deposit)</option>
                    <option value="withdrawal">📤 Capital Withdrawal (Owner Draw)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Amount (LKR) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">LKR</span>
                    <input 
                      required 
                      type="number" 
                      step="0.01" 
                      placeholder="e.g. 50000" 
                      value={capForm.amount} 
                      onChange={e => setCapForm({...capForm, amount: e.target.value})} 
                      className="w-full pl-12 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Transaction Date *</label>
                  <input 
                    required 
                    type="date" 
                    value={capForm.transaction_date} 
                    onChange={e => setCapForm({...capForm, transaction_date: e.target.value})} 
                    className="w-full border border-slate-200 p-2 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Notes / Memo</label>
                  <textarea 
                    placeholder="e.g. Investor Q3 capital top-up" 
                    value={capForm.notes} 
                    onChange={e => setCapForm({...capForm, notes: e.target.value})} 
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none" 
                    rows="3"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowCapitalModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-500 font-semibold text-xs hover:bg-slate-50 transition">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700 transition shadow-md">
                    Record Entry
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
