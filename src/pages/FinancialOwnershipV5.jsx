
import { useEffect, useMemo, useState } from "react";
import API from "../api/config";

const money = v => "LKR " + Number(v || 0).toLocaleString("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const sourceNames = {
  own_warehouse: "Own Warehouse",
  external_supplier: "External Supplier",
  unknown: "Unknown"
};

const channelNames = {
  website_manual: "Website / Manual",
  dropnail_reseller: "DropNail Reseller"
};

export default function FinancialOwnershipV5() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("delivered");
  const [channel, setChannel] = useState("all");
  const [basis, setBasis] = useState("all");
  const [search, setSearch] = useState("");

  const load = async (f = from, t = to) => {
    if (f && t && f > t) {
      setError("Start date must be before end date.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await API.get("/erp/reports/ownership-v5", {
        params: {
          ...(f ? { from: f } : {}),
          ...(t ? { to: t } : {})
        }
      });
      if (!response.data?.success) throw new Error("Report unavailable");
      setData(response.data);
    } catch (e) {
      setData(null);
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load("", ""); }, []);

  const rows = useMemo(() => (data?.items || []).filter(r => {
    if (status !== "all" && r.status !== status) return false;
    if (channel !== "all" && r.channel !== channel) return false;
    if (basis !== "all" && r.classification_basis !== basis) return false;
    const q = search.trim().toLowerCase();
    return !q || `${r.product_name} ${r.order_id} ${r.product_id}`
      .toLowerCase().includes(q);
  }), [data, status, channel, basis, search]);

  const group = source => {
    const selected = rows.filter(r => r.inventory_source === source);
    const revenue = selected.reduce(
      (sum, r) => sum + Number(r.nagnail_revenue || 0), 0
    );
    const units = selected.reduce(
      (sum, r) => sum + Number(r.quantity || 0), 0
    );
    const costCovered = selected.filter(r =>
      r.illustrative_supplier_cost !== null &&
      r.illustrative_supplier_cost !== undefined
    );
    const supplierCost = costCovered.reduce(
      (sum, r) => sum + Number(r.illustrative_supplier_cost || 0), 0
    );
    const costRevenue = costCovered.reduce(
      (sum, r) => sum + Number(r.nagnail_revenue || 0), 0
    );
    return {
      revenue, units,
      orders: new Set(selected.map(r =>
        `${r.channel}:${r.order_id}`)).size,
      supplierCost,
      coveredUnits: costCovered.reduce(
        (sum, r) => sum + Number(r.quantity || 0), 0
      ),
      spread: costRevenue - supplierCost
    };
  };

  const own = group("own_warehouse");
  const external = group("external_supplier");
  const unknown = group("unknown");

  const summary = (name, g, externalCard = false) => (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-sm text-slate-500 font-semibold">{name}</p>
      <p className="text-xl font-extrabold mt-2">{money(g.revenue)}</p>
      <p className="text-xs text-slate-500 mt-1">
        {g.units} units · {g.orders} orders in category
      </p>
      {externalCard && (
        <div className="text-sm mt-3 space-y-1">
          <p>Current-cost estimate: {money(g.supplierCost)}</p>
          <p className="font-bold">
            Illustrative spread on cost-covered sales: {money(g.spread)}
          </p>
          <p className="text-xs text-amber-700">
            Cost-covered units: {g.coveredUnits} / {g.units}.
            These are not verified historical costs or net profit.
          </p>
        </div>
      )}
    </div>
  );

  const input = "rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white";

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
        <h2 className="text-lg font-bold text-indigo-900">
          Own Inventory vs External Dropshipping — V5
        </h2>
        <p className="text-sm text-indigo-800 mt-1">
          Actual saved product classifications with historical evidence labels.
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Accounting notice:</strong> Provisional means current product
        classification, not proven historical fulfillment. Only confirmed
        order snapshots establish historical source. Supplier costs without
        snapshots are current estimates. Own-stock COGS, refunds, delivery,
        packaging and fees are not reconciled here. This is not net profit.
      </div>

      <div className="flex gap-3 flex-wrap items-end bg-white border rounded-xl p-4">
        <label className="text-xs font-semibold">
          From
          <input type="date" value={from}
            onChange={e => setFrom(e.target.value)}
            className={`${input} block mt-1`} />
        </label>
        <label className="text-xs font-semibold">
          To
          <input type="date" value={to}
            onChange={e => setTo(e.target.value)}
            className={`${input} block mt-1`} />
        </label>
        <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold"
          disabled={loading} onClick={() => load()}>
          {loading ? "Loading..." : "Apply Dates"}
        </button>
        <button className={`${input} font-semibold`}
          onClick={() => {
            setFrom("");
            setTo("");
            load("", "");
          }}>
          All Dates
        </button>
        <button className={`${input} font-semibold`}
          disabled={loading} onClick={() => load()}>
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select className={input} value={status}
          onChange={e => setStatus(e.target.value)}>
          <option value="delivered">Delivered Only</option>
          <option value="shipped">Shipped Only</option>
          <option value="all">Delivered + Shipped</option>
        </select>
        <select className={input} value={channel}
          onChange={e => setChannel(e.target.value)}>
          <option value="all">All Channels</option>
          <option value="website_manual">Website / Manual</option>
          <option value="dropnail_reseller">DropNail Reseller</option>
        </select>
        <select className={input} value={basis}
          onChange={e => setBasis(e.target.value)}>
          <option value="all">All Evidence Levels</option>
          <option value="snapshot">Verified Snapshot</option>
          <option value="provisional">Provisional</option>
        </select>
        <input className={`${input} flex-1 min-w-44`}
          placeholder="Search product / order ID"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {error && (
        <div className="border border-rose-200 bg-rose-50 p-4 text-rose-700 rounded-xl">
          {error}
        </div>
      )}
      {loading && <p className="text-sm text-slate-500">Loading report...</p>}

      {data && (
        <>
          <div className="grid md:grid-cols-3 gap-3">
            {summary("Own Warehouse Sales", own)}
            {summary("External Supplier Sales", external, true)}
            {summary("Unclassified Sales", unknown)}
          </div>

          <div className="bg-white border rounded-xl p-4 text-sm">
            <strong>Evidence coverage:</strong>{" "}
            {rows.filter(r => r.classification_basis === "snapshot").length}
            {" "}verified snapshot lines ·{" "}
            {rows.filter(r => r.classification_basis === "provisional").length}
            {" "}provisional lines.
            <p className="text-xs text-slate-500 mt-2">
              Totals follow selected filters. Group order counts can overlap
              for mixed-source orders. Date filters use order creation date.
            </p>
          </div>

          <div className="bg-white border rounded-xl overflow-x-auto">
            <h3 className="font-bold p-4 border-b">
              Product-wise Ownership Sales ({rows.length} lines)
            </h3>
            <table className="w-full min-w-[1100px] text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 text-xs">
                <tr>
                  {["Product", "Order", "Source", "Evidence", "Channel",
                    "Status", "Units", "Revenue", "Supplier Cost", "Spread"]
                    .map(x => <th key={x} className="p-3">{x}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r, i) => (
                  <tr key={`${r.channel}-${r.order_line_id}-${i}`}>
                    <td className="p-3 min-w-48">
                      <div className="font-semibold">{r.product_name}</div>
                      <div className="text-xs text-slate-500">
                        #{r.product_id}
                      </div>
                    </td>
                    <td className="p-3">#{r.order_id}</td>
                    <td className="p-3">{sourceNames[r.inventory_source]}</td>
                    <td className="p-3 capitalize">{r.classification_basis}</td>
                    <td className="p-3">{channelNames[r.channel]}</td>
                    <td className="p-3 capitalize">{r.status}</td>
                    <td className="p-3">{r.quantity}</td>
                    <td className="p-3">{money(r.nagnail_revenue)}</td>
                    <td className="p-3">
                      {r.illustrative_supplier_cost == null
                        ? "Not verified"
                        : money(r.illustrative_supplier_cost)}
                    </td>
                    <td className="p-3">
                      {r.illustrative_gross_spread == null
                        ? "—"
                        : money(r.illustrative_gross_spread)}
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-500">
                      No matching sales
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
