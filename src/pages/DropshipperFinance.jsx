import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import API from "../api/config";

const money = value =>
  "LKR " + Number(value || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const date = value =>
  value ? new Date(value).toLocaleString("en-LK") : "—";

export default function DropshipperFinance() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [seller, setSeller] = useState(null);
  const [report, setReport] = useState(null);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const findSellers = async e => {
    e.preventDefault();
    setError("");
    setResults([]);
    if (search.trim().length < 2) return;

    setBusy(true);
    try {
      const { data } = await API.get(
        "/dropnail/finance/sellers",
        { params: { q: search.trim() } }
      );
      setResults(data.sellers || []);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!seller) return;

    let cancelled = false;

    async function load() {
      setBusy(true);
      setError("");
      try {
        const { data } = await API.get(
          `/dropnail/finance/sellers/${seller.id}/ledger`,
          { params: { page } }
        );
        if (!cancelled) setReport(data);
      } catch (e) {
        if (!cancelled) {
          setReport(null);
          setError(e.response?.data?.error || e.message);
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [seller, page]);

  const selectSeller = item => {
    setSeller(item);
    setReport(null);
    setPage(1);
    setResults([]);
  };

  const summary = report?.summary || {};
  const transactions = report?.transactions || [];
  const pages = Math.max(
    1,
    Math.ceil(Number(summary.transaction_count || 0) /
      Number(report?.limit || 25))
  );

  const cards = [
    ["Total Credits", summary.total_credits],
    ["Total Debits", summary.total_debits],
    ["Pending Return Fees", summary.pending_return_fees],
    ["Current Wallet", summary.current_wallet_balance]
  ];

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6">
        <header>
          <p className="text-xs uppercase font-bold text-indigo-600">
            Dropshipping / Finance
          </p>
          <h1 className="text-3xl font-black text-slate-900">
            Dropshipper Finance
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Individual commissions, wallet charges,
            reversals and payouts. Read-only.
          </p>
        </header>

        <form onSubmit={findSellers}
          className="bg-white border rounded-2xl p-4 flex gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search dropshipper name, phone or ID"
            className="border rounded-xl px-4 py-3 flex-1 min-w-0"
          />
          <button disabled={busy || search.trim().length < 2}
            className="bg-indigo-600 text-white px-5 rounded-xl disabled:opacity-50">
            Search
          </button>
        </form>

        {error && (
          <p role="alert"
            className="p-4 rounded-xl bg-red-50 text-red-700">
            {error}
          </p>
        )}

        {results.length > 0 && (
          <div className="bg-white border rounded-2xl overflow-hidden">
            {results.map(item => (
              <button key={item.id}
                onClick={() => selectSeller(item)}
                className="w-full text-left p-4 border-b hover:bg-slate-50">
                <div className="font-bold">
                  {item.full_name} — ID {item.id}
                </div>
                <div className="text-xs text-slate-500">
                  {item.phone} · Wallet {money(item.wallet_balance)}
                </div>
              </button>
            ))}
          </div>
        )}

        {seller && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">
                  {report?.seller?.full_name || seller.full_name}
                </h2>
                <p className="text-sm text-slate-500">
                  Dropshipper #{seller.id}
                </p>
              </div>
              <button
                onClick={() => {
                  setSeller(null);
                  setReport(null);
                }}
                className="px-4 py-2 border rounded-xl">
                Change Dropshipper
              </button>
            </div>

            {report && (
              <>
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                  {cards.map(([label, value]) => (
                    <div key={label}
                      className="bg-white border rounded-2xl p-4">
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="font-black text-xl mt-2">
                        {money(value)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
                  Pending return fees are not yet wallet deductions.
                  Historical transaction totals may differ from the
                  current wallet balance.
                </div>

                <div className="bg-white rounded-2xl border overflow-hidden">
                  <div className="p-4 border-b font-bold">
                    Wallet Transactions — One by One
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          {["Date", "Type", "Order", "Description", "Amount"].map(x =>
                            <th key={x} className="text-left p-3">
                              {x}
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map(tx => (
                          <tr key={tx.id} className="border-t">
                            <td className="p-3">{date(tx.created_at)}</td>
                            <td className="p-3 font-semibold">
                              {tx.category}
                            </td>
                            <td className="p-3">
                              {tx.order_number ||
                                (tx.return_fee_order_id
                                  ? `#${tx.return_fee_order_id}`
                                  : tx.order_id
                                    ? `#${tx.order_id}`
                                    : "—")}
                            </td>
                            <td className="p-3">
                              {tx.description || "—"}
                            </td>
                            <td className={`p-3 font-bold ${
                              tx.type === "credit"
                                ? "text-emerald-700"
                                : "text-red-700"
                            }`}>
                              {tx.type === "credit" ? "+" : "−"}
                              {money(tx.amount)}
                            </td>
                          </tr>
                        ))}
                        {transactions.length === 0 && (
                          <tr>
                            <td colSpan={5}
                              className="text-center text-slate-500 p-8">
                              No wallet transactions recorded.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-4 flex justify-between items-center">
                    <span className="text-sm text-slate-500">
                      Page {page} / {pages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        disabled={page <= 1 || busy}
                        onClick={() => setPage(p => p - 1)}
                        className="border rounded-lg px-3 py-2 disabled:opacity-40">
                        Previous
                      </button>
                      <button
                        disabled={page >= pages || busy}
                        onClick={() => setPage(p => p + 1)}
                        className="border rounded-lg px-3 py-2 disabled:opacity-40">
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
