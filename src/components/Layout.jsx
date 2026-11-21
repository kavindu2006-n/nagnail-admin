import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ShoppingBag, Package, Truck, Layers, Users,
  DollarSign, FileText, LogOut, Menu, ChevronDown, Search, X,
  Store, Warehouse, Box, CreditCard, PieChart, ShoppingCart, Tag, Star, ShieldAlert, Sparkles, HelpCircle, AlertTriangle, Upload, Zap, Gift, Disc, Award, Ticket, UserCog, MessageCircle,
  Megaphone, Factory, Settings, Pin, PinOff, PanelLeftOpen } from "lucide-react";
import useAuthStore from "../store/authStore";

// NN-SIDEBAR-GROUPS
const NAV_GROUPS = [
  { id: "orders", label: "Orders", icon: ShoppingBag, items: [
    { path: "/orders", label: "NagNail Orders", icon: ShoppingBag },
    { path: "/manual-order", label: "Manual Order", icon: ShoppingBag },
    { path: "/abandoned-carts", label: "Abandoned Carts", icon: ShoppingCart },
    { path: "/win-back", label: "Win-back", icon: ShoppingCart },
    { path: "/pack", label: "Packing Station", icon: Package },
    { path: "/dropship-orders", label: "Dropship Orders", icon: Truck },
    { path: "/return-center", label: "Return Center", icon: Truck },
    { path: "/dropshipper-finance", label: "Dropshipper Finance", icon: DollarSign },
    { path: "/cod-risk", label: "COD Risk & Blacklist", icon: ShieldAlert },
  ]},
  { id: "products", label: "Products", icon: Layers, items: [
    { path: "/products", label: "Products Catalog", icon: Layers },
    { path: "/seo-dashboard", label: "SEO Management", icon: Search },
    { path: "/categories", label: "Categories", icon: Box },
    { path: "/brands", label: "Brands", icon: Tag },
    { path: "/low-stock", label: "Low Stock Alerts", icon: AlertTriangle },
    { path: "/bulk-import", label: "Bulk Import", icon: Upload },
  ]},
  { id: "marketing", label: "Marketing", icon: Megaphone, items: [
    { path: "/flash-sales", label: "Flash Sales", icon: Zap },
    { path: "/promo-codes", label: "Promo Codes", icon: Gift },
    { path: "/bundles", label: "Bundle Deals", icon: Gift },
    { path: "/spin-wheel", label: "Spin Wheel", icon: Disc },
    { path: "/loyalty", label: "Loyalty Program", icon: Award },
    { path: "/blog", label: "Blog Posts", icon: FileText },
  ]},
  { id: "reviews", label: "Reviews & Q&A", icon: Star, items: [
    { path: "/reviews", label: "Reviews", icon: Star },
    { path: "/fake-reviews", label: "Fake Review Detector", icon: ShieldAlert },
    { path: "/ai-reviews", label: "AI Review Generator", icon: Sparkles },
    { path: "/qa", label: "Product Q&A", icon: HelpCircle },
  ]},
  { id: "customers", label: "Customers & Sellers", icon: Users, items: [
    { path: "/whatsapp", label: "WhatsApp Center", icon: MessageCircle },
    { path: "/tickets", label: "Tickets", icon: Ticket },
    { path: "/users", label: "Users", icon: Users },
    { path: "/sellers", label: "Sellers", icon: Store },
    { path: "/dropshippers", label: "Dropshippers", icon: Truck },
    { path: "/dropnail-invitations", label: "WhatsApp Invites", icon: MessageCircle }, // NN-INVITES-RESTORE
    { path: "/payouts", label: "Payouts", icon: DollarSign },
    { path: "/dropnail-insights", label: "DropNail Insights", icon: DollarSign }, // NN-DS-TIER
  ]},
  { id: "erp", label: "ERP & Finance", icon: Factory, items: [
    { path: "/suppliers", label: "Suppliers", icon: Store },
    { path: "/purchases", label: "Purchases & POs", icon: ShoppingBag },
    { path: "/warehouse", label: "Warehouse Stock", icon: Warehouse },
    { path: "/packaging", label: "Packaging Materials", icon: Box },
    { path: "/expenses", label: "Expenses & Capital", icon: CreditCard },
    { path: "/reports", label: "Financial Reports", icon: PieChart },
  ]},
  { id: "settings", label: "Settings", icon: Settings, items: [
    { path: "/admin-users", label: "Admin Users", icon: UserCog },
  ]},
];
const DASH = { path: "/", label: "Dashboard", icon: LayoutDashboard };
const STORE_KEY = "nn_sidebar_groups";

const isOn = (pathname, path) => path === "/" ? pathname === "/" : (pathname === path || pathname.startsWith(path + "/"));

// NN-MODERN-SIDEBAR-V4: standalone responsive navigation, keeps existing routes.
const PIN_KEY = "nn_sidebar_pinned";
const mediaMobile = () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
const savedPin = () => {
  try { return localStorage.getItem(PIN_KEY) === "1"; } catch { return false; }
};

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [isMobile, setIsMobile] = useState(mediaMobile);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pinned, setPinned] = useState(savedPin);
  const [hovered, setHovered] = useState(false);
  const [query, setQuery] = useState("");
  const expanded = isMobile ? mobileOpen : (pinned || hovered);
  const [openGroups, setOpenGroups] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); }
    catch { return {}; }
  });

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = () => { setIsMobile(mq.matches); setMobileOpen(false); setHovered(false); };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setQuery("");
    const group = NAV_GROUPS.find(g => g.items.some(i => isOn(location.pathname, i.path)));
    if (group) setOpenGroups(old => old[group.id] ? old : { ...old, [group.id]: true });
  }, [location.pathname]);

  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(openGroups)); } catch {}
  }, [openGroups]);

  useEffect(() => {
    if (!isMobile || !mobileOpen) return;
    const onKeyDown = e => { if (e.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobile, mobileOpen]);

  const togglePin = () => {
    setPinned(current => {
      const next = !current;
      try { localStorage.setItem(PIN_KEY, next ? "1" : "0"); } catch {}
      return next;
    });
    setHovered(false);
  };

  const toggleGroup = id => setOpenGroups(old => ({ ...old, [id]: !old[id] }));
  const closeOnNavigation = () => { setMobileOpen(false); setQuery(""); };
  const handleLogout = () => { closeOnNavigation(); logout(); navigate("/login"); };
  const q = query.trim().toLowerCase();
  const items = NAV_GROUPS.flatMap(g => g.items);
  const results = q ? [DASH, ...items].filter(i => i.label.toLowerCase().includes(q)) : [];

  const NavLink = ({ item, nested = false }) => {
    const Icon = item.icon;
    const active = isOn(location.pathname, item.path);
    return (
      <Link
        to={item.path}
        onClick={closeOnNavigation}
        title={!expanded ? item.label : undefined}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-10 items-center gap-3 rounded-xl transition-colors duration-150 ${
          expanded ? (nested ? "px-3 py-2 ml-3" : "px-3 py-2.5") : "justify-center px-2 py-3.5"
        } ${active ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
      >
        <Icon className={`h-5 w-5 shrink-0 ${active ? "text-white" : "text-slate-400"}`} />
        {expanded && <span className="min-w-0 truncate text-sm font-medium">{item.label}</span>}
      </Link>
    );
  };

  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-slate-50 font-sans">
      {isMobile && mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 md:hidden"
        />
      )}

      <aside
        aria-label="Main navigation"
        onMouseEnter={() => { if (!isMobile) setHovered(true); }}
        onMouseLeave={() => { if (!isMobile) setHovered(false); }}
        className={`flex h-full min-h-0 shrink-0 flex-col overflow-hidden bg-slate-950 text-slate-200 transition-[width,transform] duration-200 ease-out ${
          isMobile
            ? `fixed inset-y-0 left-0 z-50 w-72 shadow-2xl ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`
            : `relative z-30 ${expanded ? "w-[272px]" : "w-[76px]"}`
        }`}
      >
        <div className={`flex h-16 shrink-0 items-center border-b border-slate-800/80 ${expanded ? "justify-between px-4" : "justify-center"}`}>
          <Link to="/" onClick={closeOnNavigation} title="NagNail ERP" className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-sm font-black text-white">NN</span>
            {expanded && <span className="truncate text-base font-bold tracking-tight text-white">NagNail <span className="text-indigo-300">ERP</span></span>}
          </Link>
          {isMobile && expanded && (
            <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close sidebar" className="rounded-lg p-2 text-slate-300 hover:bg-slate-800"><X className="h-5 w-5" /></button>
          )}
          {!isMobile && expanded && (
            <button type="button" onClick={togglePin} title={pinned ? "Unpin sidebar" : "Keep sidebar open"} aria-label={pinned ? "Unpin sidebar" : "Pin sidebar"} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
              {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </button>
          )}
        </div>

        {expanded && (
          <div className="shrink-0 px-3 pt-4 pb-2">
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && results[0]) { navigate(results[0].path); closeOnNavigation(); } if (e.key === "Escape") setQuery(""); }}
                placeholder="Search menu..."
                aria-label="Search navigation"
                className="min-w-0 w-full bg-transparent text-sm text-white placeholder-slate-500 outline-none"
              />
              {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>}
            </div>
          </div>
        )}

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-4 [scrollbar-width:thin]" aria-label="ERP pages">
          {q && expanded ? (
            results.length > 0
              ? results.map(item => <NavLink key={item.path} item={item} />)
              : <p className="px-3 py-4 text-xs text-slate-500">No matching pages</p>
          ) : (
            <>
              <NavLink item={DASH} />
              {NAV_GROUPS.map(group => {
                const Icon = group.icon;
                const active = group.items.some(i => isOn(location.pathname, i.path));
                const open = !!openGroups[group.id];
                return (
                  <div key={group.id} className="pt-1">
                    {expanded ? (
                      <>
                        <button
                          type="button"
                          aria-expanded={open}
                          onClick={() => toggleGroup(group.id)}
                          className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${active ? "bg-slate-800/80 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}
                        >
                          <Icon className={`h-5 w-5 shrink-0 ${active ? "text-indigo-300" : "text-slate-400"}`} />
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{group.label}</span>
                          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
                        </button>
                        {open && <div className="space-y-0.5 pt-1">{group.items.map(item => <NavLink key={item.path} item={item} nested />)}</div>}
                      </>
                    ) : (
                      <button
                        type="button"
                        title={group.label}
                        aria-label={`Expand ${group.label}`}
                        onClick={() => { setHovered(true); setOpenGroups(old => ({ ...old, [group.id]: true })); }}
                        className={`flex min-h-11 w-full items-center justify-center rounded-xl py-1 transition-colors ${active ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
                      ><Icon className="h-5 w-5" /></button>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </nav>

        <div className={`shrink-0 border-t border-slate-800/80 p-3 ${expanded ? "flex items-center gap-2" : "flex justify-center"}`}>
          {expanded && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{user?.email || "Admin"}</p>
              <p className="mt-0.5 truncate text-[10px] uppercase tracking-wide text-slate-500">{user?.role || "Admin"}</p>
            </div>
          )}
          <button type="button" title="Logout" aria-label="Logout" onClick={handleLogout} className="rounded-xl p-2.5 text-slate-400 hover:bg-rose-950 hover:text-rose-300"><LogOut className="h-5 w-5" /></button>
        </div>
      </aside>

      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 shadow-sm sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => isMobile ? setMobileOpen(open => !open) : togglePin()}
              aria-label={isMobile ? "Open navigation" : (pinned ? "Unpin sidebar" : "Pin sidebar")}
              title={isMobile ? "Open navigation" : (pinned ? "Unpin sidebar" : "Pin sidebar")}
              className="rounded-xl p-2.5 text-slate-600 transition hover:bg-slate-100 hover:text-indigo-600"
            >
              {isMobile ? <Menu className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
            </button>
            <span className="truncate text-sm font-bold tracking-wide text-slate-800">NagNail ERP <span className="hidden text-slate-400 sm:inline">/ Admin</span></span>
          </div>
          <span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 sm:inline">● System Active</span>
        </header>
        <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-slate-50">{children}</main>
      </div>
    </div>
  );
}
