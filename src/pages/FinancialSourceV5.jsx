
import { useEffect, useMemo, useState } from "react";
import API from "../api/config";
import { Download, RefreshCw, AlertTriangle } from "lucide-react";

const n = value => Number(value) || 0;
const money = value => "LKR " + n(value).toLocaleString("en-LK", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const sourceNames = {
  flag_1: "Official Flag 1 — Source Unverified",
  flag_0: "Official Flag 0 — Source Unverified",
  unknown: "Unknown / Deleted Product"
};

const channelNames = {
  website_manual: "Website / Manual",
  dropnail_reseller: "DropNail Reseller"
};

export default function FinancialSourceV5() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [source, setSource] = useState("all");
  const [channel, setChannel] = useState("all");
  const [status, setStatus] = useState("delivered");
  const [search, setSearch] = useState("");

  const load = async (f = from, t = to) => {
    if (f && t && f > t) {
      setError("Start date must be before end date");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await API.get("/erp/reports/source-sales-v5", {
        params: {
          ...(f ? { from: f } : {}),
          ...(t ? { to: t } : {})
        }
      });

      if (!res.data?.success) throw new Error("Report unavailable");
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load("", "");
  }, []);

  const rows = useMemo(() => {
    return (data?.items || []).filter(r => {
      if (source !== "all" && r.provisional_source !== source) return false;
      if (channel !== "all" && r.channel !== channel) return false;
      if (status !== "all" && r.status !== status) return false;
      const term = search.trim().toLowerCase();
      return !term || (
        `${r.product_name} ${r.product_id} ${r.order_id}`
          .toLowerCase().includes(term)
      );
    });
  }, [data, source, channel, status, search]);

  const totals = useMemo(() => ({
    orders: new Set(rows.map(r => `${r.channel}:${r.order_id}`)).size,
    units: rows.reduce((s, r) => s + n(r.units), 0),
    revenue: rows.reduce((s, r) => s + n(r.nagnail_revenue), 0),
    customerValue: rows.reduce((s, r) => s + n(r.customer_sale_value), 0)
  }), [rows]);

  const grouped = useMemo(() => {
    const map = new Map();

    rows.forEach(r => {
      const key = `${r.provisional_source}|${r.channel}|${r.status}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          source: r.provisional_source,
          channel: r.channel,
          status: r.status,
          units: 0,
          revenue: 0,
          orders: new Set()
        });
      }
      const g = map.get(key);
      g.units += n(r.units);
      g.revenue += n(r.nagnail_revenue);
      g.orders.add(`${r.channel}:${r.order_id}`);
    });

    return [...map.values()];
  }, [rows]);

  const exportCSV = () => {
    if (!rows.length) return;

    const safe = value => {
      let s = String(value ?? "");
      if (/^\s*[=+\-@\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    };

    const header = [
      "Channel", "Status", "Order ID", "Product ID",
      "Product", "Provisional Source", "Units",
      "NagNail Revenue LKR", "Customer Sale Value LKR", "Order Created At"
    ];

    const contents = [
      header,
      ...rows.map(r => [
        r.channel, r.status, r.order_id, r.product_id,
        r.product_name, r.provisional_source, r.units,
        r.nagnail_revenue, r.customer_sale_value, r.created_at
      ])
    ].map(line => line.map(safe).join(",")).join("\r\n");

    const blob = new Blob(["\ufeff", contents], {
      type: "text/csv;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "NagNail_Financial_Source_Sales_V5.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const field = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
  const card = "rounded-xl border border-slate-200 bg-white p-4";

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
        <h2 className="text-lg font-extrabold text-indigo-900">
          Inventory Source Sales — V5
        </h2>
        <p className="mt-1 text-sm text-indigo-800">
          Compare sales channels and provisional product source flags.
          This is a read-only financial reconciliation report.
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex gap-2">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <div>
          <strong>Source verification required.</strong>
          {" "}Official Flag 1 does not prove Own Warehouse stock;
          Flag 0 does not prove External Dropshipping.
          Shipped orders are not counted as delivered revenue by default.
          Historical product flags may have changed.
          Profit and supplier costs are not verified.
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold text-slate-600">
          From
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className={`block mt-1 ${field}`} />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          To
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className={`block mt-1 ${field}`} />
        </label>
        <button onClick={() => load()} disabled={loading}
          className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50">
          {loading ? "Loading..." : "Apply Dates"}
        </button>
        <button onClick={() => {
          setFrom(""); setTo(""); load("", "");
        }} className={`${field} font-semibold`}>
          All Dates
        </button>
        <button onClick={() => load()} disabled={loading}
          className={`${field} flex items-center gap-2 font-semibold`}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
        <button onClick={exportCSV} disabled={!rows.length}
          className={`${field} flex items-center gap-2 font-semibold`}>
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={source} onChange={e => setSource(e.target.value)}
          className={field}>
          <option value="all">All Source Flags</option>
          <option value="flag_1">Official Flag 1</option>
          <option value="flag_0">Official Flag 0</option>
          <option value="unknown">Unknown Products</option>
        </select>

        <select value={channel} onChange={e => setChannel(e.target.value)}
          className={field}>
          <option value="all">All Channels</option>
          <option value="website_manual">Website / Manual</option>
          <option value="dropnail_reseller">DropNail Resellers</option>
        </select>

        <select value={status} onChange={e => setStatus(e.target.value)}
          className={field}>
          <option value="delivered">Delivered Only</option>
          <option value="shipped">Shipped Only</option>
          <option value="all">All — Delivered + Shipped</option>
        </select>

        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search product / order ID"
          className={`${field} min-w-52 flex-1`} />
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 border border-rose-200 rounded-lg p-4">
          {error}
        </div>
      )}

      {loading && <p className="text-sm text-slate-500">Loading sales report...</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ["Distinct Orders", totals.orders],
              ["Units", totals.units],
              ["NagNail Revenue", money(totals.revenue)],
              ["Customer Sale Value", money(totals.customerValue)]
            ].map(([label, value]) => (
              <div className={card} key={label}>
                <p className="text-xs text-slate-500 font-bold">{label}</p>
                <p className="mt-2 font-extrabold text-lg text-slate-900 break-words">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500">
            Totals reflect selected filters. Mixed-source orders are counted
            once in the overall order total. Revenue excludes unallocated
            shipping, refunds and fees; it is not verified net profit.
            Date range uses order creation date.
          </p>

          <div className="bg-white border rounded-xl overflow-x-auto">
            <div className="p-4 font-bold text-slate-800 border-b">
              Source × Sales Channel Breakdown
            </div>
            <table className="w-full min-w-[850px] text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 text-xs">
                <tr>
                  {["Product Source Flag","Channel","Status","Orders in Group","Units","NagNail Revenue"]
                    .map(x => <th key={x} className="p-3">{x}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y">
                {grouped.map(g => (
                  <tr key={g.key}>
                    <td className="p-3">{sourceNames[g.source]}</td>
                    <td className="p-3">{channelNames[g.channel]}</td>
                    <td className="p-3 capitalize">{g.status}</td>
                    <td className="p-3">{g.orders.size}</td>
                    <td className="p-3">{g.units}</td>
                    <td className="p-3 font-semibold">{money(g.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white border rounded-xl overflow-x-auto">
            <div className="p-4 font-bold text-slate-800 border-b">
              Product-wise Sales ({rows.length} lines)
            </div>
            <table className="w-full min-w-[1000px] text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 text-xs">
                <tr>
                  {["Product","Order","Channel","Status","Source Flag",
                    "Units","NagNail Revenue","Customer Value"]
                    .map(x => <th key={x} className="p-3">{x}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r, i) => (
                  <tr key={`${r.channel}-${r.order_id}-${r.product_id}-${i}`}>
                    <td className="p-3 min-w-56">
                      <div className="font-semibold">{r.product_name}</div>
                      <div className="text-xs text-slate-400">
                        Product #{r.product_id}
                      </div>
                    </td>
                    <td className="p-3">#{r.order_id}</td>
                    <td className="p-3">{channelNames[r.channel]}</td>
                    <td className="p-3 capitalize">{r.status}</td>
                    <td className="p-3">{sourceNames[r.provisional_source]}</td>
                    <td className="p-3">{r.units}</td>
                    <td className="p-3 font-semibold">
                      {money(r.nagnail_revenue)}
                    </td>
                    <td className="p-3">{money(r.customer_sale_value)}</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan={8} className="p-8 text-center text-slate-500">
                    No matching sales
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
