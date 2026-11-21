
import { useEffect, useMemo, useState } from "react";
import API from "../api/config";

// NN-FINANCIAL-V5-ORDER-NUMBER-UI
const displayOrderNumber = row =>
  row.order_number || `#${row.order_id}`;

const sourceLabel = {
  own_warehouse: "Own Warehouse",
  external_supplier: "External Supplier",
  unknown: "Unknown"
};

const money = v => Number(v || 0).toLocaleString("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export default function FinancialOrderVerifyV5() {
  const [data, setData] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showVerified, setShowVerified] = useState(false);

  const [selected, setSelected] = useState(null);
  const [source, setSource] = useState("");
  const [supplier, setSupplier] = useState("");
  const [cost, setCost] = useState("");
  const [reason, setReason] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const [sales, manager] = await Promise.all([
        API.get("/erp/reports/ownership-v5"),
        API.get("/erp/product-sources-v5")
      ]);

      if (!sales.data?.success || !manager.data?.success) {
        throw new Error("Unable to load verification data");
      }

      setData(sales.data);
      setSuppliers(manager.data.suppliers || []);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const rows = useMemo(() => {
    return (data?.items || []).filter(r => {
      if (!showVerified && r.classification_basis === "snapshot")
        return false;

      const q = search.trim().toLowerCase();

      return !q || (
        `${r.product_name} ${r.product_id} ${r.order_id} ${r.order_number || ""} ${r.channel}`
          .toLowerCase().includes(q)
      );
    });
  }, [data, showVerified, search]);

  const choose = row => {
    setSelected(row);
    // Never pre-confirm source or historical unit cost automatically.
    setSource("");
    setSupplier("");
    setCost("");
    setReason("");
    setError("");
    setMessage("");
  };

  const save = async () => {
    if (!selected || saving) return;

    if (selected.classification_basis === "snapshot") {
      setError("This order line is already verified.");
      return;
    }

    if (!["own_warehouse", "external_supplier"].includes(source)) {
      setError("Select the actual fulfillment source.");
      return;
    }

    if (source === "external_supplier" &&
        (!supplier ||
         !/^\d{1,10}(\.\d{1,2})?$/.test(cost.trim()) ||
         Number(cost) <= 0)) {
      setError("Select actual supplier and enter the actual unit cost.");
      return;
    }

    if (reason.trim().length < 10 || reason.trim().length > 500) {
      setError("Verification reason must be 10–500 characters.");
      return;
    }

    const description =
      `Order #${selected.order_id}, product #${selected.product_id}` +
      `, ${selected.quantity} units. Confirm actual fulfillment?`;

    if (!window.confirm(description)) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await API.post(
        "/erp/order-source-verification-v5",
        {
          channel: selected.channel,
          order_line_id: selected.order_line_id,
          inventory_source: source,
          supplier_id: source === "external_supplier"
            ? Number(supplier) : null,
          unit_cost: source === "external_supplier" ? cost.trim() : null,
          reason: reason.trim()
        }
      );

      if (!response.data?.success)
        throw new Error("Verification failed");

      setSelected(null);
      setSource("");
      setSupplier("");
      setCost("");
      setReason("");

      await load();

      setMessage(
        "Order fulfillment verified. Snapshot and audit recorded."
      );
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  const all = data?.items || [];
  const verified = all.filter(r =>
    r.classification_basis === "snapshot"
  ).length;

  const field = "w-full rounded-lg border border-slate-300 p-2.5 text-sm";

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
        <h2 className="text-lg font-extrabold text-indigo-900">
          Verify Order Fulfillment — Financial V5
        </h2>
        <p className="mt-1 text-sm text-indigo-800">
          Confirm actual stock source, supplier and historical unit cost
          for each fulfilled order line.
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Important:</strong> Current product classification is only a
        suggestion, not proof of past fulfillment. Check actual supplier
        invoices, order records or warehouse dispatch evidence before
        verifying. Snapshot verification cannot be edited afterwards.
        Own Warehouse verification does not establish historical COGS.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          ["Fulfilled Order Lines", all.length],
          ["Verified Snapshots", verified],
          ["Pending Verification", all.length - verified]
        ].map(([name, value]) => (
          <div key={name} className="rounded-xl bg-white border p-4">
            <p className="text-xs text-slate-500 font-semibold">{name}</p>
            <p className="text-2xl font-extrabold mt-2">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border rounded-xl p-4 flex flex-wrap gap-4 items-center">
        <input
          className={`${field} flex-1 min-w-52`}
          placeholder="Search product, order ID or channel"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox"
            checked={showVerified}
            onChange={e => setShowVerified(e.target.checked)}
          />
          Show verified lines
        </label>
        <button type="button" onClick={load}
          disabled={loading || saving}
          className="border rounded-lg px-4 py-2 font-semibold text-sm">
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-700">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
          {message}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="bg-white border rounded-xl p-4">
          <h3 className="font-bold mb-3">
            Fulfilled Order Lines ({rows.length})
          </h3>

          <div className="max-h-[550px] overflow-y-auto divide-y">
            {rows.map(r => {
              const key = `${r.channel}:${r.order_line_id}`;
              const selectedKey = selected
                ? `${selected.channel}:${selected.order_line_id}` : "";

              return (
                <button type="button" key={key}
                  onClick={() => choose(r)}
                  className={`block w-full text-left p-3 hover:bg-slate-50 ${
                    key === selectedKey ? "bg-indigo-50" : ""
                  }`}>
                  <p className="text-sm font-bold">
                    {displayOrderNumber(r)} — {r.product_name}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {r.channel === "dropnail_reseller"
                      ? "DropNail" : "Website / Manual"}
                    {" · Internal ID #" + r.order_id + " · "}{r.status}
                    {" · "}{r.quantity} units
                    {" · "}{sourceLabel[r.inventory_source]}
                  </p>
                  <p className="text-xs mt-1">
                    {r.classification_basis === "snapshot"
                      ? "Verified snapshot"
                      : "Unverified · provisional source"}
                    {" · Revenue LKR "}{money(r.nagnail_revenue)}
                  </p>
                </button>
              );
            })}
            {!rows.length && (
              <p className="p-5 text-sm text-slate-500">
                No order lines match the current filter.
              </p>
            )}
          </div>
        </section>

        <section className="bg-white border rounded-xl p-4 space-y-4">
          <h3 className="font-bold">Confirm Actual Fulfillment</h3>

          {!selected ? (
            <p className="text-sm text-slate-500">
              Select an order line from the list.
            </p>
          ) : (
            <>
              <div className="rounded-lg bg-slate-50 p-3 text-sm">
                <p className="font-bold">
                  {displayOrderNumber(selected)} · Product #{selected.product_id}
                </p>
                <p className="mt-1">{selected.product_name}</p>
                <p className="mt-1 text-slate-600">
                  Internal ID: #{selected.order_id} · Quantity: {selected.quantity} · Current default:
                  {" "}{sourceLabel[selected.inventory_source]}
                </p>
              </div>

              {selected.classification_basis === "snapshot" ? (
                <div className="text-sm text-emerald-700">
                  Already verified — this record is immutable.
                </div>
              ) : (
                <>
                  <label className="block text-sm font-semibold">
                    Actual Fulfillment Source
                    <select className={`${field} mt-1`}
                      value={source}
                      onChange={e => {
                        setSource(e.target.value);
                        setSupplier("");
                        setCost("");
                      }}>
                      <option value="">Select after checking evidence</option>
                      <option value="own_warehouse">Own Warehouse</option>
                      <option value="external_supplier">External Supplier</option>
                    </select>
                  </label>

                  {source === "external_supplier" && (
                    <>
                      <label className="block text-sm font-semibold">
                        Actual Supplier Company
                        <select className={`${field} mt-1`}
                          value={supplier}
                          onChange={e => setSupplier(e.target.value)}>
                          <option value="">Select actual supplier</option>
                          {suppliers.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block text-sm font-semibold">
                        Actual Historical Unit Buying Cost (LKR)
                        <input className={`${field} mt-1`}
                          value={cost}
                          inputMode="decimal"
                          onChange={e => setCost(e.target.value)}
                          placeholder="Confirm against invoice"
                        />
                      </label>
                    </>
                  )}

                  <label className="block text-sm font-semibold">
                    Verification Evidence / Reason
                    <textarea className={`${field} mt-1`}
                      rows={3}
                      maxLength={500}
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="e.g. Matched against supplier invoice and dispatch record"
                    />
                  </label>

                  <button type="button" onClick={save}
                    disabled={saving || !source || reason.trim().length < 10}
                    className="rounded-lg bg-indigo-600 text-white px-5 py-2.5 font-bold disabled:opacity-50">
                    {saving ? "Saving..." : "Verify & Lock Snapshot"}
                  </button>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
