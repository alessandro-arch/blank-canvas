import { X, Home, MessageSquare, Megaphone, HelpCircle } from "lucide-react";
import { useSupportCenter } from "@/contexts/SupportCenterContext";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { HomeTab } from "./tabs/HomeTab";
import { MessagesTab } from "./tabs/MessagesTab";
import { NewsTab } from "./tabs/NewsTab";
import { HelpCenterTab } from "./tabs/HelpCenterTab";

const tabs = [
  { key: "home" as const, label: "Home", icon: Home },
  { key: "messages" as const, label: "Mensagens", icon: MessageSquare },
  { key: "news" as const, label: "News", icon: Megaphone },
  { key: "help" as const, label: "Help Center", icon: HelpCircle },
];

export function SupportCenterDrawer() {
  const { isOpen, close, activeTab, setActiveTab } = useSupportCenter();
  const unreadCount = useUnreadMessages();

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    if (isOpen) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 md:bg-black/20"
        onClick={close}
      />

      {/* Panel */}
      <div className="fixed z-50 inset-0 md:inset-auto md:right-0 md:top-0 md:bottom-0 md:w-[420px] bg-background border-l border-border flex flex-col shadow-xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold">Central</h2>
          <button
            onClick={close}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "home" && <HomeTab />}
          {activeTab === "messages" && <MessagesTab />}
          {activeTab === "news" && <NewsTab />}
          {activeTab === "help" && <HelpCenterTab />}
        </div>

        {/* Bottom tabs */}
        <div className="border-t border-border flex">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors relative",
                  isActive
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {tab.key === "messages" && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-0.5 text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
