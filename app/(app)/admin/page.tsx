import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Settings, ShieldCheck, ChevronRight } from "lucide-react";

export default async function AdminHome() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") redirect("/");

  const sections = [
    {
      href: "/admin/szablony",
      icon: FileText,
      title: "Szablony ankiet",
      desc: "Kreator i wersjonowanie ankiet K1-K4, przesiewowych i specjalistycznych (ARCH-02)",
    },
    {
      href: "/admin/ustawienia",
      icon: Settings,
      title: "Ustawienia gminy",
      desc: "Kanały powiadomień (P-10), automatyczny PDF do seniora (P-09), interwały re-ankiet (GM-01)",
    },
    {
      href: "/admin/logi",
      icon: ShieldCheck,
      title: "Logi audytu",
      desc: "Rejestr dostępu do danych wrażliwych (SEC-02)",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Panel administracyjny</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Konfiguracja systemu CareMap — dostępne tylko dla administratora gminy.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.href} href={s.href}>
              <Card className="bg-white hover:shadow-md transition-shadow h-full">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center flex-shrink-0">
                      <Icon size={20} className="text-[#1e3a5f]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-semibold text-[#1e3a5f]">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
