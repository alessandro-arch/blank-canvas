import { Menu } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { SidebarContent } from "./SidebarContent";

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close drawer on navigation
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Abrir menu de navegação"
        >
          <Menu className="w-6 h-6 text-foreground" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-72 border-r border-border">
        <SidebarContent collapsed={false} onToggleCollapse={() => setOpen(false)} isMobile />
      </SheetContent>
    </Sheet>
  );
}
