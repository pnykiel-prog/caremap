"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

interface AppShellProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
    organizationName?: string;
  };
  children: React.ReactNode;
}

/**
 * Główny shell aplikacji JST z responsywnym menu.
 * Na <lg sidebar jest ukryty domyślnie — otwierany hamburgerem w topbarze.
 * Klik w link lub backdrop zamyka menu.
 */
export function AppShell({ user, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Zamykaj menu po nawigacji (klik w link sidebara)
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Blokuj przewijanie body gdy menu otwarte na mobile
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      {/* Backdrop — tylko na mobile gdy menu otwarte */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen overflow-hidden">
        <Topbar user={user} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
