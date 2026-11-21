import { lazy, Suspense } from "react"; // NN-C1 lazy routes
import Layout from "./components/Layout";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Dropshippers = lazy(() => import("./pages/Dropshippers"));
const DropnailInvitations = lazy(() => import("./pages/DropnailInvitations")); // NN-INVITES-RESTORE
const Sellers = lazy(() => import("./pages/Sellers"));
const DropshipOrders = lazy(() => import("./pages/DropshipOrders"));
const Payouts = lazy(() => import("./pages/Payouts"));
const Orders = lazy(() => import("./pages/Orders"));
const CodRisk = lazy(() => import("./pages/CodRisk"));
const DropnailInsights = lazy(() => import("./pages/DropnailInsights"));
const Products = lazy(() => import("./pages/Products"));
const SeoDashboard = lazy(() => import("./pages/SeoDashboard"));
const Users = lazy(() => import("./pages/Users"));
const Tickets = lazy(() => import("./pages/Tickets"));
const Categories = lazy(() => import("./pages/Categories"));
const FlashSales = lazy(() => import("./pages/FlashSales"));
const PromoCodes = lazy(() => import("./pages/PromoCodes"));
const Bundles = lazy(() => import("./pages/Bundles"));
const Reviews = lazy(() => import("./pages/Reviews"));
const FakeReviews = lazy(() => import("./pages/FakeReviews"));
const SpinWheel = lazy(() => import("./pages/SpinWheel"));
const AIReviewGenerator = lazy(() => import("./pages/AIReviewGenerator"));
const Brands = lazy(() => import("./pages/Brands"));
const Loyalty = lazy(() => import("./pages/Loyalty"));
const BlogPosts = lazy(() => import("./pages/BlogPosts"));
const AbandonedCarts = lazy(() => import("./pages/AbandonedCarts"));
const WinBack = lazy(() => import("./pages/WinBack")); // NN-B4
const WhatsAppCenter = lazy(() => import("./pages/WhatsAppCenter"));
const QA = lazy(() => import("./pages/QA"));
const Reports = lazy(() => import("./pages/Reports"));
const DropshipperFinance = lazy(() => import("./pages/DropshipperFinance")); // NN-DROPSHIPPER-FINANCE-V1
const ReturnCenter = lazy(() => import("./pages/ReturnCenter")); // NN-RETURN-CENTER-REACT-V1
const LowStock = lazy(() => import("./pages/LowStock"));
const BulkImport = lazy(() => import("./pages/BulkImport"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const PackStation = lazy(() => import("./pages/PackStation"));
const Suppliers = lazy(() => import("./pages/Suppliers"));
const Purchases = lazy(() => import("./pages/Purchases"));
const Warehouse = lazy(() => import("./pages/Warehouse"));
const Packaging = lazy(() => import("./pages/Packaging"));
const Expenses = lazy(() => import("./pages/Expenses"));
import useAuthStore from "./store/authStore";
import ManualOrder from "./pages/ManualOrder";

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
      <Suspense fallback={<div style={{ padding: 48, textAlign: "center", color: "#94a3b8", fontFamily: "sans-serif" }}>Loading…</div>}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/dropshippers" element={<ProtectedRoute><Dropshippers /></ProtectedRoute>} />
        <Route path="/dropnail-invitations" element={<ProtectedRoute><DropnailInvitations /></ProtectedRoute>} />
        <Route path="/sellers" element={<ProtectedRoute><Sellers /></ProtectedRoute>} />
        <Route path="/dropship-orders" element={<ProtectedRoute><DropshipOrders /></ProtectedRoute>} />
        <Route path="/payouts" element={<ProtectedRoute><Payouts /></ProtectedRoute>} />
        <Route path="/dropnail-insights" element={<ProtectedRoute><DropnailInsights /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
        <Route path="/manual-order" element={<ProtectedRoute><ManualOrder /></ProtectedRoute>} />
        <Route path="/cod-risk" element={<ProtectedRoute><CodRisk /></ProtectedRoute>} />
        <Route path="/seo-dashboard" element={<ProtectedRoute><SeoDashboard /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute><Layout><Products /></Layout></ProtectedRoute>} />
        <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute><Users /></ProtectedRoute>} />
        <Route path="/tickets" element={<ProtectedRoute><Tickets /></ProtectedRoute>} />
        <Route path="/flash-sales" element={<ProtectedRoute><FlashSales /></ProtectedRoute>} />
        <Route path="/promo-codes" element={<ProtectedRoute><PromoCodes /></ProtectedRoute>} />
        <Route path="/bundles" element={<ProtectedRoute><Bundles /></ProtectedRoute>} />
        <Route path="/reviews" element={<ProtectedRoute><Reviews /></ProtectedRoute>} />
        <Route path="/fake-reviews" element={<ProtectedRoute><FakeReviews /></ProtectedRoute>} />
        <Route path="/ai-reviews" element={<ProtectedRoute><AIReviewGenerator /></ProtectedRoute>} />
        <Route path="/spin-wheel" element={<ProtectedRoute><SpinWheel /></ProtectedRoute>} />
        <Route path="/brands" element={<ProtectedRoute><Brands /></ProtectedRoute>} />
        <Route path="/loyalty" element={<ProtectedRoute><Loyalty /></ProtectedRoute>} />
        <Route path="/blog" element={<ProtectedRoute><BlogPosts /></ProtectedRoute>} />
        <Route path="/abandoned-carts" element={<ProtectedRoute><AbandonedCarts /></ProtectedRoute>} />
        <Route path="/win-back" element={<ProtectedRoute><WinBack /></ProtectedRoute>} />
        <Route path="/whatsapp" element={<ProtectedRoute><WhatsAppCenter /></ProtectedRoute>} />
        <Route path="/qa" element={<ProtectedRoute><QA /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/return-center" element={<ProtectedRoute><ReturnCenter /></ProtectedRoute>} />
        <Route path="/dropshipper-finance" element={<ProtectedRoute><DropshipperFinance /></ProtectedRoute>} />
        <Route path="/low-stock" element={<ProtectedRoute><LowStock /></ProtectedRoute>} />
        <Route path="/bulk-import" element={<ProtectedRoute><BulkImport /></ProtectedRoute>} />
        <Route path="/admin-users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
        <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
        <Route path="/purchases" element={<ProtectedRoute><Purchases /></ProtectedRoute>} />
        <Route path="/warehouse" element={<ProtectedRoute><Warehouse /></ProtectedRoute>} />
        <Route path="/pack" element={<ProtectedRoute><Layout><PackStation /></Layout></ProtectedRoute>} />
        <Route path="/packaging" element={<ProtectedRoute><Packaging /></ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
