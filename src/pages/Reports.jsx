import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import FinancialOrderVerifyV5 from "./FinancialOrderVerifyV5";
import FinancialOwnershipV5 from "./FinancialOwnershipV5";
import FinancialSourceManagerV5 from "./FinancialSourceManagerV5";
import FinancialSourceV5 from "./FinancialSourceV5";
import API from "../api/config";
import { 
  PieChart, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  FileText, 
  Building2, 
  ShieldCheck, 
  Layers, 
  Loader2,
  Calendar,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

export default function Reports() {
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("pl");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const [rRes, lRes] = await Promise.all([
          API.get("/erp/reports/financial").catch(() => ({ data: { success: false } })),
          API.get("/erp/audit-logs").catch(() => ({ data: { success: false } }))
        ]);
        if (rRes.data && rRes.data.success) setData(rRes.data.report);
        if (lRes.data && lRes.data.success) setLogs(lRes.data.logs || []);
      } catch (err) { 
        console.error(err); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchReports();
  }, []);

  const exportCSV = (filename, headers, rows) => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPL = () => {
    if (!data || !data.pl) return;
    const headers = ["Metric", "Amount (LKR)"];
    const rows = [
      ["Total Revenue (All Channels)", data.pl.total_revenue],
      ["Cost of Goods Sold (COGS)", data.pl.cogs],
      ["Gross Profit", data.pl.gross_profit],
      ["Operational & Fuel Expenses", data.pl.expenses],
      ["Estimated Net Profit", data.pl.net_profit],
      ["Unverified FIFO Inventory Value", data.pl.inventory_value]
    ];
    exportCSV("Profit_Loss_Statement", headers, rows);
  };

  const handleExportProductProfit = () => {
    if (!data || !data.product_profitability) return;
    const headers = ["Product ID", "Name", "Selling Price", "Landed Cost", "Est Unit Profit", "Margin %", "Units Sold", "Stock Qty"];
    const rows = data.product_profitability.map(p => [
      p.id, `"${(p.name || '').replace(/"/g, '""')}"`, p.price, p.landed_cost, p.unit_profit, `${p.margin_percent}%`, p.sold_count, p.stock_qty
    ]);
    exportCSV("Product_Profitability_Report", headers, rows);
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-20 text-center text-slate-400 font-medium">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
          <p className="text-sm">Consolidating financial reports &amp; telemetry...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 bg-slate-50 min-h-screen">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <PieChart className="w-7 h-7 text-indigo-600" /> Financial Reports &amp; Audit Trail
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">Consolidated P&amp;L statements, product unit margins, supplier ledger, and system activity</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 mb-6 gap-6 pt-2 overflow-x-auto scrollbar-none">
          <button 
            onClick={() => setActiveTab("pl")} 
            className={`pb-3 text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === "pl" 
                ? "border-b-2 border-indigo-600 text-indigo-600" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <DollarSign className="w-4 h-4" /> Profit &amp; Loss Statement
          </button>

          <button 
            onClick={() => setActiveTab("products")} 
            className={`pb-3 text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === "products" 
                ? "border-b-2 border-indigo-600 text-indigo-600" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Layers className="w-4 h-4" /> Product Profitability
          </button>

          <button 
            onClick={() => setActiveTab("suppliers")} 
            className={`pb-3 text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === "suppliers" 
                ? "border-b-2 border-indigo-600 text-indigo-600" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Building2 className="w-4 h-4" /> Supplier Payables Ledger
          </button>

          
          
          
          
          {/* NN-FINANCIAL-V5-ORDER-VERIFY-UI */}
          <button
            onClick={() => setActiveTab("order-verify-v5")}
            className={`pb-3 text-sm font-bold whitespace-nowrap ${
              activeTab === "order-verify-v5"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Verify Order Fulfillment
          </button>

{/* NN-FINANCIAL-V5-OWNERSHIP-UI */}
          <button
            onClick={() => setActiveTab("ownership-v5")}
            className={`pb-3 text-sm font-bold whitespace-nowrap ${
              activeTab === "ownership-v5"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Own vs External Sales
          </button>

{/* NN-FINANCIAL-V5-MANAGER-UI */}
          <button
            onClick={() => setActiveTab("source-manager")}
            className={`pb-3 text-sm font-bold whitespace-nowrap ${
              activeTab === "source-manager"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Manage Product Sources
          </button>

{/* NN-FINANCIAL-V5-UI */}
          <button
            onClick={() => setActiveTab("sources")}
            className={`pb-3 text-sm font-bold whitespace-nowrap ${
              activeTab === "sources"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Inventory Source Sales V5
          </button>

<button 
            onClick={() => setActiveTab("audit")} 
            className={`pb-3 text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === "audit" 
                ? "border-b-2 border-indigo-600 text-indigo-600" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> System Audit Trail
          </button>
        </div>

        {activeTab === "sources" && <FinancialSourceV5 />}

        {activeTab === "source-manager" && <FinancialSourceManagerV5 />}

        {activeTab === "ownership-v5" && <FinancialOwnershipV5 />}

        {activeTab === "order-verify-v5" && <FinancialOrderVerifyV5 />}

        {/* TAB 1: PROFIT & LOSS */}
        {activeTab === "pl" && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-3xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-5">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" /> Estimated Profit &amp; Loss (Unverified COGS)
              </h2>
              <button 
                onClick={handleExportPL} 
                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs px-3.5 py-2 rounded-lg font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" /> Export CSV
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                <span className="text-slate-600 font-medium">Total Sales Revenue (Storefront + Dropship)</span>
                <span className="font-extrabold text-slate-900 font-mono text-base">
                  LKR {(data?.pl?.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                <span className="text-slate-600 font-medium">Cost of Goods Sold (COGS Landed Cost)</span>
                <span className="font-extrabold text-rose-600 font-mono">
                  - LKR {(data?.pl?.cogs || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-emerald-200 font-bold bg-emerald-50/60 px-4 rounded-xl text-emerald-900">
                <span>Gross Margin Profit</span>
                <span className="font-mono text-base">
                  LKR {(data?.pl?.gross_profit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                <span className="text-slate-600 font-medium">Operating Expenses (Fuel, Ads, IT, Repairs)</span>
                <span className="font-extrabold text-rose-600 font-mono">
                  - LKR {(data?.pl?.expenses || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-center py-4 border-t-2 border-slate-900 mt-4">
                <span className="font-extrabold text-slate-900 text-base">Estimated Net Profit</span>
                <span className={`font-black text-xl font-mono ${(data?.pl?.net_profit || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  LKR {(data?.pl?.net_profit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCT PROFITABILITY */}
        {activeTab === "products" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <h2 className="font-bold text-slate-800 text-sm">
                Product Profitability Breakdown ({data?.product_profitability?.length || 0} catalog items)
              </h2>
              <button 
                onClick={handleExportProductProfit} 
                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" /> Export CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4">Product Name</th>
                    <th className="p-4">Selling Price</th>
                    <th className="p-4">Landed Cost</th>
                    <th className="p-4">Est. Unit Profit</th>
                    <th className="p-4">Margin %</th>
                    <th className="p-4 pr-6 text-right">Units Sold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {data?.product_profitability?.map(p => {
                    const margin = parseFloat(p.margin_percent || 0);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition">
                        <td className="p-4 font-bold text-slate-800">{p.name}</td>
                        <td className="p-4 font-semibold text-slate-700 font-mono">
                          LKR {parseFloat(p.price || 0).toLocaleString()}
                        </td>
                        <td className="p-4 text-rose-600 font-mono font-medium">
                          LKR {(p.landed_cost || 0).toLocaleString()}
                        </td>
                        <td className="p-4 font-extrabold text-emerald-600 font-mono">
                          LKR {(p.unit_profit || 0).toLocaleString()}
                        </td>
                        <td className="p-4 font-bold">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs ${
                            margin < 15 
                              ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {margin}%
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right font-bold text-slate-800 font-mono">
                          {p.sold_count}
                        </td>
                      </tr>
                    );
                  })}
                  {(!data?.product_profitability || data.product_profitability.length === 0) && (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-400 font-medium">
                        No product profitability records available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: SUPPLIER LEDGER */}
        {activeTab === "suppliers" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50">
              <h2 className="font-bold text-slate-800 text-sm">Supplier Payables Ledger</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4 pl-6">Supplier Name</th>
                    <th className="p-4">Total Purchases</th>
                    <th className="p-4">Total Paid</th>
                    <th className="p-4 pr-6 text-right">Pending Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {data?.supplier_ledger?.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="p-4 pl-6 font-bold text-slate-800">
                        {s.name}
                        {s.phone && <div className="text-xs text-slate-400 font-normal font-mono mt-0.5">{s.phone}</div>}
                      </td>
                      <td className="p-4 font-semibold text-slate-700 font-mono">
                        LKR {parseFloat(s.total_purchased || 0).toLocaleString()}
                      </td>
                      <td className="p-4 text-emerald-600 font-bold font-mono">
                        LKR {parseFloat(s.total_paid || 0).toLocaleString()}
                      </td>
                      <td className="p-4 pr-6 font-extrabold text-rose-600 font-mono text-right">
                        LKR {parseFloat(s.pending_balance || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {(!data?.supplier_ledger || data.supplier_ledger.length === 0) && (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-slate-400 font-medium">
                        No supplier ledger transactions recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT TRAIL */}
        {activeTab === "audit" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50">
              <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" /> System Activity Audit Log
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4 pl-6">Date &amp; Time</th>
                    <th className="p-4">User</th>
                    <th className="p-4">Action</th>
                    <th className="p-4 pr-6">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {logs.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50 transition">
                      <td className="p-4 pl-6 text-slate-400 font-mono">
                        {new Date(l.date_time).toLocaleString('en-LK', {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="p-4 font-bold text-slate-800">{l.user || 'Admin'}</td>
                      <td className="p-4 font-bold text-indigo-600 uppercase tracking-wide">{l.action}</td>
                      <td className="p-4 pr-6 text-slate-600">{l.details}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-slate-400 font-medium">
                        No system audit logs recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
