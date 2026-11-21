
import { useEffect, useState } from "react";
import API from "../api/config";

const SOURCES = [
  ["unknown", "Unknown / Not Classified"],
  ["own_warehouse", "Own Warehouse Stock"],
  ["external_supplier", "External Dropshipping Company"]
];

const fmt = v => v == null ? "—" : Number(v).toLocaleString();

export default function FinancialSourceManagerV5() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");
  const [source, setSource] = useState("unknown");
  const [supplier, setSupplier] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await API.get("/erp/product-sources-v5");
      if (!result.data?.success) throw new Error("Source Manager unavailable");
      setData(result.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const choose = (id, products = data?.products || []) => {
    setSelected(String(id));
    const p = products.find(x => String(x.id) === String(id));
    setSource(p?.inventory_source || "unknown");
    setSupplier(p?.supplier_id == null ? "" : String(p.supplier_id));
    setCost(p?.unit_supplier_cost == null ? "" : String(p.unit_supplier_cost));
    setNotes(p?.notes || "");
    setReason("");
    setMessage("");
  };

  const save = async () => {
    if (!selected || saving) return;
    if (!reason.trim()) {
      setError("Enter a reason for this classification change.");
      return;
    }
    if (source === "external_supplier" &&
        (!supplier || !/^\d+(\.\d{1,2})?$/.test(cost) || Number(cost) <= 0)) {
      setError("Select a supplier and enter a valid positive buying cost.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await API.put(
        `/erp/product-sources-v5/${selected}`,
        {
          inventory_source: source,
          supplier_id: source === "external_supplier" ? Number(supplier) : null,
          unit_supplier_cost: source === "external_supplier" ? cost : null,
          notes,
          reason: reason.trim()
        }
      );
      if (!result.data?.success) throw new Error("Save failed");
      const refreshed = await API.get("/erp/product-sources-v5");
      if (!refreshed.data?.success) throw new Error("Saved, but reload failed");
      setData(refreshed.data);
      choose(selected, refreshed.data.products);
      setMessage(result.data.changed
        ? "Saved successfully. Audit history updated."
        : "No changes were necessary.");
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  const products = (data?.products || []).filter(p =>
    `${p.name} ${p.sku || ""} ${p.id}`
      .toLowerCase().includes(search.toLowerCase())
  );
  const current = data?.products?.find(p => String(p.id) === selected);
  const classified = (data?.products || []).filter(p =>
    p.inventory_source !== "unknown"
  ).length;
  const input = "w-full rounded-lg border border-slate-300 p-2.5 text-sm";

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
        <h2 className="text-lg font-extrabold text-indigo-900">
          Product Source Manager V5
        </h2>
        <p className="text-sm text-indigo-800 mt-1">
          Explicitly classify own warehouse products and external supplier products.
          Product defaults do not change stock or historical orders.
        </p>
      </section>

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        Important: A product can be fulfilled from different sources on different
        orders. Classify the default here; actual order-level fulfillment
        snapshots are not yet automated. Buying cost is a current default,
        not verified historical COGS.
      </div>

      {loading && <p>Loading source classifications...</p>}
      {error && <div className="p-3 rounded-lg bg-rose-50 text-rose-700">{error}</div>}
      {message && <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800">{message}</div>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border rounded-xl p-4">
              <p className="text-xs text-slate-500">Classified Products</p>
              <p className="text-xl font-bold">{classified}</p>
            </div>
            <div className="bg-white border rounded-xl p-4">
              <p className="text-xs text-slate-500">Unclassified Products</p>
              <p className="text-xl font-bold">
                {data.products.length - classified}
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <section className="bg-white border rounded-xl p-4 space-y-3">
              <h3 className="font-bold">Select Product</h3>
              <input value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search product name, ID, SKU"
                className={input}
              />
              <div className="max-h-96 overflow-y-auto divide-y">
                {products.map(p => (
                  <button type="button" key={p.id}
                    onClick={() => choose(p.id)}
                    className={`w-full p-3 text-left hover:bg-slate-50 ${
                      selected === String(p.id) ? "bg-indigo-50" : ""
                    }`}
                  >
                    <div className="font-semibold text-sm">
                      #{p.id} — {p.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {SOURCES.find(s => s[0] === p.inventory_source)?.[1]}
                      {p.supplier_name ? ` · ${p.supplier_name}` : ""}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-white border rounded-xl p-4 space-y-3">
              <h3 className="font-bold">Classification Details</h3>
              {current ? (
                <>
                  <p className="text-sm font-semibold">{current.name}</p>

                  <label className="block text-sm font-semibold">
                    Inventory Source
                    <select className={`${input} mt-1`} value={source}
                      onChange={e => setSource(e.target.value)}>
                      {SOURCES.map(([value, label]) =>
                        <option key={value} value={value}>{label}</option>
                      )}
                    </select>
                  </label>

                  {source === "external_supplier" && (
                    <>
                      <label className="block text-sm font-semibold">
                        Supplier Company
                        <select className={`${input} mt-1`} value={supplier}
                          onChange={e => setSupplier(e.target.value)}>
                          <option value="">Select supplier</option>
                          {(data.suppliers || [])
                            .filter(s => s.status === "active" ||
                              String(s.id) === supplier)
                            .map(s =>
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            )}
                        </select>
                      </label>

                      <label className="block text-sm font-semibold">
                        Unit Buying Cost (LKR)
                        <input className={`${input} mt-1`}
                          inputMode="decimal" value={cost}
                          onChange={e => setCost(e.target.value)}
                          placeholder="e.g. 1800.00" />
                      </label>
                    </>
                  )}

                  <label className="block text-sm font-semibold">
                    Notes
                    <textarea className={`${input} mt-1`} value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={3} maxLength={5000} />
                  </label>

                  <label className="block text-sm font-semibold">
                    Reason for Change (Required)
                    <input className={`${input} mt-1`} value={reason}
                      maxLength={500}
                      onChange={e => setReason(e.target.value)}
                      placeholder="e.g. Confirmed external supplier"
                    />
                  </label>

                  <button type="button" disabled={saving || !reason.trim()}
                    onClick={save}
                    className="rounded-lg bg-indigo-600 disabled:opacity-50 text-white px-5 py-2.5 font-bold">
                    {saving ? "Saving..." : "Save Source & Record Audit"}
                  </button>
                </>
              ) : (
                <p className="text-sm text-slate-500">
                  Select a product from the left.
                </p>
              )}
            </section>
          </div>

          <section className="bg-white border rounded-xl overflow-x-auto">
            <h3 className="font-bold p-4 border-b">
              Source Change Audit History
            </h3>
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead className="bg-slate-100">
                <tr>
                  {["Date","Product","Previous","New","Cost Change",
                    "Changed By","Reason"].map(h =>
                    <th className="p-3" key={h}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data.audit || []).map(a => (
                  <tr key={a.id}>
                    <td className="p-3">
                      {a.created_at ? new Date(a.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="p-3">{a.product_name || `#${a.product_id}`}</td>
                    <td className="p-3">{a.old_source || "unknown"}</td>
                    <td className="p-3">{a.new_source}</td>
                    <td className="p-3">
                      {fmt(a.old_unit_cost)} → {fmt(a.new_unit_cost)}
                    </td>
                    <td className="p-3">{a.changed_by}</td>
                    <td className="p-3">{a.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.audit?.length &&
              <p className="p-4 text-sm text-slate-500">No changes recorded yet.</p>}
          </section>
        </>
      )}
    </div>
  );
}
