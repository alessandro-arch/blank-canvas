import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GrantTermTab } from "@/components/scholar/documents/GrantTermTab";
import { InstitutionalDocsTab } from "@/components/scholar/documents/InstitutionalDocsTab";
import { ReportsTab } from "@/components/scholar/documents/ReportsTab";
import { WorkPlanTab } from "@/components/scholar/documents/WorkPlanTab";

const ScholarDocuments = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Meus Documentos</h1>
                <p className="text-muted-foreground text-sm">Termos, relatórios e documentos institucionais</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="card-institutional mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar documentos..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="termo" className="animate-fade-in">
            <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="termo" className="flex-1 min-w-[120px]">
                Termo de Outorga
              </TabsTrigger>
              <TabsTrigger value="relatorios" className="flex-1 min-w-[120px]">
                Relatórios
              </TabsTrigger>
              <TabsTrigger value="documentos" className="flex-1 min-w-[120px]">
                Documentos Institucionais
              </TabsTrigger>
              <TabsTrigger value="plano" className="flex-1 min-w-[120px]">
                Plano de Trabalho
              </TabsTrigger>
            </TabsList>

            <TabsContent value="termo">
              <GrantTermTab searchQuery={searchQuery} />
            </TabsContent>

            <TabsContent value="relatorios">
              <ReportsTab searchQuery={searchQuery} />
            </TabsContent>

            <TabsContent value="documentos">
              <InstitutionalDocsTab searchQuery={searchQuery} />
            </TabsContent>

            <TabsContent value="plano">
              <WorkPlanTab searchQuery={searchQuery} />
            </TabsContent>
          </Tabs>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default ScholarDocuments;
