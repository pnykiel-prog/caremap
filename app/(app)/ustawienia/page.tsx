import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Lock, Shield } from "lucide-react";
import AccountForm from "./AccountForm";

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

export default async function UstawieniaPage() {
  const session = await auth();
  if (!session) redirect("/logowanie");

  const user = session.user as {
    id?: string;
    name?: string | null;
    email?: string | null;
    role?: string;
    organizationName?: string;
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Ustawienia konta</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Zarządzaj swoim profilem i hasłem
        </p>
      </div>

      {/* Profile info card */}
      <Card className="bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-[#1e3a5f] flex items-center gap-2">
            <User size={16} />
            Informacje o koncie
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-[#f0f4f8] rounded-lg">
            <div className="w-12 h-12 rounded-full bg-[#1e3a5f] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">
                {user.name?.[0]?.toUpperCase() ?? "?"}
              </span>
            </div>
            <div>
              <p className="font-semibold text-[#1e3a5f]">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 p-3 border border-gray-100 rounded-lg">
              <Shield size={14} className="text-[#1e3a5f]" />
              <div>
                <p className="text-xs text-muted-foreground">Rola</p>
                <p className="font-medium">{roleLabel[user.role ?? ""] ?? user.role ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 border border-gray-100 rounded-lg">
              <User size={14} className="text-[#1e3a5f]" />
              <div>
                <p className="text-xs text-muted-foreground">Organizacja</p>
                <p className="font-medium truncate">{user.organizationName ?? "—"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit form */}
      <Card className="bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-[#1e3a5f] flex items-center gap-2">
            <Lock size={16} />
            Edytuj profil i hasło
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AccountForm currentName={user.name ?? ""} />
        </CardContent>
      </Card>
    </div>
  );
}
