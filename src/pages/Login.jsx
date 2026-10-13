import { useState } from "react";
import API from "../api/config";
import useAuthStore from "../store/authStore";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await API.post("/auth/login", form);
      if (res.data.success) { login(res.data.admin, res.data.token); navigate("/dashboard"); }
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#16a34a] rounded-2xl mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white">NagNail Admin</h1>
          <p className="text-gray-400 text-sm mt-1">Restricted access — admins only</p>
        </div>
        {error && <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-xl mb-4 text-sm">❌ {error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required
              placeholder="admin@nagnail.lk"
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white outline-none focus:border-[#16a34a] text-sm" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1">Password</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required
              placeholder="Enter admin password"
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white outline-none focus:border-[#16a34a] text-sm" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-[#16a34a] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#15803d] disabled:opacity-50 mt-2">
            {loading ? "Logging in..." : "Login to Admin Panel →"}
          </button>
          {import.meta.env.DEV && (
            <button type="button" onClick={() => { login({ email: "demo@nagnail.lk" }, "demo-token"); navigate("/dropship-orders"); }}
              className="w-full mt-2 bg-gray-700 text-gray-300 py-2.5 rounded-xl font-bold text-xs hover:bg-gray-600">
              🎭 Demo Login → Dropship Orders (sandbox preview)
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
