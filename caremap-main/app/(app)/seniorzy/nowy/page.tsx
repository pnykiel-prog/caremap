import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, UserPlus, FileSpreadsheet } from "lucide-react";
import { ManualForm } from "./ManualForm";
import { ImportForm } from "./ImportForm";

export default async function NowySeniorPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user) redirect("/logowanie");
  if (role !== "ADMIN" && role !== "MUNICIPALITY_WORKER" && role !== "SOCIAL_WORKER") {
    redirect("/");
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <Link
        href="/seniorzy"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-[#1e3a5f]"
      >
        <ChevronLeft size={14} /> Seniorzy
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Dodaj seniora</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Możesz dodać jednego seniora ręcznie lub zaimportować wielu z pliku CSV/Excel.
        </p>
      </div>

      <Card className="bg-white">
        <CardContent className="p-0">
          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b border-border bg-[#F8FAFC] p-0 h-auto">
              <TabsTrigger
                value="manual"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1e3a5f] data-[state=active]:bg-transparent data-[state=active]:text-[#1e3a5f] px-5 py-3"
              >
                <UserPlus size={14} className="mr-2" />
                Ręczne wprowadzanie
              </TabsTrigger>
              <TabsTrigger
                value="import"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1e3a5f] data-[state=active]:bg-transparent data-[state=active]:text-[#1e3a5f] px-5 py-3"
              >
                <FileSpreadsheet size={14} className="mr-2" />
                Import z pliku
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="p-6 mt-0">
              <ManualForm />
            </TabsContent>

            <TabsContent value="import" className="p-6 mt-0">
              <ImportForm />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
