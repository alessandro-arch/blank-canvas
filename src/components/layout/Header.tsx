import { Search, ChevronDown, LogOut, Shield, User, Camera, Loader2, KeyRound } from "lucide-react";
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
import { useUserRole } from "@/hooks/useUserRole";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileSidebar } from "./MobileSidebar";

export function Header() {
  const { user, signOut } = useAuth();
  const { hasManagerAccess, role } = useUserRole();
  const navigate = useNavigate();
  const { avatarUrl, uploading, uploadAvatar, refreshAvatar } = useAvatarUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    refreshAvatar();
  }, [refreshAvatar]);

  const getInitials = (email: string) => {
    return email?.substring(0, 2).toUpperCase() || "US";
  };

  const getRoleLabel = () => {
    if (role === "admin") return "Administrador";
    if (role === "manager") return "Gestor";
    return "Bolsista";
  };

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
        {/* Change Password — hidden on mobile */}
        <Button
          variant="outline"
          size="sm"
          className="gap-2 hidden md:inline-flex"
          onClick={() => navigate("/alterar-senha")}
        >
          <KeyRound className="w-4 h-4" />
          Alterar senha
        </Button>

        {/* Notifications */}
        <NotificationBell />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted transition-colors">
              <Avatar className="w-8 h-8">
                {avatarUrl && <AvatarImage src={avatarUrl} alt="Foto de perfil" />}
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {getInitials(user?.email || "")}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="w-4 h-4 text-muted-foreground hidden md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {/* Avatar upload section */}
            <div className="px-2 py-2 flex items-center gap-3">
              <div className="relative group">
                <Avatar className="w-12 h-12">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt="Foto de perfil" />}
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {getInitials(user?.email || "")}
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
                      hasManagerAccess ? "bg-primary text-primary-foreground" : "bg-info text-white"
                    )}
                  >
                    {hasManagerAccess ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {getRoleLabel()}
                  </span>
                </div>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            <DropdownMenuSeparator />
            {/* Mobile-only: change password link */}
            {isMobile && (
              <DropdownMenuItem onClick={() => navigate("/alterar-senha")}>
                <KeyRound className="w-4 h-4 mr-2" />
                Alterar senha
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
