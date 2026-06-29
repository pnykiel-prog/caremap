"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Building2,
  Users,
  ChevronRight,
  Heart,
  Stethoscope,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  /** Czy menu jest otwarte na mobile (kontrolowane z AppShell). Na lg+ ignorowane. */
  mobileOpen?: boolean;
  /** Callback do zamknięcia z poziomu sidebara (np. krzyżyk). */
  onCloseMobile?: () => void;
}

const navItems = [
  {
    label: "Start",
    href: "/",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Seniorzy",
    href: "/seniorzy",
    icon: Users,
    exact: false,
  },
  {
    label: "Ankieta",
    href: "/ankieta",
    icon: ClipboardList,
    exact: false,
  },
  {
    label: "Panel JST",
    href: "/panel",
    icon: BarChart3,
    exact: false,
  },
  {
    label: "Podmioty",
    href: "/podmioty",
    icon: Building2,
    exact: false,
  },
  {
    label: "Ankieterzy",
    href: "/ankieterzy",
    icon: Stethoscope,
    exact: false,
  },
  {
    label: "Użytkownicy",
    href: "/uzytkownicy",
    icon: Users,
    exact: false,
  },
  {
    label: "Administracja",
    href: "/admin",
    icon: Settings,
    exact: false,
  },
];

export function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps = {}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-[#1e3a5f] flex flex-col shadow-xl",
        // Mobile: slide in/out. Na lg+ zawsze widoczny.
        "transform transition-transform duration-200 ease-out",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0",
      )}
      aria-hidden={!mobileOpen ? undefined : false}
    >
      {/* Logo + close button (close tylko na mobile) */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-lg bg-[#C9A84C] flex items-center justify-center flex-shrink-0">
          <Heart className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-white font-bold text-lg leading-none tracking-tight">
            Care<span className="text-[#C9A84C]">Map</span>
          </span>
          <p className="text-white/50 text-xs mt-0.5">Platforma opieki seniorów</p>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden w-9 h-9 rounded-lg text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center"
          aria-label="Zamknij menu"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                isActive
                  ? "bg-[#C9A84C] text-white shadow-sm"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon
                className={cn(
                  "w-4.5 h-4.5 flex-shrink-0 transition-colors",
                  isActive ? "text-white" : "text-white/60 group-hover:text-white"
                )}
                size={18}
              />
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <ChevronRight className="w-3.5 h-3.5 text-white/70" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Version */}
      <div className="px-6 py-4 border-t border-white/10">
        <p className="text-white/30 text-xs">CareMap v1.0 · MVP</p>
      </div>
    </aside>
  );
}
