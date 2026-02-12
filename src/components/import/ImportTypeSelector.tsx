import { ImportType, IMPORT_TYPES } from '@/types/import';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Landmark, FolderKanban, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportTypeSelectorProps {
  selected: ImportType | null;
  onSelect: (type: ImportType) => void;
}

const ICONS: Record<ImportType, React.ReactNode> = {
  scholars: <Users className="w-6 h-6" />,
  bank_accounts: <Landmark className="w-6 h-6" />,
  projects: <FolderKanban className="w-6 h-6" />,
  enrollments: <Link2 className="w-6 h-6" />,
};

export function ImportTypeSelector({ selected, onSelect }: ImportTypeSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {(Object.keys(IMPORT_TYPES) as ImportType[]).map((type) => {
        const config = IMPORT_TYPES[type];
        const isSelected = selected === type;

        return (
          <Card
            key={type}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              isSelected 
                ? "ring-2 ring-primary border-primary bg-primary/5" 
                : "hover:border-primary/50"
            )}
            onClick={() => onSelect(type)}
          >
            <CardContent className="p-4">
              <div className={cn(
                "w-12 h-12 rounded-lg flex items-center justify-center mb-3",
                isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {ICONS[type]}
              </div>
              <h3 className="font-semibold text-foreground mb-1">{config.label}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {config.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
