import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShieldCheck, Clock, UserX } from "lucide-react";
import { getInitials } from "@/lib/utils";
import UserActions from "./UserActions";

import type React from "react";

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

const statusCfg: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  ACTIVE: { label: "Aktywny", cls: "bg-green-100 text-green-700", icon: ShieldCheck },
  PENDING: { label: "Oczekujący", cls: "bg-yellow-100 text-yellow-700", icon: Clock },
  REJECTED: { label: "Odrzucony", cls: "bg-red-100 text-red-700", icon: UserX },
  SUSPENDED: { label: "Zawieszony", cls: "bg-gray-100 text-gray-500", icon: UserX },
};

export default async function UzytkownicyPage() {
  const session = await auth();
  const sessionUser = session?.user as { id?: string; role?: string; organizationId?: string } | undefined;
  const orgId = sessionUser?.organizationId!;
  const isAdmin = sessionUser?.role === "ADMIN";

  const users = await prisma.user.findMany({
    where: { organizationId: orgId },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  const counts = {
    total: users.length,
    active: users.filter((u) => u.status === "ACTIVE").length,
    pending: users.filter((u) => u.status === "PENDING").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Użytkownicy</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {counts.total} zarejestrowanych
            {counts.pending > 0 ? ` · ${counts.pending} oczekujących na akceptację` : " · brak oczekujących"}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Wszyscy", value: counts.total, icon: Users, color: "text-[#1e3a5f]", bg: "bg-[#1e3a5f]/10" },
          { label: "Aktywni", value: counts.active, icon: ShieldCheck, color: "text-green-600", bg: "bg-green-50" },
          {
            label: "Oczekujący",
            value: counts.pending,
            icon: Clock,
            color: counts.pending > 0 ? "text-yellow-600" : "text-muted-foreground",
            bg: counts.pending > 0 ? "bg-yellow-50" : "bg-gray-50",
          },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="bg-white shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={18} className={s.color} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold text-[#1e3a5f]">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pending approvals banner */}
      {isAdmin && counts.pending > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
          <Clock size={16} className="text-yellow-600 flex-shrink-0" />
          <span className="text-yellow-800 font-medium">
            {counts.pending} {counts.pending === 1 ? "konto wymaga" : "konta wymagają"} akceptacji
          </span>
        </div>
      )}

      {/* Users list */}
      <Card className="bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-[#1e3a5f]">Lista użytkowników</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {users.map((user) => {
              const scfg = statusCfg[user.status] ?? statusCfg.PENDING;
              const StatusIcon = scfg.icon;
              return (
                <div key={user.id} className="flex items-center justify-between px-6 py-4 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-[#1e3a5f]">
                        {getInitials(user.name)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email} · {roleLabel[user.role] ?? user.role}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1 ${scfg.cls}`}>
                      <StatusIcon size={11} />
                      {scfg.label}
                    </span>
                    {isAdmin && user.status === "PENDING" && (
                      <UserActions userId={user.id} />
                    )}
                    {isAdmin && user.status === "ACTIVE" && user.role !== "ADMIN" && (
                      <UserActions userId={user.id} mode="suspend" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
