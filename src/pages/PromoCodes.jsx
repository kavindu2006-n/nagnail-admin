import { useEffect, useState } from "react";
import API from "../api/config";
import Layout from "../components/Layout";

const initialForm = { code: "", type: "fixed", value: "", min_order_amount: "0", max_uses: "", expires_in_days: "" };
const fields = [
  { key: "code", label: "Promo code", placeholder: "WELCOME100", maxLength: 32, required: true },
  { key: "value", label: "Discount value", type: "number", min: 0.01, step: 0.01, required: true },
  { key: "min_order_amount", label: "Minimum subtotal (LKR)", type: "number", min: 0, step: 0.01 },
  { key: "max_uses", label: "Total use limit", type: "number", min: 1, placeholder: "Unlimited" },
  { key: "expires_in_days", label: "Expires after (days)", type: "number", min: 1, placeholder: "No expiry" },
];
const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

export default function PromoCodes() {
  const [form, setForm] = useState(initialForm);
  const [coupons, setCoupons] = useState([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadCoupons = async () => {
    const { data } = await API.get("/coupons");
    if (!data.success || !Array.isArray(data.coupons)) throw new Error("Could not load promo codes");
    setCoupons(data.coupons);
  };

  useEffect(() => {
    loadCoupons().catch(() => setError("Could not load promo codes. Refresh to retry."))
      .finally(() => setLoading(false));
  }, []);

  const change = (key, value) => setForm(previous => ({ ...previous, [key]: value }));
  const save = async action => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const message = await action();
      setNotice(message);
      await loadCoupons();
    } catch (failure) {
      setError(failure.response?.data?.error || failure.message || "Request failed");
    } finally {
      setBusy(false);
    }
  };

  const create = event => {
    event.preventDefault();
    save(async () => {
      const { data } = await API.post("/coupons", form);
      if (!data.success) throw new Error(data.error || "Could not create the promo code");
      setForm(initialForm);
      return `Created ${data.code}.`;
    });
  };

  return (
    <Layout><main className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Promo Codes</h1>
      <form onSubmit={create} className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-900">Create a promo code</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-medium">Discount type
            <select value={form.type} onChange={event => change("type", event.target.value)} className={inputClass}>
              <option value="fixed">Fixed amount (LKR)</option>
              <option value="percentage">Percentage (%)</option>
            </select>
          </label>
          {fields.map(({ key, label, ...props }) => (
            <label key={key} className="text-sm font-medium">{label}
              <input {...props} value={form[key]} onChange={event => change(key, key === "code" ? event.target.value.toUpperCase() : event.target.value)}
                max={key === "value" && form.type === "percentage" ? 100 : undefined} className={inputClass} />
            </label>
          ))}
        </div>
        <button type="submit" disabled={busy} className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          Create code
        </button>
      </form>

      {notice && <p role="status" className="text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-900">Existing codes</h2>
        {loading ? <p role="status">Loading promo codes…</p> : coupons.length === 0 ? <p>No promo codes to show.</p> : (
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead><tr>{["Code", "Discount", "Minimum", "Uses", "Expires", "Status", "Action"].map(label => (
              <th key={label} scope="col" className="border-b border-slate-200 px-3 py-2">{label}</th>
            ))}</tr></thead>
            <tbody>{coupons.map(coupon => {
              const enabled = Number(coupon.is_active) === 1;
              const expired = coupon.expires_at && new Date(coupon.expires_at).getTime() <= Date.now();
              const used = Number(coupon.used_count || 0);
              const exhausted = coupon.max_uses != null && used >= Number(coupon.max_uses);
              const status = !enabled ? "Disabled" : expired ? "Expired" : exhausted ? "Limit reached" : "Active";
              return (
                <tr key={coupon.code} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-semibold">{coupon.code}</td>
                  <td className="px-3 py-2">{coupon.type === "percentage" ? `${Number(coupon.value)}%` : `LKR ${Number(coupon.value).toLocaleString()}`}</td>
                  <td className="px-3 py-2">LKR {Number(coupon.min_order_amount || 0).toLocaleString()}</td>
                  <td className="px-3 py-2">{used} / {coupon.max_uses ?? "Unlimited"}</td>
                  <td className="px-3 py-2">{coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString("en-LK") : "No expiry"}</td>
                  <td className="px-3 py-2">{status}</td>
                  <td className="px-3 py-2"><button type="button" disabled={busy}
                    className="font-medium text-emerald-800 underline disabled:opacity-50"
                    onClick={() => save(async () => {
                      const { data } = await API.patch(`/coupons/${encodeURIComponent(coupon.code)}`, { is_active: !enabled });
                      if (!data.success) throw new Error(data.error || "Could not update the code");
                      return `${coupon.code} ${enabled ? "disabled" : "enabled"}.`;
                    })}>{enabled ? "Disable" : "Enable"}</button></td>
                </tr>
              );
            })}</tbody>
          </table>
        )}
      </section>
    </main></Layout>
  );
}
