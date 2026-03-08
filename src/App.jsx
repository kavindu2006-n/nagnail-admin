import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Dropshippers from "./pages/Dropshippers";
import DropshipOrders from "./pages/DropshipOrders";
import Payouts from "./pages/Payouts";
import Orders from "./pages/Orders";
import Products from "./pages/Products";
import Users from "./pages/Users";
import Categories from "./pages/Categories";
import useAuthStore from "./store/authStore";

function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuthStore();
  return isLoggedIn ? children : <Navigate to="/login" />;
}
function GuestRoute({ children }) {
  const { isLoggedIn } = useAuthStore();
  return !isLoggedIn ? children : <Navigate to="/dashboard" />;
}
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/dropshippers" element={<ProtectedRoute><Dropshippers /></ProtectedRoute>} />
        <Route path="/dropship-orders" element={<ProtectedRoute><DropshipOrders /></ProtectedRoute>} />
        <Route path="/payouts" element={<ProtectedRoute><Payouts /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
        <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
