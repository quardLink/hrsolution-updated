import type { ReactNode } from "react";
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
  group: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: "today", label: "Today", icon: "🏠", group: 0 },
  { id: "rankings", label: "Rankings", icon: "🏆", group: 1 },
  { id: "summary", label: "Records", icon: "📊", group: 1 },
  { id: "payroll", label: "Payroll", icon: "💰", group: 1 },
  { id: "employees", label: "Employees", icon: "👥", group: 2 },
  { id: "leave", label: "Leave", icon: "🏖️", group: 2 },
  { id: "settings", label: "Settings", icon: "⚙️", group: 2 },
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
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 lg:px-6">
          <div className="h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center p-1 flex-shrink-0">
                <img src="/logo.jpg" alt="PST Logo" className="w-full h-full object-contain" />
              </div>
              <span className="font-semibold text-foreground text-sm truncate">Petro Safe Tech</span>
            </div>

            <div className="flex items-center gap-0.5">
              <button
                onClick={onRefresh}
                disabled={loading}
                className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg disabled:opacity-50"
                title="Refresh data"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? "animate-spin" : ""}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              </button>
              <button
                onClick={onTestSound}
                className="hidden sm:inline-flex p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg"
                title="Test sound"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </button>
              <div className="w-px h-5 bg-border mx-1.5" />
              <Link
                href="/"
                className="hidden sm:inline-flex items-center px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
              >
                Kiosk
              </Link>
              <button
                onClick={onLogout}
                className="px-2.5 py-1.5 text-sm text-red-400 hover:bg-destructive/10 hover:text-red-300 rounded-lg"
              >
                Sign Out
              </button>
            </div>
          </div>

          <nav className="flex items-center gap-1 overflow-x-auto overflow-y-hidden -mx-4 px-4 lg:mx-0 lg:px-0">
            {NAV_ITEMS.map((item, i) => {
              const active = view === item.id;
              const prevGroup = i > 0 ? NAV_ITEMS[i - 1].group : item.group;
              return (
                <span key={item.id} className="flex items-center">
                  {item.group !== prevGroup && <span className="w-px h-4 bg-border mx-2" />}
                  <button
                    onClick={() => onViewChange(item.id)}
                    className={`relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                      active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="text-xs">{item.icon}</span>
                    <span>{item.label}</span>
                    {active && (
                      <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full" />
                    )}
                  </button>
                </span>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl w-full mx-auto px-4 lg:px-6 py-6 lg:py-8 space-y-4 lg:space-y-6">
        {children}
      </main>
    </div>
  );
}
