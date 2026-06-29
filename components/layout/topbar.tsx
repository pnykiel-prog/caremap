"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Settings, ChevronDown, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/utils";

interface TopbarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
    organizationName?: string;
  };
  pageTitle?: string;
  /** Otwarcie mobile menu (hamburger). Widoczny tylko na <lg. */
  onMenuClick?: () => void;
}

const roleLabel: Record<string, string> = {
  ADMIN: "Administrator",
  MUNICIPALITY_WORKER: "Pracownik gminy",
  SOCIAL_WORKER: "Pracownik socjalny",
  NURSE: "Pielęgniarka",
  GP_DOCTOR: "Lekarz",
  VOLUNTEER: "Wolontariusz",
  NGO_COORDINATOR: "Koordynator NGO",
  PROVIDER_MANAGER: "Zarządca podmiotu",
  FAMILY_CAREGIVER: "Opiekun rodzinny",
  SENIOR: "Senior",
};

export function Topbar({ user, pageTitle, onMenuClick }: TopbarProps) {
  const router = useRouter();
  return (
    <header className="h-16 bg-white border-b border-border flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-3">
        {/* Hamburger — tylko na mobile */}
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 rounded-lg text-muted-foreground hover:text-[#1e3a5f] hover:bg-[#f0f4f8] flex items-center justify-center"
          aria-label="Otwórz menu"
        >
          <Menu size={20} />
        </button>

        {pageTitle ? (
          <h1 className="text-lg font-semibold text-[#1e3a5f]">{pageTitle}</h1>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#C9A84C]" />
            <span className="text-sm font-medium text-muted-foreground">
              {user.organizationName ?? "CareMap"}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-[#1e3a5f]">
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-[#C9A84C] rounded-full" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-[#f0f4f8] rounded-lg transition-colors outline-none">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-[#1e3a5f] text-white text-xs font-semibold">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-foreground leading-none">{user.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {user.role ? (roleLabel[user.role] ?? user.role) : ""}
              </p>
            </div>
            <ChevronDown size={14} className="text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => router.push("/ustawienia")}
            >
              <Settings size={14} className="mr-2" />
              Ustawienia
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-red-600 focus:text-red-600"
              onClick={() => signOut({ callbackUrl: "/logowanie" })}
            >
              <LogOut size={14} className="mr-2" />
              Wyloguj
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
