
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import API from "../api/config";
import Layout from "../components/Layout";
import {
  MessageCircle, RefreshCw, ArrowLeft, Search
} from "lucide-react";

// NN-DROPNAIL-INVITES-V2-FINAL

const filters = [
  ["all", "All Sellers"],
  ["pending", "Pending"],
  ["sent", "Sent"],
  ["contacted", "Contacted"],
  ["joined", "Joined"],
  ["review", "Review Needed"],
  ["opted_out", "Opted Out"]
];

const labels = {
  pending: "Pending invitation",
  sent: "WhatsApp send recorded",
  contacted: "Manually contacted",
  joined: "Joined — self-reported",
  review: "Review send attempt",
  opted_out: "Opted out — do not contact"
};

const dateText = value =>
  value ? new Date(value).toLocaleString("en-LK") : "—";

export default function DropnailInvitations() {
  const [sellers, setSellers] = useState([]);
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await API.get(
        "/dropnail/invitations/v2",
        { params: { page, limit, q: query, status } }
      );

      if (!res.data?.success) {
        throw new Error("Invitation API failed");
      }

      setSellers(res.data.sellers || []);
      setStats(res.data.stats || null);
      setTotal(Number(res.data.total || 0));
    } catch (err) {
      setSellers([]);
      setError(
        err.response?.data?.error ||
        err.message ||
        "Unable to load invitations"
      );
    } finally {
      setLoading(false);
    }
  }, [page, query, status]);

  useEffect(() => { load(); }, [load]);

  const update = async (seller, action) => {
    if (busy !== null || seller.status_key === "opted_out") return;

    const descriptions = {
      contacted: "Confirm this seller was actually contacted?",
      joined: "Did this seller report joining the WhatsApp group?",
      opted_out: "Stop future invitations to this seller?"
    };

    if (!window.confirm(descriptions[action])) return;

    setBusy(seller.id);
    setError("");
    setNotice("");

    try {
      const res = await API.post(
        `/dropnail/invitations/${seller.id}/status`,
        { action }
      );

      if (!res.data?.success) {
        throw new Error("Status update failed");
      }

      setNotice(
        `${seller.full_name}: ${action} recorded successfully.`
      );
      await load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setBusy(null);
    }
  };

  const changeStatus = key => {
    setStatus(key);
    setPage(1);
  };

  const cards = [
    ["Pending", stats?.pending, "pending"],
    ["Sent", stats?.sent, "sent"],
    ["Contacted", stats?.contacted, "contacted"],
    ["Joined (reported)", stats?.joined, "joined"],
    ["Review Needed", stats?.review, "review"],
    ["Opted Out", stats?.opted_out, "opted_out"],
    ["Sent Today", stats?.sent_today, null],
    ["Sent Last 7 Days", stats?.sent_last_7_days, null]
  ];

  return (
    <Layout>
      <main className="p-4 md:p-6 bg-slate-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-5">

          <Link to="/dropshippers"
            className="inline-flex items-center gap-2 text-indigo-700 text-sm font-bold">
            <ArrowLeft size={16} /> Back to Dropshippers
          </Link>

          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black">
                WhatsApp Invitation Manager V2
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Zero-order seller outreach and invitation history.
                Manual sending only.
              </p>
            </div>
            <button type="button" onClick={load}
              disabled={loading}
              className="bg-white border rounded-xl px-4 py-2 font-bold flex items-center gap-2">
              <RefreshCw size={16} /> Refresh
            </button>
          </div>

          <div className="bg-white border rounded-xl p-4">
            <p className="text-xs text-slate-500 font-bold">
              Approved Zero-Order Sellers (including opted out)
            </p>
            <p className="text-3xl font-black text-indigo-600">
              {stats?.total ?? "—"}
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {cards.map(([label, value, key]) => (
              <button key={label} type="button"
                disabled={!key}
                onClick={() => key && changeStatus(key)}
                className={`bg-white border rounded-xl p-4 text-left ${
                  key ? "hover:border-indigo-400" : ""
                } ${
                  status === key ? "ring-2 ring-indigo-500" : ""
                }`}>
                <p className="text-xs text-slate-500 font-bold">
                  {label}
                </p>
                <p className="text-2xl font-black mt-2">
                  {value ?? "—"}
                </p>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {filters.map(([key, label]) => (
              <button key={key} type="button"
                onClick={() => changeStatus(key)}
                className={`rounded-lg px-3 py-2 text-sm font-bold border ${
                  status === key
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-slate-700"
                }`}>
                {label}
              </button>
            ))}
          </div>

          <form className="flex flex-wrap gap-2"
            onSubmit={e => {
              e.preventDefault();
              setPage(1);
              setQuery(search);
            }}>
            <div className="flex-1 relative min-w-56">
              <Search size={16}
                className="absolute top-3 left-3 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name, phone or email"
                className="w-full border rounded-xl py-2.5 pl-10 pr-3 text-sm"
              />
            </div>
            <button type="submit"
              className="bg-indigo-600 text-white rounded-xl px-5 py-2 font-bold">
              Search
            </button>
          </form>

          {error && (
            <p role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="bg-green-50 text-green-700 rounded-xl p-3">
              {notice}
            </p>
          )}

          <div className="space-y-3">
            {loading ? (
              <p className="p-5 text-slate-500">Loading...</p>
            ) : sellers.length === 0 ? (
              <p className="bg-white rounded-xl p-5 text-slate-500">
                No matching sellers.
              </p>
            ) : sellers.map(s => (
              <div key={s.id}
                className="bg-white border rounded-xl p-4 flex flex-col lg:flex-row justify-between gap-4">

                <div className="min-w-0 space-y-1">
                  <p className="font-bold">{s.full_name}</p>
                  <p className="text-xs text-slate-500 break-all">
                    {s.phone || "No phone"} · {s.email || "No email"}
                  </p>
                  <p className="text-sm font-semibold text-indigo-700">
                    {labels[s.status_key] || "Unknown"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Contacted: {dateText(s.contacted_at)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Sent: {dateText(s.sent_at)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Joined (reported): {dateText(s.self_reported_joined_at)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Send state: {s.send_state || "None"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  {s.status_key === "pending" && s.whatsapp_url && (
                    <a href={s.whatsapp_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-emerald-600 text-white rounded-lg px-3 py-2 text-xs font-bold inline-flex gap-2 items-center">
                      <MessageCircle size={15} /> Open WhatsApp
                    </a>
                  )}

                  <button type="button"
                    disabled={busy !== null || s.status_key === "opted_out"}
                    onClick={() => update(s, "contacted")}
                    className="border rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-40">
                    Mark Contacted
                  </button>

                  <button type="button"
                    disabled={busy !== null || s.status_key === "opted_out"}
                    onClick={() => update(s, "joined")}
                    className="border border-green-300 text-green-700 rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-40">
                    Joined
                  </button>

                  <button type="button"
                    disabled={busy !== null || s.status_key === "opted_out"}
                    onClick={() => update(s, "opted_out")}
                    className="border border-red-300 text-red-700 rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-40">
                    Opt Out
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center">
            <button type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage(p => p - 1)}
              className="bg-white border rounded-lg px-4 py-2 disabled:opacity-40">
              Previous
            </button>
            <span className="text-sm text-slate-500">
              Page {page} / {Math.max(1, Math.ceil(total / limit))}
              {" · "}{total} matching sellers
            </span>
            <button type="button"
              disabled={page * limit >= total || loading}
              onClick={() => setPage(p => p + 1)}
              className="bg-white border rounded-lg px-4 py-2 disabled:opacity-40">
              Next
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Sent counts represent successful send records, not verified
            WhatsApp delivery. Review means an uncertain attempt.
            Joined is self-reported. Daily stats use the database
            server's date. No automatic or bulk sending is enabled.
          </p>
        </div>
      </main>
    </Layout>
  );
}
