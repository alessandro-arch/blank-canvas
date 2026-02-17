import { useState } from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { SidebarContent } from "./SidebarContent";
import { MobileSidebar } from "./MobileSidebar";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useIsMobile();

  // On mobile, render nothing — MobileSidebar is rendered in Header
  if (isMobile) return null;

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col bg-card border-r border-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <SidebarContent
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />
    </aside>
  );
}

// Re-export for convenience
export { MobileSidebar } from "./MobileSidebar";
