"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Heart,
  LogOut,
  LayoutDashboard,
  Users,
  UserCog,
  CalendarClock,
  Mail,
  UserPlus,
  Settings,
  Home,
  History,
  LineChart,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

interface PortalNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const NAV_ANKIETER: PortalNavItem[] = [
  { href: "/portal/ankieter", label: "Moi pacjenci", icon: Users, exact: true },
  { href: "/portal/ankieter/nowy-pacjent", label: "Nowy pacjent", icon: UserPlus },
  { href: "/portal/ankieter/zaplanowane", label: "Do zrobienia", icon: CalendarClock },
  { href: "/portal/ankieter/konto", label: "Konto", icon: Settings },
];

const NAV_MANAGER: PortalNavItem[] = [
  { href: "/portal/manager", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/portal/manager/pacjenci", label: "Pacjenci", icon: Users },
  { href: "/portal/manager/ankieterzy", label: "Ankieterzy", icon: UserCog },
  { href: "/portal/manager/zaproszenia", label: "Zaproszenia", icon: Mail },
  { href: "/portal/manager/harmonogram", label: "Harmonogram", icon: CalendarClock },
];

const NAV_SENIOR: PortalNavItem[] = [
  { href: "/portal/senior", label: "Start", icon: Home, exact: true },
  { href: "/portal/senior/historia", label: "Historia", icon: History },
  { href: "/portal/senior/mapa-opieki", label: "Mapa opieki", icon: LineChart },
];

const NAV_BY_VARIANT: Record<"ankieter" | "manager" | "senior", PortalNavItem[]> = {
  ankieter: NAV_ANKIETER,
  manager: NAV_MANAGER,
  senior: NAV_SENIOR,
};

export function PortalShell({
  variant,
  title,
  subtitle,
  userName,
  entityName,
  children,
}: {
  variant: "ankieter" | "manager" | "senior";
  title: string;
  subtitle?: string;
  userName?: string;
  entityName?: string;
  children: React.ReactNode;
}) {
  const nav = NAV_BY_VARIANT[variant];
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#1e3a5f] flex items-center justify-center">
            <Heart className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#1e3a5f] leading-tight">{title}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground leading-tight">{subtitle}</p>}
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/logowanie" })}
          className="p-2 text-muted-foreground hover:text-[#1e3a5f]"
          aria-label="Wyloguj"
        >
          <LogOut size={18} />
        </button>
      </div>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 bg-[#1e3a5f] flex-col shadow-xl">
          <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
            <div className="w-9 h-9 rounded-lg bg-[#C9A84C] flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-white font-bold text-lg leading-none tracking-tight">
                Care<span className="text-[#C9A84C]">Map</span>
              </span>
              <p className="text-white/50 text-[11px] mt-0.5">{title}</p>
            </div>
          </div>

          {entityName && (
            <div className="px-4 py-3 border-b border-white/10">
              <p className="text-[10px] uppercase tracking-wider text-white/40">Podmiot</p>
              <p className="text-sm text-white font-medium truncate">{entityName}</p>
            </div>
          )}

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {nav.map((item) => {
              const isActive = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                    isActive
                      ? "bg-[#C9A84C] text-white shadow-sm"
                      : "text-white/70 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon size={18} className={cn(isActive ? "text-white" : "text-white/60 group-hover:text-white")} />
                  <span className="flex-1">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="px-4 py-3 border-t border-white/10">
            {userName && (
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-semibold">
                  {userName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white truncate">{userName}</p>
                  <p className="text-[10px] text-white/40">Portal {variant === "ankieter" ? "ankietera" : variant === "manager" ? "managera" : "seniora"}</p>
                </div>
              </div>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/logowanie" })}
              className="flex items-center gap-2 text-white/70 hover:text-white text-xs"
            >
              <LogOut size={14} />
              Wyloguj
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 min-h-screen">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-border flex justify-around py-2 shadow-lg">
        {nav.slice(0, 4).map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg",
                isActive ? "text-[#1e3a5f]" : "text-muted-foreground",
              )}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
