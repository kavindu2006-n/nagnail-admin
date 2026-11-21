import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import API from "../api/config";

const MONEY = n => "LKR " + Number(n || 0).toLocaleString("en-LK");

const DATE = n => {
  if (!n) return "—";
  const d = new Date(n);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-LK");
};

const REASONS = [
  ["customer_refused", "Customer refused delivery"],
  ["customer_unreachable", "Customer unreachable"],
  ["incorrect_customer_details", "Incorrect customer details"],
  ["seller_error", "Dropshipper error"]
];

export default function ReturnCenter() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState("customer_refused");
  const [confirmText, setConfirmText] = useState("");
  const [historicalEvidence, setHistoricalEvidence] = useState("");
  const [previousChargeVerified, setPreviousChargeVerified] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await API.get(
        "/dropnail/return-fees-v3",
        { params: { page, state: status, q: query } }
      );

      if (!response.data?.success) {
        throw new Error(response.data?.error || "Unable to load orders");
      }

      setRows(response.data.rows || []);
      setSummary(response.data.summary || {});
      setTotal(Number(response.data.total || 0));
      setLimit(Number(response.data.limit || 20));
    } catch (e) {
      setRows([]);
      setError(
        e.response?.data?.error ||
        e.message ||
        "Unable to load Return Center"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, status, query]);

  const canCharge = row =>
    row.order_status === "cancelled" &&
    Number(row.is_return) === 1 &&
    Boolean(row.shipped_at) &&
    row.fee_status === "uncharged";

  const openAction = (row, action) => {
    setSelected({ ...row, action });
    setConfirmText("");
    setReason("customer_refused");
    setHistoricalEvidence("");
    setPreviousChargeVerified(false);
    setError("");
    setNotice("");
  };

  const submitAction = async () => {
    if (!selected || busy) return;

    const isCharge = selected.action === "charge";
    const required = isCharge ? "CHARGE_150" : "REVERSE_FEE";

    if (confirmText.trim() !== required) {
      setError("Please enter the exact confirmation text.");
      return;
    }

    // UI guard. Backend independently validates eligibility.
    if (isCharge && !canCharge(selected)) {
      setError("This order is not eligible for a return fee.");
      return;
    }

    if (!isCharge &&
        ["uncharged", "reversed"].includes(selected.fee_status)) {
      setError("No active fee available to reverse.");
      return;
    }

    if (isCharge && Number(selected.is_legacy) === 1 &&
        (!previousChargeVerified ||
         historicalEvidence.trim().length < 12 ||
         historicalEvidence.trim().length > 255)) {
      setError("Historical review confirmation and evidence reference are required.");
      return;
    }

    if (!window.confirm(
      isCharge
        ? "Charge LKR 150 for this verified courier return?"
        : "Reverse this return fee and refund any settled amount?"
    )) return;

    setBusy(true);
    setError("");

    try {
      const endpoint =
        `/dropship-orders/${selected.order_id}/return-fee` +
        (isCharge ? "" : "/reverse");

      const payload = isCharge
        ? {
            confirm: "CHARGE_150",
            reason,
            ...(Number(selected.is_legacy) === 1 ? {
              historical_confirm: "HISTORICAL_NOT_PREVIOUSLY_CHARGED",
              historical_evidence: historicalEvidence.trim(),
              previous_charge_verified: previousChargeVerified
            } : {})
          }
        : { confirm: "REVERSE_FEE" };

      const response = await API.post(endpoint, payload);

      if (!response.data?.success) {
        throw new Error(response.data?.error || "Operation failed");
      }

      setNotice(
        isCharge
          ? "Return fee recorded successfully. Check wallet settlement status."
          : "Return fee reversed successfully."
      );

      setSelected(null);
      await load();
    } catch (e) {
      setError(
        e.response?.data?.error ||
        e.message ||
        "Return fee operation failed"
      );
    } finally {
      setBusy(false);
    }
  };

  const pages = Math.max(1, Math.ceil(total / limit));

  const cards = [
    ["Cancelled Orders", summary.cancelled_orders],
    ["Return Flagged", summary.flagged_returns],
    ["Pending Fees", MONEY(summary.pending_lkr)],
    ["Collected Fees", MONEY(summary.collected_lkr)]
  ];

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">
              Dropshipping / Finance
            </p>
            <h1 className="text-3xl font-black text-slate-900">
              Return Center
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Cancelled orders, verified returns and return fee management.
            </p>
          </div>
          <button onClick={load} disabled={loading || busy}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold disabled:opacity-50">
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {cards.map(([label, value]) => (
            <div key={label}
              className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-2xl font-black text-slate-900 mt-2">
                {value ?? 0}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Fees are not automatic. Only verified shipped returns may be charged.
          Current fixed fee: LKR 150. A cancelled order alone is not proof
          that a return fee is chargeable.
        </div>

        {error && (
          <div role="alert"
            className="rounded-xl bg-red-50 text-red-700 p-4">
            {error}
          </div>
        )}

        {notice && (
          <div role="status"
            className="rounded-xl bg-emerald-50 text-emerald-800 p-4">
            {notice}
          </div>
        )}

        {selected && (
          <section className="bg-white border-2 border-indigo-200 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center gap-3">
              <div>
                <h2 className="font-bold text-lg">
                  {selected.action === "charge"
                    ? "Charge Return Fee"
                    : "Reverse Return Fee"}
                </h2>
                <p className="text-sm text-slate-500">
                  Order {selected.order_number || selected.order_id}
                  {" · "}
                  {selected.seller_name || "Dropshipper"}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                disabled={busy}
                className="text-slate-500 underline">
                Cancel
              </button>
            </div>

            {selected.action === "charge" && (
              <label className="block text-sm font-medium">
                Verified return reason
                <select value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="block mt-2 w-full max-w-md rounded-lg border p-3">
                  {REASONS.map(([id, label]) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
              </label>
            )}

            {selected.action === "charge" &&
              Number(selected.is_legacy) === 1 && (
                <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
                  <h3 className="font-bold text-amber-900">
                    Historical Return Review
                  </h3>
                  <p className="text-sm text-amber-900">
                    Verify the courier return and check for previous manual,
                    offline and wallet charges before approving this fee.
                  </p>

                  <label className="block text-sm font-medium">
                    Courier / return evidence reference
                    <input
                      value={historicalEvidence}
                      onChange={e => setHistoricalEvidence(e.target.value)}
                      placeholder="Waybill, courier record or documented reference"
                      maxLength={255}
                      className="mt-2 block w-full max-w-xl rounded-lg border p-3"
                    />
                  </label>

                  <label className="flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={previousChargeVerified}
                      onChange={e =>
                        setPreviousChargeVerified(e.target.checked)
                      }
                      className="mt-1"
                    />
                    I have reviewed the available records and confirmed
                    this order was not previously charged a return fee.
                  </label>
                </div>
              )}

            <p className="text-sm text-slate-600">
              Type <strong>
                {selected.action === "charge"
                  ? "CHARGE_150"
                  : "REVERSE_FEE"}
              </strong> to confirm.
            </p>

            <input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              className="block w-full max-w-md rounded-lg border p-3"
              placeholder="Type confirmation"
              autoComplete="off"
            />

            <button
              onClick={submitAction}
              disabled={busy || confirmText.trim() !==
                (selected.action === "charge"
                  ? "CHARGE_150"
                  : "REVERSE_FEE")}
              className="rounded-xl bg-indigo-600 text-white px-5 py-3 font-semibold disabled:opacity-40">
              {busy ? "Processing..." :
                selected.action === "charge"
                  ? "Confirm LKR 150 Charge"
                  : "Confirm Fee Reversal"}
            </button>
          </section>
        )}

        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <form
            onSubmit={e => {
              e.preventDefault();
              setPage(1);
              setQuery(search);
            }}
            className="p-4 flex flex-wrap gap-3">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search order, dropshipper or phone"
              className="flex-1 min-w-48 border rounded-xl px-3 py-2"
            />
            <select
              value={status}
              onChange={e => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="border rounded-xl px-3 py-2">
              {[
                ["all", "All fees"],
                ["uncharged", "Not charged"],
                ["pending", "Pending"],
                ["partial", "Partial"],
                ["settled", "Settled"],
                ["reversed", "Reversed"]
              ].map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button type="submit"
              className="px-5 py-2 bg-slate-900 text-white rounded-xl">
              Search
            </button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  {[
                    "Order", "Dropshipper", "Order status",
                    "Fee status", "Fee amount", "Remaining",
                    "History", "Action"
                  ].map(col => (
                    <th key={col} className="text-left p-3 border-b">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8}
                    className="p-8 text-center">Loading orders…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={8}
                    className="p-8 text-center text-slate-500">
                    No matching orders found.
                  </td></tr>
                ) : rows.map(row => (
                  <tr key={row.order_id}
                    className="border-b border-slate-100">
                    <td className="p-3">
                      <div className="font-bold">
                        {row.order_number || `#${row.order_id}`}
                      </div>
                      <div className="text-xs text-slate-500">
                        {DATE(row.order_created_at)}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold">
                        {row.seller_name || "Unknown"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {row.seller_phone || ""}
                      </div>
                    </td>
                    <td className="p-3">
                      <div>{row.order_status}</div>
                      <div className="text-xs text-slate-500">
                        {Number(row.is_return)
                          ? "Return flagged"
                          : "Not return flagged"}
                      </div>
                    </td>
                    <td className="p-3 font-semibold">
                      {row.fee_status || "uncharged"}
                    </td>
                    <td className="p-3">
                      {row.amount == null ? "—" : MONEY(row.amount)}
                    </td>
                    <td className="p-3">
                      {row.remaining_amount == null
                        ? "—" : MONEY(row.remaining_amount)}
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      <div>Charged: {DATE(row.charged_at)}</div>
                      <div>Reversed: {DATE(row.reversed_at)}</div>
                      <div>{row.reason || ""}</div>
                    </td>
                    <td className="p-3">
                      {canCharge(row) ? (
                        <button
                          disabled={busy}
                          onClick={() => openAction(row, "charge")}
                          className="px-3 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50">
                          {Number(row.is_legacy) === 1
                            ? "Review Historical Fee"
                            : "Charge LKR 150"}
                        </button>
                      ) : !["uncharged", "reversed"].includes(
                        row.fee_status
                      ) ? (
                        <button
                          disabled={busy}
                          onClick={() => openAction(row, "reverse")}
                          className="px-3 py-2 rounded-lg border border-slate-300 disabled:opacity-50">
                          Reverse Fee
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">
                          No action
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 flex justify-between items-center gap-3">
            <span className="text-xs text-slate-500">
              {total} records · Page {page} of {pages}
            </span>
            <div className="flex gap-2">
              <button disabled={page <= 1 || loading}
                onClick={() => setPage(p => p - 1)}
                className="border rounded-lg px-3 py-2 disabled:opacity-40">
                Previous
              </button>
              <button disabled={page >= pages || loading}
                onClick={() => setPage(p => p + 1)}
                className="border rounded-lg px-3 py-2 disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
