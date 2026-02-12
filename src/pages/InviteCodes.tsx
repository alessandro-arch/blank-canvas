import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AdminBanner } from "@/components/admin/AdminBanner";
import { AdminMasterModeProvider } from "@/contexts/AdminMasterModeContext";
import { InviteCodesManagement } from "@/components/invite-codes/InviteCodesManagement";

const InviteCodes = () => {
  return (
    <AdminMasterModeProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar />
        
        <div className="flex-1 flex flex-col">
          <AdminBanner />
          <Header />
          
          <main className="flex-1 p-6 overflow-auto">
            <InviteCodesManagement />
          </main>
          <Footer />
        </div>
      </div>
    </AdminMasterModeProvider>
  );
};

export default InviteCodes;
