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

// Public pages
import LandingPage from "./pages/LandingPage";
import Access from "./pages/Access";
import ScholarLogin from "./pages/ScholarLogin";
import AdminLogin from "./pages/AdminLogin";
import PasswordRecovery from "./pages/PasswordRecovery";
import ScholarSignup from "./pages/ScholarSignup";
import AccessDenied from "./pages/AccessDenied";
import OrgMemberSignup from "./pages/OrgMemberSignup";
import NotFound from "./pages/NotFound";

// Scholar pages (reusing existing)
import Index from "./pages/Index";
import PaymentsReports from "./pages/PaymentsReports";
import Documents from "./pages/Documents";
import ScholarProfile from "./pages/ScholarProfile";
import ScholarManual from "./pages/ScholarManual";
import ChangePassword from "./pages/ChangePassword";

// Admin pages (reusing existing)
import ManagerDashboard from "./pages/ManagerDashboard";
import AdminIccaDashboard from "./pages/AdminIccaDashboard";
import ThematicProjectsList from "./pages/ThematicProjectsList";
import ThematicProjectDetail from "./pages/ThematicProjectDetail";
import InviteCodes from "./pages/InviteCodes";
import Organizations from "./pages/Organizations";
import ScholarProfileView from "./pages/ScholarProfileView";
import Import from "./pages/Import";
import AuditTrail from "./pages/AuditTrail";
import ScholarMessages from "./pages/ScholarMessages";
import AdminMessages from "./pages/AdminMessages";
import AdminMembers from "./pages/AdminMembers";
import InviteAccept from "./pages/InviteAccept";

const queryClient = new QueryClient({
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
        <OrganizationProvider>
          <SupportCenterProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/acesso" element={<Access />} />
              <Route path="/bolsista/login" element={<ScholarLogin />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/recuperar-senha" element={<PasswordRecovery />} />
              <Route path="/criar-conta" element={<ScholarSignup />} />
              <Route path="/criar-conta-membro" element={<OrgMemberSignup />} />
              <Route path="/acesso-negado" element={<AccessDenied />} />
              
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
                  <Documents />
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
              <Route path="/bolsista/mensagens" element={
                <ScholarProtectedRoute>
                  <ScholarMessages />
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
              <Route path="/admin/importar" element={
                <AdminProtectedRoute>
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
              <Route path="/admin/membros" element={
                <AdminProtectedRoute>
                  <AdminMembers />
                </AdminProtectedRoute>
              } />
              <Route path="/admin/documentos" element={
                <AdminProtectedRoute>
                  <Documents />
                </AdminProtectedRoute>
              } />
              <Route path="/admin/codigos-convite" element={
                <AdminProtectedRoute>
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
                <AdminProtectedRoute allowedRoles={["admin"]}>
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
              
              {/* Legacy routes - redirect to new paths */}
              <Route path="/painel-gestor" element={<Navigate to="/admin/painel" replace />} />
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
            <SupportCenterFAB />
            <SupportCenterDrawer />
          </BrowserRouter>
          </SupportCenterProvider>
        </OrganizationProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
