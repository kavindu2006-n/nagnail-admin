import { useEffect, useState } from "react";
import API from "../api/config";
import Layout from "../components/Layout";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await API.get("/users");
      if (res.data.success) setUsers(res.data.users);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filtered = users.filter((u) =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="mb-6">
        <h2 className="text-2xl font-black text-gray-800">Customers</h2>
        <p className="text-gray-500 text-sm mt-1">{users.length} total customers</p>
      </div>
      <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or email..."
        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#16a34a] text-sm mb-6" />
      {loading ? (
        <div className="text-center py-20"><div className="animate-spin w-10 h-10 border-4 border-[#16a34a] border-t-transparent rounded-full mx-auto"></div></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {filtered.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#16a34a] rounded-full flex items-center justify-center text-white font-black">
                    {u.full_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{u.full_name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">{u.phone || "No phone"}</p>
                  <p className="text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString("en-LK")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
