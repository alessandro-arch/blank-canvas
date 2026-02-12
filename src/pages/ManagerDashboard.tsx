import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AdminBanner } from "@/components/admin/AdminBanner";
import { ScholarsManagement } from "@/components/scholars";
import { ProjectsManagement } from "@/components/projects";
import { UsersManagement } from "@/components/dashboard/UsersManagement";
import { BankDataManagement } from "@/components/dashboard/BankDataManagement";
import { ReportsReviewManagement } from "@/components/dashboard/ReportsReviewManagement";
import { PaymentsManagement } from "@/components/dashboard/PaymentsManagement";
import { AdminMasterModeProvider } from "@/contexts/AdminMasterModeContext";

const ManagerDashboard = () => {
  return (
    <AdminMasterModeProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar />
        
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AdminBanner />
          <Header />
          
          <main className="flex-1 p-6 overflow-auto space-y-6">
            {/* Projects Management Section - Grouped by Thematic Project */}
            <div className="animate-fade-in">
              <ProjectsManagement />
            </div>
            
            {/* Payments Management Section - Grouped by Thematic Project */}
            <div className="animate-fade-in">
              <PaymentsManagement />
            </div>
            
            {/* Reports Review Section - Grouped by Thematic Project */}
            <div className="animate-fade-in">
              <ReportsReviewManagement />
            </div>
            
            {/* Bank Data Management Section - Grouped by Thematic Project */}
            <div className="animate-fade-in">
              <BankDataManagement />
            </div>
            
            {/* Scholars Management Section - Grouped by Thematic Project */}
            <div className="animate-fade-in">
              <ScholarsManagement />
            </div>
            
            {/* Users Management Section - At the end */}
            <div className="animate-fade-in">
              <UsersManagement />
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </AdminMasterModeProvider>
  );
};

export default ManagerDashboard;
