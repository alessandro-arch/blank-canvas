import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";

interface MobileFiltersDrawerProps {
  /** Number of active filters (excluding search) to show badge */
  activeCount: number;
  onApply: () => void;
  onClear: () => void;
  children: React.ReactNode;
}

export function MobileFiltersDrawer({
  activeCount,
  onApply,
  onClear,
  children,
}: MobileFiltersDrawerProps) {
  const [open, setOpen] = useState(false);

  const handleApply = () => {
    onApply();
    setOpen(false);
  };

  const handleClear = () => {
    onClear();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros
          {activeCount > 0 && (
            <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-4 overflow-y-auto">
          {children}
        </div>

        <SheetFooter className="flex-row gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1 min-h-[44px]"
            onClick={handleClear}
          >
            <X className="h-4 w-4 mr-2" />
            Limpar
          </Button>
          <Button
            className="flex-1 min-h-[44px]"
            onClick={handleApply}
          >
            Aplicar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
