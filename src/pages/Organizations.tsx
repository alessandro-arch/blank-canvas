import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AdminBanner } from "@/components/admin/AdminBanner";
import { AdminMasterModeProvider } from "@/contexts/AdminMasterModeContext";
import { OrganizationsManagement } from "@/components/organizations";

const Organizations = () => {
  return (
    <AdminMasterModeProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar />
        
        <div className="flex-1 flex flex-col">
          <AdminBanner />
          <Header />
          
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-6xl mx-auto space-y-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Organizações</h1>
                <p className="text-muted-foreground">
                  Gerencie as organizações que utilizam a plataforma
                </p>
              </div>
              
              <OrganizationsManagement />
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </AdminMasterModeProvider>
  );
};

export default Organizations;
