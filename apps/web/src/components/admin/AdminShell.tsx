import { useState, type ReactNode } from "react";
import { Link } from "wouter";

export type AdminView =
  | "today"
  | "rankings"
  | "summary"
  | "employees"
  | "leave"
  | "payroll"
  | "settings";

interface NavItem {
  id: AdminView;
  label: string;
  icon: string;
  group?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "today", label: "Today", icon: "🏠", group: "Overview" },
  { id: "rankings", label: "Rankings", icon: "🏆", group: "Reports" },
  { id: "summary", label: "Attendance Records", icon: "📊", group: "Reports" },
  { id: "employees", label: "Employees", icon: "👥", group: "Manage" },
  { id: "leave", label: "Leave Requests", icon: "🏖️", group: "Manage" },
  { id: "payroll", label: "Payroll", icon: "💰", group: "Reports" },
  { id: "settings", label: "Settings", icon: "⚙️", group: "Manage" },
];

interface Props {
  view: AdminView;
  onViewChange: (v: AdminView) => void;
  onLogout: () => void;
  onRefresh: () => void;
  onTestSound: () => void;
  loading?: boolean;
  children: ReactNode;
}

export default function AdminShell({
  view,
  onViewChange,
  onLogout,
  onRefresh,
  onTestSound,
  loading,
  children,
}: Props) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const current = NAV_ITEMS.find((n) => n.id === view) ?? NAV_ITEMS[0];

  const groups = NAV_ITEMS.reduce<Record<string, NavItem[]>>((acc, item) => {
    const g = item.group ?? "Other";
    if (!acc[g]) acc[g] = [];
    acc[g].push(item);
    return acc;
  }, {});

  function handleNavClick(id: AdminView) {
    onViewChange(id);
    setMobileNavOpen(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-[#1f2937] text-gray-200 flex flex-col z-40 transition-transform duration-200 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo / brand */}
        <div className="px-5 py-4 border-b border-gray-700/60 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center p-1 flex-shrink-0">
            <img src="/logo.jpg" alt="PST Logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-white text-sm truncate">Petro Safe Tech</div>
            <div className="text-xs text-gray-400 truncate">Attendance Admin</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} className="mb-4">
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                {group}
              </div>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = view === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-gray-700/60 hover:text-white"
                      }`}
                    >
                      <span className="text-base w-5 text-center">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer / logout */}
        <div className="p-3 border-t border-gray-700/60 space-y-1">
          <Link
            href="/"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700/60 hover:text-white"
          >
            <span className="text-base w-5 text-center">🏠</span>
            <span>Attendance App</span>
          </Link>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-300 hover:bg-red-900/30 hover:text-red-200"
          >
            <span className="text-base w-5 text-center">🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 -ml-2 text-gray-700 hover:bg-gray-100 rounded-lg flex-shrink-0"
              aria-label="Open menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-base lg:text-lg font-semibold text-gray-900 truncate flex items-center gap-2">
                <span className="hidden sm:inline">{current.icon}</span>
                <span className="truncate">{current.label}</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              title="Refresh data"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? "animate-spin" : ""}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            </button>
            <button
              onClick={onTestSound}
              className="hidden sm:inline-flex p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              title="Test sound"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </button>
          </div>
        </header>

        {/* Page body */}
        <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto space-y-4 lg:space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
