import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { SupportCenterProvider } from "@/contexts/SupportCenterContext";

import { SupportCenterFAB } from "@/components/support-center/SupportCenterFAB";
import { SupportCenterDrawer } from "@/components/support-center/SupportCenterDrawer";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ScholarProtectedRoute } from "@/components/auth/ScholarProtectedRoute";
import { AdminProtectedRoute } from "@/components/auth/AdminProtectedRoute";
import { AuditorProtectedRoute } from "@/components/auth/AuditorProtectedRoute";
import { SessionGuard } from "@/components/auth/SessionGuard";
import { AuthGate } from "@/components/auth/AuthGate";

// Public pages
import LandingPage from "./pages/LandingPage";
import Access from "./pages/Access";
import ScholarLogin from "./pages/ScholarLogin";
import AdminLogin from "./pages/AdminLogin";
import AuditorLogin from "./pages/AuditorLogin";
import ManagerLogin from "./pages/ManagerLogin";
import PasswordRecovery from "./pages/PasswordRecovery";
import ScholarSignup from "./pages/ScholarSignup";
import AccessDenied from "./pages/AccessDenied";
import OrgMemberSignup from "./pages/OrgMemberSignup";
import NotFound from "./pages/NotFound";
import SessionExpired from "./pages/SessionExpired";

// Scholar pages (reusing existing)
import Index from "./pages/Index";
import PaymentsReports from "./pages/PaymentsReports";
import Documents from "./pages/Documents";
import ScholarDocuments from "./pages/ScholarDocuments";
import ScholarProfile from "./pages/ScholarProfile";
import ScholarManual from "./pages/ScholarManual";
import ChangePassword from "./pages/ChangePassword";

// Admin pages (reusing existing)
import ManagerDashboard from "./pages/ManagerDashboard";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import OperacaoBolsas from "./pages/OperacaoBolsas";
import AdminIccaDashboard from "./pages/AdminIccaDashboard";
import ThematicProjectsList from "./pages/ThematicProjectsList";
import ThematicProjectDetail from "./pages/ThematicProjectDetail";
import FinancialManagement from "./pages/FinancialManagement";
import InviteCodes from "./pages/InviteCodes";
import Organizations from "./pages/Organizations";
import ScholarProfileView from "./pages/ScholarProfileView";
import Import from "./pages/Import";
import AuditTrail from "./pages/AuditTrail";
import ScholarMessages from "./pages/ScholarMessages";
import ScholarReports from "./pages/ScholarReports";
import AdminMessages from "./pages/AdminMessages";
import AdminMembers from "./pages/AdminMembers";
import AllUsers from "./pages/AllUsers";
import InviteAccept from "./pages/InviteAccept";
import Settings from "./pages/Settings";
import PdfReports from "./pages/PdfReports";
import AuditorDashboard from "./pages/AuditorDashboard";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <AuthGate>
        <OrganizationProvider>
          <SupportCenterProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/acesso" element={<Access />} />
              <Route path="/bolsista/login" element={<ScholarLogin />} />
              <Route path="/manager/login" element={<ManagerLogin />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/auditor/login" element={<AuditorLogin />} />
              <Route path="/recuperar-senha" element={<PasswordRecovery />} />
              <Route path="/criar-conta" element={<ScholarSignup />} />
              <Route path="/criar-conta-membro" element={<OrgMemberSignup />} />
              <Route path="/acesso-negado" element={<AccessDenied />} />
              <Route path="/session-expired" element={<SessionExpired />} />
              
              {/* Public invite accept pages */}
              <Route path="/convite" element={<InviteAccept />} />
              <Route path="/invite/:token" element={<InviteAccept />} />
              
              {/* Legacy auth route - redirect to new access page */}
              <Route path="/auth" element={<Navigate to="/acesso" replace />} />
              
              {/* Landing page */}
              <Route path="/" element={<LandingPage />} />
              
              {/* ===================== */}
              {/* Scholar Portal Routes */}
              {/* ===================== */}
              <Route path="/bolsista/painel" element={
                <ScholarProtectedRoute>
                  <Index />
                </ScholarProtectedRoute>
              } />
              <Route path="/bolsista/pagamentos-relatorios" element={
                <ScholarProtectedRoute>
                  <PaymentsReports />
                </ScholarProtectedRoute>
              } />
              <Route path="/bolsista/documentos" element={
                <ScholarProtectedRoute>
                  <ScholarDocuments />
                </ScholarProtectedRoute>
              } />
              <Route path="/bolsista/perfil" element={
                <ScholarProtectedRoute>
                  <ScholarProfile />
                </ScholarProtectedRoute>
              } />
              <Route path="/bolsista/manual" element={
                <ScholarProtectedRoute>
                  <ScholarManual />
                </ScholarProtectedRoute>
              } />
              <Route path="/bolsista/relatorios" element={
                <ScholarProtectedRoute>
                  <ScholarReports />
                </ScholarProtectedRoute>
              } />
              <Route path="/bolsista/mensagens" element={
                <ScholarProtectedRoute>
                  <ScholarMessages />
                </ScholarProtectedRoute>
              } />
              <Route path="/bolsista/configuracoes" element={
                <ScholarProtectedRoute>
                  <Settings />
                </ScholarProtectedRoute>
              } />
              
              {/* Change Password - accessible by all authenticated users */}
              <Route path="/alterar-senha" element={
                <ProtectedRoute>
                  <ChangePassword />
                </ProtectedRoute>
              } />
              
              {/* =================== */}
              {/* Admin Portal Routes */}
              {/* =================== */}
              <Route path="/admin/painel" element={
                <AdminProtectedRoute>
                  <ManagerDashboard />
                </AdminProtectedRoute>
              } />
              <Route path="/admin/dashboard" element={
                <AdminProtectedRoute>
                  <ExecutiveDashboard />
                </AdminProtectedRoute>
              } />
              <Route path="/admin/operacao" element={
                <AdminProtectedRoute>
                  <OperacaoBolsas />
                </AdminProtectedRoute>
              } />
              <Route path="/admin/importar" element={
                <AdminProtectedRoute allowedRoles={["admin"]}>
                  <Import />
                </AdminProtectedRoute>
              } />
              <Route path="/admin/mensagens" element={
                <AdminProtectedRoute>
                  <AdminMessages />
                </AdminProtectedRoute>
              } />
              <Route path="/admin/projetos-tematicos" element={
                <AdminProtectedRoute>
                  <ThematicProjectsList />
                </AdminProtectedRoute>
              } />
              <Route path="/admin/projetos-tematicos/:id" element={
                <AdminProtectedRoute>
                  <ThematicProjectDetail />
                </AdminProtectedRoute>
              } />
              <Route path="/admin/gestao-financeira" element={
                <AdminProtectedRoute>
                  <FinancialManagement />
                </AdminProtectedRoute>
              } />
              <Route path="/admin/relatorios" element={
                <AdminProtectedRoute>
                  <PdfReports />
                </AdminProtectedRoute>
              } />
              <Route path="/admin/membros" element={
                <AdminProtectedRoute allowedRoles={["admin"]}>
                  <AdminMembers />
                </AdminProtectedRoute>
              } />
              <Route path="/admin/usuarios-plataforma" element={
                <AdminProtectedRoute allowedRoles={["admin"]}>
                  <AllUsers />
                </AdminProtectedRoute>
              } />
              <Route path="/admin/documentos" element={
                <AdminProtectedRoute>
                  <Documents />
                </AdminProtectedRoute>
              } />
              <Route path="/admin/codigos-convite" element={
                <AdminProtectedRoute allowedRoles={["admin"]}>
                  <InviteCodes />
                </AdminProtectedRoute>
              } />
              <Route path="/admin/bolsista/:userId" element={
                <AdminProtectedRoute>
                  <ScholarProfileView />
                </AdminProtectedRoute>
              } />
              
              {/* Admin-only routes */}
              <Route path="/admin/dashboard-icca" element={
                <AdminProtectedRoute>
                  <AdminIccaDashboard />
                </AdminProtectedRoute>
              } />
              <Route path="/admin/trilha-auditoria" element={
                <AdminProtectedRoute allowedRoles={["admin"]}>
                  <AuditTrail />
                </AdminProtectedRoute>
              } />
              <Route path="/admin/organizacoes" element={
                <AdminProtectedRoute allowedRoles={["admin"]}>
                  <Organizations />
                </AdminProtectedRoute>
              } />
              <Route path="/admin/configuracoes" element={
                <AdminProtectedRoute allowedRoles={["admin"]}>
                  <Settings />
                </AdminProtectedRoute>
              } />
              
              {/* ==================== */}
              {/* Auditor Portal Routes */}
              {/* ==================== */}
              <Route path="/auditor" element={<Navigate to="/auditor/dashboard" replace />} />
              <Route path="/auditor/dashboard" element={
                <AuditorProtectedRoute>
                  <AuditorDashboard />
                </AuditorProtectedRoute>
              } />
              <Route path="/auditor/projetos-tematicos" element={
                <AuditorProtectedRoute>
                  <ThematicProjectsList />
                </AuditorProtectedRoute>
              } />
              <Route path="/auditor/projetos-tematicos/:id" element={
                <AuditorProtectedRoute>
                  <ThematicProjectDetail />
                </AuditorProtectedRoute>
              } />
              <Route path="/auditor/relatorios" element={
                <AuditorProtectedRoute>
                  <PdfReports />
                </AuditorProtectedRoute>
              } />
              <Route path="/auditor/pagamentos" element={
                <AuditorProtectedRoute>
                  <FinancialManagement />
                </AuditorProtectedRoute>
              } />
              <Route path="/auditor/gestao-financeira" element={
                <AuditorProtectedRoute>
                  <FinancialManagement />
                </AuditorProtectedRoute>
              } />
              <Route path="/auditor/operacao" element={
                <AuditorProtectedRoute>
                  <OperacaoBolsas />
                </AuditorProtectedRoute>
              } />

              {/* Legacy routes - redirect to new paths */}
              <Route path="/painel-gestor" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/importar" element={<Navigate to="/admin/importar" replace />} />
              <Route path="/projetos-tematicos" element={<Navigate to="/admin/projetos-tematicos" replace />} />
              <Route path="/projetos-tematicos/:id" element={<Navigate to="/admin/projetos-tematicos/:id" replace />} />
              <Route path="/codigos-convite" element={<Navigate to="/admin/codigos-convite" replace />} />
              <Route path="/trilha-auditoria" element={<Navigate to="/admin/trilha-auditoria" replace />} />
              <Route path="/organizacoes" element={<Navigate to="/admin/organizacoes" replace />} />
              <Route path="/perfil-bolsista/:userId" element={<Navigate to="/admin/bolsista/:userId" replace />} />
              <Route path="/pagamentos-relatorios" element={<Navigate to="/bolsista/pagamentos-relatorios" replace />} />
              <Route path="/documentos" element={<Navigate to="/bolsista/documentos" replace />} />
              <Route path="/perfil-bolsista" element={<Navigate to="/bolsista/perfil" replace />} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <SessionGuard />
            <SupportCenterFAB />
            <SupportCenterDrawer />
          </BrowserRouter>
          </SupportCenterProvider>
        </OrganizationProvider>
        </AuthGate>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
