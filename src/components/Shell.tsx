import { Link, useRouterState } from "@tanstack/react-router";
import {
  Building2,
  Bell,
  CalendarClock,
  ClipboardList,
  Cog,
  DollarSign,
  LayoutDashboard,
  LogOut,
  Moon,
  PackageSearch,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Shapes,
  ShoppingCart,
  Sun,
  Tags,
  Users,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import techProLogo from "@/assets/techpro-logo.png";
import { clearNotifications, markNotificationsRead, useStore } from "@/lib/store";
import { useAuth } from "@/hooks/use-auth";
import { usePushNotifications } from "@/hooks/use-push";

const navItems = [
  { to: "/", long: "Dashboard", short: "Home", icon: LayoutDashboard },
  { to: "/tool-types", long: "Tool Types", short: "Types", icon: Shapes },
  { to: "/brand", long: "Brand", short: "Brand", icon: Tags },
  { to: "/company", long: "Company", short: "Company", icon: Building2 },
  { to: "/users", long: "Users", short: "Users", icon: Users },
  { to: "/inventory-items", long: "Inventory Items", short: "Items", icon: PackageSearch },
  { to: "/low-stock", long: "Low Stock", short: "Low Stock", icon: TriangleAlert },
  { to: "/tools-order-log", long: "Tools Order Log", short: "Orders", icon: ShoppingCart },
  { to: "/monthly-expense", long: "Monthly Expense", short: "Expense", icon: DollarSign },
  { to: "/tool-assigned-log", long: "Tool Assigned Log", short: "Log", icon: ClipboardList },
  { to: "/machine-hours", long: "Machining Hours", short: "Machining", icon: Wrench },
  { to: "/machines", long: "Machines", short: "Machines", icon: Cog },
  {
    to: "/timeliness-configuration",
    long: "Timeliness Configuration",
    short: "Timeliness",
    icon: CalendarClock,
  },
] as const;

const mobileDockItems = [navItems[0], navItems[1], navItems[5], navItems[7]] as const;
const mobileMoreItems = [
  navItems[2],
  navItems[3],
  navItems[4],
  navItems[6],
  navItems[8],
  navItems[9],
  navItems[10],
  navItems[11],
  navItems[12],
] as const;

export function Shell({
  eyebrow,
  title,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const [isNight, setIsNight] = useState(false);
  const [isMenuExpanded, setIsMenuExpanded] = useState(true);
  const { notifications } = useStore();
  const { user, signOut } = useAuth();
  const push = usePushNotifications();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isMoreActive = mobileMoreItems.some((item) => pathname === item.to);
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const formatNotificationTime = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "Just now"
      : new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
  };

  useEffect(() => {
    setIsNight(document.documentElement.classList.contains("dark"));
    setIsMenuExpanded(window.localStorage.getItem("techpro-menu") !== "minimised");
  }, []);

  const toggleTheme = () => {
    const nextIsNight = !isNight;
    document.documentElement.classList.toggle("dark", nextIsNight);
    document.documentElement.style.colorScheme = nextIsNight ? "dark" : "light";
    window.localStorage.setItem("techpro-theme", nextIsNight ? "night" : "day");
    setIsNight(nextIsNight);
  };

  const toggleMenu = () => {
    const nextIsExpanded = !isMenuExpanded;
    window.localStorage.setItem("techpro-menu", nextIsExpanded ? "expanded" : "minimised");
    setIsMenuExpanded(nextIsExpanded);
  };

  return (
    <div className="min-h-screen bg-canvas text-ink antialiased">
      <div className="relative w-full">
        <div className="relative flex min-h-screen flex-col lg:flex-row lg:gap-0">
          <aside
            className={`left-menu-glass sticky top-3 z-20 mx-3 mt-3 hidden shrink-0 overflow-hidden rounded-2xl border transition-[width] duration-300 lg:top-4 lg:my-4 lg:ml-4 lg:mr-0 lg:flex lg:h-[calc(100vh-2rem)] lg:flex-col ${isMenuExpanded ? "lg:w-60" : "lg:w-[76px]"}`}
          >
            <div
              className={`hidden h-16 items-center gap-2.5 lg:flex ${isMenuExpanded ? "px-4" : "justify-center px-2"}`}
            >
              {isMenuExpanded ? (
                <img
                  src={techProLogo}
                  alt="TechPro Industries Inc."
                  className="h-11 w-auto min-w-0 object-contain"
                />
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleMenu}
                className={`size-8 shrink-0 rounded-lg text-muted-fg hover:bg-accent-brand/10 hover:text-accent-brand ${isMenuExpanded ? "ml-auto" : ""}`}
                aria-label={isMenuExpanded ? "Minimise menu" : "Expand menu"}
                title={isMenuExpanded ? "Minimise menu" : "Expand menu"}
              >
                {isMenuExpanded ? (
                  <PanelLeftClose aria-hidden="true" />
                ) : (
                  <PanelLeftOpen aria-hidden="true" />
                )}
              </Button>
            </div>

            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    activeOptions={{ exact: item.to === "/" }}
                    className={`flex min-w-0 flex-none flex-row items-center justify-center rounded-xl border border-transparent py-2.5 text-sm font-medium text-muted-fg transition hover:border-glass-border hover:bg-panel/70 hover:text-ink ${isMenuExpanded ? "justify-start gap-3 px-3 text-left" : "px-2"}`}
                    activeProps={{
                      className:
                        "brand-gradient border-glass-border text-accent-brand-ink font-semibold shadow-lg shadow-accent-brand/30",
                    }}
                    title={!isMenuExpanded ? item.long : undefined}
                  >
                    <Icon className="size-4 shrink-0" strokeWidth={1.9} aria-hidden="true" />
                    <span className={isMenuExpanded ? "inline" : "hidden"}>{item.long}</span>
                  </Link>
                );
              })}
            </nav>

            <div
              className={`mt-auto hidden border-t border-line/60 py-4 lg:block ${isMenuExpanded ? "px-5" : "px-2 text-center"}`}
            >
              <p className="font-mono text-[11px] text-muted-fg">Warehouse · Toronto</p>
            </div>
          </aside>

          <main className="relative min-w-0 flex-1 pb-28 lg:pb-0">
            <div className="sticky top-3 z-10 mx-3 mt-3 lg:top-4 lg:mt-4 lg:mr-4 lg:ml-4">
              <header className="glass-surface grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 overflow-hidden rounded-2xl border px-4 shadow-2xl shadow-accent-brand/10 sm:gap-4 sm:px-5 lg:px-6">
                <div className="min-w-0">
                  <p className="font-mono text-[11px] tracking-[0.18em] text-muted-fg uppercase">
                    {eyebrow}
                  </p>
                  <h1 className="truncate font-display text-base font-bold tracking-tight sm:text-lg lg:text-xl">
                    {title}
                  </h1>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-sm sm:gap-3">
                  <DropdownMenu onOpenChange={(open) => open && markNotificationsRead()}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="relative rounded-full bg-chip text-ink ring-1 ring-glass-border hover:bg-panel"
                        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
                        title="Stock notifications"
                      >
                        <Bell aria-hidden="true" />
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 font-mono text-[9px] font-bold text-destructive-foreground ring-2 ring-panel">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      sideOffset={10}
                      align="end"
                      className="glass-surface w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border p-0"
                    >
                      <div className="flex items-center justify-between border-b border-line px-4 py-3">
                        <div>
                          <p className="text-sm font-bold text-ink">Stock notifications</p>
                          <p className="text-[11px] text-muted-fg">In-app + push alerts</p>
                        </div>
                        {notifications.length > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={clearNotifications}
                            className="text-muted-fg hover:text-ink"
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                      {push.supported && (
                        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
                          <span className="text-[12px] text-muted-fg">
                            Push alerts on this device
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={push.busy}
                            onClick={() => void (push.enabled ? push.disable() : push.enable())}
                            className={`h-7 rounded-full px-3 text-[11px] font-semibold ${push.enabled ? "bg-good-soft text-good" : "bg-chip text-ink hover:bg-accent-brand hover:text-accent-brand-ink"}`}
                          >
                            {push.busy ? "…" : push.enabled ? "On" : "Enable"}
                          </Button>
                        </div>
                      )}
                      {notifications.length === 0 ? (
                        <div className="px-5 py-8 text-center">
                          <Bell className="mx-auto mb-2 size-5 text-muted-fg" aria-hidden="true" />
                          <p className="text-sm font-semibold text-ink">No stock alerts yet</p>
                          <p className="mt-1 text-[11px] text-muted-fg">
                            Alerts appear when a balance reaches or drops below its threshold.
                          </p>
                        </div>
                      ) : (
                        <div className="max-h-80 overflow-y-auto p-1.5">
                          {notifications.map((notification) => (
                            <DropdownMenuItem key={notification.id} asChild>
                              <Link
                                to="/inventory-items"
                                search={{
                                  balance:
                                    notification.level === "critical" ? "below" : "threshold",
                                }}
                                className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-3 focus:bg-panel/70"
                              >
                                <span
                                  className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${notification.level === "critical" ? "bg-destructive/15 text-destructive" : "bg-warn-soft text-warn"}`}
                                >
                                  <TriangleAlert className="size-4" aria-hidden="true" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[13px] font-bold text-ink">
                                    {notification.itemName}
                                  </span>
                                  <span className="block text-[11px] leading-5 text-muted-fg">
                                    {notification.level === "critical"
                                      ? "Below threshold"
                                      : "Threshold reached"}{" "}
                                    · Balance {notification.balance} / Threshold{" "}
                                    {notification.threshold}
                                  </span>
                                </span>
                                <span className="shrink-0 font-mono text-[9px] text-muted-fg">
                                  {formatNotificationTime(notification.createdAt)}
                                </span>
                              </Link>
                            </DropdownMenuItem>
                          ))}
                        </div>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className="rounded-full bg-chip text-ink ring-1 ring-glass-border hover:bg-panel"
                    aria-label={isNight ? "Switch to day theme" : "Switch to night theme"}
                    title={isNight ? "Day theme" : "Night theme"}
                  >
                    {isNight ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="hidden size-9 place-items-center rounded-full bg-chip font-display text-sm font-semibold ring-1 ring-glass-border transition hover:bg-panel sm:grid"
                        title={user?.email ?? "Account"}
                        aria-label="Account menu"
                      >
                        {(user?.email?.[0] ?? "T").toUpperCase()}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      sideOffset={10}
                      className="glass-surface w-56 rounded-xl border"
                    >
                      <div className="truncate px-3 py-2 text-[11px] text-muted-fg">
                        {user?.email}
                      </div>
                      <DropdownMenuItem
                        onClick={() => void signOut()}
                        className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                      >
                        <LogOut className="size-4" aria-hidden="true" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {action}
                </div>
              </header>
            </div>

            {children}
          </main>

          <nav
            className="left-menu-glass fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 grid h-[72px] grid-cols-5 items-center rounded-2xl border px-2 shadow-2xl lg:hidden"
            aria-label="Mobile navigation"
          >
            {mobileDockItems.map((item, index) => {
              const Icon = item.icon;
              const isInventory = item.to === "/inventory-items";
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: item.to === "/" }}
                  className={`flex min-w-0 flex-col items-center justify-center gap-1 text-[10px] font-semibold text-muted-fg transition-colors hover:text-ink ${isInventory ? "relative -translate-y-2" : ""}`}
                  activeProps={{ className: "text-accent-brand" }}
                  style={{ gridColumn: index === 2 ? 3 : undefined }}
                >
                  <span
                    className={`grid place-items-center transition-all ${
                      isInventory
                        ? "brand-gradient size-12 rounded-full border border-glass-border text-accent-brand-ink shadow-lg shadow-accent-brand/30"
                        : "size-8 rounded-xl"
                    }`}
                  >
                    <Icon
                      className={isInventory ? "size-5" : "size-[18px]"}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="max-w-full truncate">
                    {isInventory ? "Inventory" : item.short}
                  </span>
                </Link>
              );
            })}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className={`col-start-5 flex h-auto min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[10px] font-semibold hover:bg-panel/60 ${isMoreActive ? "text-accent-brand" : "text-muted-fg"}`}
                  aria-label="Open more screens"
                >
                  <span className="grid size-8 place-items-center rounded-xl border border-glass-border bg-panel/60">
                    <Plus className="size-[19px]" strokeWidth={2.2} aria-hidden="true" />
                  </span>
                  <span>More</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="end"
                sideOffset={14}
                className="glass-surface max-h-[min(24rem,calc(100vh-7rem))] w-64 overflow-y-auto rounded-xl border p-1.5"
              >
                {mobileMoreItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem key={item.to} asChild>
                      <Link
                        to={item.to}
                        className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 font-medium text-ink focus:bg-accent-brand/10"
                        activeProps={{ className: "bg-accent-brand/10 text-accent-brand" }}
                      >
                        <Icon aria-hidden="true" />
                        {item.long}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
    </div>
  );
}

export const fieldClass =
  "glass-control w-full h-11 rounded-xl border px-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-accent-brand";
export const labelClass = "block text-[12px] font-medium text-muted-fg mb-1.5";
