import type { ReactNode } from "react";
import { Link } from "wouter";
import {
  Home,
  Trophy,
  BarChart3,
  Wallet,
  Users,
  CalendarDays,
  Settings,
  RefreshCw,
  Volume2,
  LogOut,
  Monitor,
  Languages,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import PoweredBy from "@/components/PoweredBy";
import ThemeToggle from "@/components/ThemeToggle";

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
  labelKey: "nav.today" | "nav.rankings" | "nav.records" | "nav.payroll" | "nav.employees" | "nav.leave" | "nav.settings";
  icon: typeof Home;
}

interface NavGroup {
  groupLabelKey: "nav.groupOverview" | "nav.groupReports" | "nav.groupManage";
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  { groupLabelKey: "nav.groupOverview", items: [{ id: "today", labelKey: "nav.today", icon: Home }] },
  {
    groupLabelKey: "nav.groupReports",
    items: [
      { id: "rankings", labelKey: "nav.rankings", icon: Trophy },
      { id: "summary", labelKey: "nav.records", icon: BarChart3 },
      { id: "payroll", labelKey: "nav.payroll", icon: Wallet },
    ],
  },
  {
    groupLabelKey: "nav.groupManage",
    items: [
      { id: "employees", labelKey: "nav.employees", icon: Users },
      { id: "leave", labelKey: "nav.leave", icon: CalendarDays },
      { id: "settings", labelKey: "nav.settings", icon: Settings },
    ],
  },
];

interface Props {
  view: AdminView;
  onViewChange: (v: AdminView) => void;
  onLogout: () => void;
  onRefresh: () => void;
  onTestSound: () => void;
  loading?: boolean;
  orgName?: string;
  logoDataUrl?: string | null;
  children: ReactNode;
}

export default function AdminShell({
  view,
  onViewChange,
  onLogout,
  onRefresh,
  onTestSound,
  loading,
  orgName,
  logoDataUrl,
  children,
}: Props) {
  const { t, locale, setLocale, dir } = useLocale();

  return (
    <SidebarProvider>
      <Sidebar side={dir === "rtl" ? "right" : "left"} collapsible="icon" variant="floating">
        <SidebarHeader className="border-b border-sidebar-border/70 mb-1">
          <div className="flex items-center gap-3 px-2 py-2 min-w-0">
            {logoDataUrl ? (
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center p-1 shrink-0 shadow-sm">
                <img src={logoDataUrl} alt="" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0 shadow-sm">
                {(orgName || "F")[0].toUpperCase()}
              </div>
            )}
            <span className="font-semibold text-sm truncate group-data-[collapsible=icon]:hidden">
              {orgName || "Your Firm"}
            </span>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {NAV_GROUPS.map((group, i) => (
            <div key={i}>
              <SidebarGroup>
                <SidebarGroupLabel>{t(group.groupLabelKey)}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          isActive={view === item.id}
                          onClick={() => onViewChange(item.id)}
                          tooltip={t(item.labelKey)}
                        >
                          <item.icon />
                          <span>{t(item.labelKey)}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              {i < NAV_GROUPS.length - 1 && <SidebarSeparator />}
            </div>
          ))}
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border/70 pt-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setLocale(locale === "en" ? "ar" : "en")}
                tooltip={t("common.language")}
              >
                <Languages />
                <span>{locale === "en" ? "العربية" : "English"}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={t("nav.kiosk")}>
                <Link href="/">
                  <Monitor />
                  <span>{t("nav.kiosk")}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={onLogout}
                tooltip={t("nav.signOut")}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut />
                <span>{t("nav.signOut")}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-20 flex items-center gap-2 h-14 px-4 lg:px-6 border-b border-border bg-background/80 backdrop-blur-md">
          <SidebarTrigger className="-ms-1 rounded-full" />
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={loading}
            title={t("common.refresh")}
            className="rounded-full bg-secondary/70 text-muted-foreground"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onTestSound}
            title={t("common.testSound")}
            className="hidden sm:inline-flex rounded-full bg-secondary/70 text-muted-foreground"
          >
            <Volume2 />
          </Button>
          <ThemeToggle className="rounded-full bg-secondary/70" />
        </header>

        <main className="flex-1 w-full px-4 lg:px-8 py-6 lg:py-8 space-y-5 lg:space-y-6 max-w-7xl mx-auto">
          {children}
        </main>
        <PoweredBy />
      </SidebarInset>
    </SidebarProvider>
  );
}
