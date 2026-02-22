import { Search, ChevronDown, LogOut, Shield, User, Camera, Loader2, KeyRound, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getLoginRouteForPath } from "@/lib/login-redirect";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileSidebar } from "./MobileSidebar";

const orgRoleLabels: Record<string, string> = {
  admin: "Administrador",
  manager: "Gestor",
  auditor: "Auditor",
  reviewer: "Avaliador",
  beneficiary: "Bolsista",
};

export function Header() {
  const { user, signOut } = useAuth();
  const { currentMembership } = useOrganizationContext();
  const navigate = useNavigate();
  const location = useLocation();
  const { avatarUrl, uploading, uploadAvatar, refreshAvatar } = useAvatarUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    refreshAvatar();
  }, [refreshAvatar]);

  const getInitials = () => {
    const name = user?.user_metadata?.full_name;
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return parts[0].substring(0, 2).toUpperCase();
    }
    return user?.email?.substring(0, 2).toUpperCase() || "US";
  };

  const getRoleLabel = () => {
    const role = currentMembership?.role;
    if (role && orgRoleLabels[role]) return orgRoleLabels[role];
    return "Bolsista";
  };

  const isManagerOrAdmin = currentMembership?.role === "admin" || currentMembership?.role === "manager";

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadAvatar(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleLogout = async () => {
    const loginRoute = getLoginRouteForPath(location.pathname);
    // Limpar caches de organização
    localStorage.removeItem("bolsa_conecta_current_org");
    localStorage.removeItem("lastOrganizationId");
    await signOut();
    navigate(loginRoute, { replace: true });
  };

  return (
    <header className="h-16 bg-card border-b border-border px-4 md:px-6 flex items-center justify-between">
      {/* Left side: hamburger on mobile, search on desktop */}
      <div className="flex items-center gap-3">
        {isMobile && <MobileSidebar />}
        <div className={cn("relative", isMobile ? "hidden" : "w-96")}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar bolsistas, bolsas, documentos..."
            className="pl-10 bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Notifications */}
        <NotificationBell />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 min-h-[44px] p-1.5 rounded-lg hover:bg-muted transition-colors"
              aria-haspopup="menu"
            >
              <Avatar className="w-8 h-8">
                {avatarUrl && <AvatarImage src={avatarUrl} alt="Foto de perfil" />}
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="w-4 h-4 text-muted-foreground hidden md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-popover z-50" role="menu">
            {/* Avatar upload section */}
            <div className="px-2 py-2 flex items-center gap-3">
              <div className="relative group">
                <Avatar className="w-12 h-12">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt="Foto de perfil" />}
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={handleAvatarClick}
                  disabled={uploading}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0]}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
                      isManagerOrAdmin ? "bg-primary text-primary-foreground" : "bg-info text-white"
                    )}
                  >
                    {isManagerOrAdmin ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {getRoleLabel()}
                  </span>
                </div>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            <DropdownMenuSeparator />
            {/* Alterar senha */}
            <DropdownMenuItem onClick={() => navigate("/alterar-senha")} role="menuitem">
              <KeyRound className="w-4 h-4 mr-2" />
              Alterar senha
            </DropdownMenuItem>
            {/* Minha Conta */}
            <DropdownMenuItem onClick={() => navigate("/minha-conta")} role="menuitem">
              <Settings className="w-4 h-4 mr-2" />
              Minha Conta
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* Sair */}
            <DropdownMenuItem
              onClick={handleLogout}
              role="menuitem"
              className="bg-primary text-primary-foreground font-bold hover:!bg-primary/90 focus:!bg-primary/90 focus:!text-primary-foreground rounded-md"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
