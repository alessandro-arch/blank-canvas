import { MessageSquare } from "lucide-react";
import { useSupportCenter } from "@/contexts/SupportCenterContext";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useAuth } from "@/contexts/AuthContext";

export function SupportCenterFAB() {
  const { open, isOpen } = useSupportCenter();
  const unreadCount = useUnreadMessages();
  const { user } = useAuth();

  if (isOpen || !user) return null;

  return (
    <button
      onClick={() => open()}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center group"
      aria-label="Abrir Central"
    >
      <MessageSquare className="w-6 h-6" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 text-[11px] font-bold bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
