import {
  LayoutDashboard,
  Users,
  FileText,
  DollarSign,
  Settings,
  GraduationCap,
  HelpCircle,
  ChevronLeft,
  Menu,
  Receipt,
  UserCircle,
  Upload,
  FolderOpen,
  ShieldAlert,
  Ticket,
  Building2,
  Globe,
  Mail,
  Send,
  UserCog,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { OrganizationSwitcher } from "@/components/organizations/OrganizationSwitcher";

interface NavItem {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  managerOnly?: boolean;
  adminOnly?: boolean;
  scholarOnly?: boolean;
  section?: string;
}

const scholarNavigation: NavItem[] = [
  { name: "Meu Painel", icon: LayoutDashboard, href: "/bolsista/painel" },
  { name: "Meu Perfil", icon: UserCircle, href: "/bolsista/perfil" },
  { name: "Meus Pagamentos", icon: Receipt, href: "/bolsista/pagamentos-relatorios" },
  { name: "Mensagens", icon: Mail, href: "/bolsista/mensagens" },
  { name: "Documentos", icon: FileText, href: "/bolsista/documentos" },
  { name: "Manual", icon: HelpCircle, href: "/bolsista/manual" },
];

const adminNavigation: NavItem[] = [
  { name: "Dashboard Estratégico", icon: Globe, href: "/admin/dashboard-icca", adminOnly: true, section: "Governança" },
  { name: "Dashboard Executivo", icon: LayoutDashboard, href: "/admin/dashboard", managerOnly: true },
  { name: "Operação de Bolsas", icon: Users, href: "/admin/operacao", managerOnly: true },
  { name: "Projetos Temáticos", icon: FolderOpen, href: "/admin/projetos-tematicos", managerOnly: true },
  { name: "Mensagens", icon: Send, href: "/admin/mensagens", managerOnly: true },
  { name: "Documentos", icon: FileText, href: "/admin/documentos", managerOnly: true },
  { name: "Códigos de Convite", icon: Ticket, href: "/admin/codigos-convite", managerOnly: true, section: "Gestão Institucional" },
  { name: "Todos os Usuários", icon: Users, href: "/admin/usuarios-plataforma", adminOnly: true },
  { name: "Membros Admin", icon: UserCog, href: "/admin/membros", adminOnly: true },
  { name: "Importar Dados", icon: Upload, href: "/admin/importar", managerOnly: true },
  { name: "Organizações", icon: Building2, href: "/admin/organizacoes", adminOnly: true },
  { name: "Trilha de Auditoria", icon: ShieldAlert, href: "/admin/trilha-auditoria", adminOnly: true },
  { name: "Configurações", icon: Settings, href: "/admin/configuracoes", managerOnly: true },
];

interface SidebarContentProps {
  collapsed: boolean;
  onToggleCollapse?: () => void;
  isMobile?: boolean;
}

export function SidebarContent({ collapsed, onToggleCollapse, isMobile }: SidebarContentProps) {
  const location = useLocation();
  const { hasManagerAccess, isAdmin, loading } = useUserRole();
  const unreadMessages = useUnreadMessages();

  const baseNavigation = hasManagerAccess ? adminNavigation : scholarNavigation;

  const secondaryNavigation: NavItem[] = hasManagerAccess
    ? []
    : [
        { name: "Configurações", icon: Settings, href: "/bolsista/configuracoes" },
        { name: "Ajuda", icon: HelpCircle, href: "/bolsista/manual" },
      ];

  const filteredNavigation = baseNavigation.filter((item) => {
    if (item.managerOnly && !hasManagerAccess) return false;
    if (item.adminOnly && !isAdmin) return false;
    if (item.scholarOnly && hasManagerAccess) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-lg font-bold text-foreground leading-tight">BolsaGO</span>
            <span className="text-[9px] text-muted-foreground leading-tight">
              Powered by <span className="font-medium">InnovaGO</span>
            </span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mx-auto">
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
        )}
        {!isMobile && (
          <button
            onClick={onToggleCollapse}
            className={cn(
              "p-1.5 rounded-lg hover:bg-muted transition-colors",
              collapsed && "absolute right-1"
            )}
          >
            {collapsed ? (
              <Menu className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        )}
      </div>

      {/* Platform Name & Role Badge */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">BolsaGO</span>
            {!loading && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                  hasManagerAccess ? "bg-primary text-primary-foreground" : "bg-info text-white"
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                {hasManagerAccess ? "Gestor" : "Bolsista"}
              </span>
            )}
          </div>
          <OrganizationSwitcher collapsed={collapsed} />
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filteredNavigation.map((item, index) => {
          const isActive = location.pathname === item.href;
          const prevItem = filteredNavigation[index - 1];
          const showSectionHeader = item.section && (!prevItem || prevItem.section !== item.section);

          const linkClasses = cn("nav-item", isActive && "active", collapsed && "justify-center px-2");

          return (
            <div key={item.name}>
              {showSectionHeader && !collapsed && (
                <div className="px-3 py-2 mt-3 mb-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {item.section}
                  </span>
                </div>
              )}
              <Link to={item.href} className={linkClasses} title={collapsed ? item.name : undefined}>
                <div className="relative">
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {item.href === "/bolsista/mensagens" && unreadMessages > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 text-[9px] font-bold bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                      {unreadMessages > 99 ? "99+" : unreadMessages}
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <span className="flex items-center gap-2">
                    {item.name}
                    {item.href === "/bolsista/mensagens" && unreadMessages > 0 && (
                      <span className="text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-1.5 min-w-[18px] text-center">
                        {unreadMessages > 99 ? "99+" : unreadMessages}
                      </span>
                    )}
                  </span>
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Secondary Navigation (footer) */}
      {secondaryNavigation.length > 0 && (
        <div className="p-3 border-t border-border space-y-1">
          {secondaryNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn("nav-item", isActive && "active", collapsed && "justify-center px-2")}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
