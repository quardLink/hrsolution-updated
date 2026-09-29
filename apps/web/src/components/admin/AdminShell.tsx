import type { ReactNode } from "react";
import { Link } from "wouter";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
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
  Smartphone,
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import PoweredBy from "@/components/PoweredBy";
import ThemeToggle from "@/components/ThemeToggle";
import GlassBackdrop from "@/components/GlassBackdrop";

export type AdminView =
  | "today"
  | "rankings"
  | "summary"
  | "employees"
  | "leave"
  | "payroll"
  | "remoteRequests"
  | "settings";

interface NavItem {
  id: AdminView;
  labelKey:
    | "nav.today"
    | "nav.rankings"
    | "nav.records"
    | "nav.payroll"
    | "nav.employees"
    | "nav.leave"
    | "nav.remoteRequests"
    | "nav.settings";
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
      { id: "remoteRequests", labelKey: "nav.remoteRequests", icon: Smartphone },
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

// On a phone, the sidebar is a full-screen drawer over the page (not a
// permanent rail) — picking a nav item must close it, or the drawer is
// left covering the content with no visible way back in (SidebarMenuButton
// itself has no such behavior baked in, since on desktop there's no
// drawer to close). Only used for items that switch the view in place;
// the footer's Kiosk/Sign Out links navigate away entirely, which already
// unmounts this component.
function NavMenuButton({
  isActive,
  onClick,
  tooltip,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  tooltip: string;
  children: ReactNode;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <SidebarMenuButton
      isActive={isActive}
      tooltip={tooltip}
      onClick={() => {
        onClick();
        if (isMobile) setOpenMobile(false);
      }}
      // The active look comes entirely from the animated pill below now,
      // not the button's own static active background — without turning
      // that off here, switching items would show the old flat highlight
      // snapping on underneath the pill sliding in on top of it.
      className="relative data-[active=true]:bg-transparent data-[active=true]:border-transparent"
    >
      {isActive && (
        <motion.div
          layoutId="nav-active-pill"
          className="absolute inset-0 rounded-lg bg-sidebar-primary/15 border border-sidebar-primary/30 -z-10"
          transition={{ type: "spring", stiffness: 500, damping: 38, mass: 0.6 }}
        />
      )}
      {children}
    </SidebarMenuButton>
  );
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
      <GlassBackdrop />

      <Sidebar side={dir === "rtl" ? "right" : "left"} collapsible="icon" variant="floating">
        <SidebarHeader className="mb-2">
          <div className="flex items-center gap-3 py-2 min-w-0 group-data-[collapsible=icon]:justify-center">
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
          <LayoutGroup id="admin-nav">
            {NAV_GROUPS.map((group, i) => (
              <div key={i}>
                <SidebarGroup>
                  <SidebarGroupLabel>{t(group.groupLabelKey)}</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => (
                        <SidebarMenuItem key={item.id}>
                          <NavMenuButton isActive={view === item.id} onClick={() => onViewChange(item.id)} tooltip={t(item.labelKey)}>
                            <item.icon />
                            <span>{t(item.labelKey)}</span>
                          </NavMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
                {i < NAV_GROUPS.length - 1 && <SidebarSeparator className="opacity-40" />}
              </div>
            ))}
          </LayoutGroup>
        </SidebarContent>

        <SidebarFooter className="pt-2">
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

      <SidebarInset className="z-10 bg-transparent">
        <header className="sticky top-0 z-20 flex items-center gap-2 h-14 px-4 lg:px-6">
          <div className="rounded-full bg-secondary/60 dark:bg-secondary/35 glass shadow-lg shadow-black/5 dark:shadow-black/30 p-1">
            <SidebarTrigger className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10" />
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1 rounded-full bg-secondary/60 dark:bg-secondary/35 glass shadow-lg shadow-black/5 dark:shadow-black/30 p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={loading}
              title={t("common.refresh")}
              className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
            >
              <RefreshCw className={loading ? "animate-spin" : ""} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onTestSound}
              title={t("common.testSound")}
              className="hidden sm:inline-flex h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
            >
              <Volume2 />
            </Button>
            <ThemeToggle className="h-9 w-9 rounded-full hover:text-primary hover:bg-primary/10" />
          </div>
        </header>

        <main className="flex-1 w-full px-4 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="space-y-5 lg:space-y-6"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
        <PoweredBy />
      </SidebarInset>
    </SidebarProvider>
  );
}
