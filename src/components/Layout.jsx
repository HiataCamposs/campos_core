import { useState, useEffect } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { version as APP_VERSION } from "../../package.json";
import {
  BottomTabsProvider,
  useBottomTabs,
} from "../contexts/BottomTabsContext";
import {
  Home,
  Snowflake,
  Package,
  Zap,
  Car,
  Bell,
  Menu,
  X,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "Início", icon: Home, end: true },
  { to: "/gelo", label: "Gelo", icon: Snowflake },
  { to: "/revenda", label: "Revenda", icon: Package },
  { to: "/reposicao", label: "Reposição", icon: Zap },
  { to: "/veiculos", label: "Veículos", icon: Car },
  { to: "/agendamentos", label: "Agendamentos", icon: Bell },
];

function BottomBar() {
  const { tabs } = useBottomTabs();
  if (!tabs) return null;
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-surface border-t border-border-custom z-50">
      {tabs}
    </nav>
  );
}

function LayoutInner() {
  const { user, signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = () => setDrawerOpen(false);

  // Block body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-bg overscroll-none">
      {/* ── Header ── */}
      <header className="bg-surface border-b border-border-custom sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-2 -ml-2 rounded-lg hover:bg-surface-alt text-text-secondary hover:text-text-primary transition-colors md:hidden"
            >
              <Menu size={20} />
            </button>
            <img
              src="https://atxpazzxrnbmxepilmnq.supabase.co/storage/v1/object/public/src/campos_core_logo.png"
              alt="Campos Core"
              className="h-8 max-w-[120px] rounded-lg object-contain"
            />
          </div>
          {user && (
            <span className="hidden md:inline text-sm text-text-secondary truncate max-w-[180px]">
              {user.email}
            </span>
          )}
        </div>
      </header>

      {/* ── Drawer overlay ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[60] md:hidden touch-none"
          onClick={closeDrawer}
          onTouchMove={(e) => e.preventDefault()}
        />
      )}

      {/* ── Drawer ── */}
      <aside
        className={`fixed left-0 top-0 bottom-0 w-64 bg-surface border-r border-border-custom z-[60] flex flex-col transition-transform duration-200 ease-in-out md:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-border-custom">
          <img
            src="https://atxpazzxrnbmxepilmnq.supabase.co/storage/v1/object/public/src/campos_core_logo.png"
            alt="Campos Core"
            className="h-8 max-w-[120px] rounded-lg object-contain"
          />
          <button
            onClick={closeDrawer}
            className="p-2 -mr-2 rounded-lg hover:bg-surface-alt text-text-secondary hover:text-text-primary transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeDrawer}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary-50 text-primary-600"
                    : "text-text-secondary hover:bg-surface-alt hover:text-text-primary"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        {user && (
          <div className="border-t border-border-custom p-4 space-y-3">
            <p className="text-xs text-text-disabled truncate">{user.email}</p>
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  closeDrawer();
                  signOut();
                }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:bg-surface-alt hover:text-error transition-colors"
              >
                <LogOut size={18} />
                Sair
              </button>
              <span className="text-[11px] text-text-disabled/40">
                v{APP_VERSION}
              </span>
            </div>
          </div>
        )}
      </aside>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex fixed left-0 top-14 bottom-0 w-56 bg-surface border-r border-border-custom flex-col z-30">
        <nav className="space-y-1 flex-1 py-4 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary-50 text-primary-600"
                    : "text-text-secondary hover:bg-surface-alt hover:text-text-primary"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        {user && (
          <div className="border-t border-border-custom p-4">
            <p className="text-xs text-text-disabled truncate mb-2">
              {user.email}
            </p>
            <button
              onClick={signOut}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:bg-surface-alt hover:text-error transition-colors"
            >
              <LogOut size={18} />
              Sair
            </button>
          </div>
        )}
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 pb-24 md:pb-6 md:ml-56">
        <Outlet />
      </main>

      {/* ── Bottom bar (page tabs) ── */}
      <BottomBar />
    </div>
  );
}

export default function Layout() {
  return (
    <BottomTabsProvider>
      <LayoutInner />
    </BottomTabsProvider>
  );
}
