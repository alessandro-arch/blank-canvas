import { useState } from 'react';
import { ChevronDown, ChevronRight, Users, FileText, CreditCard, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { ScholarsTableInCard } from './ScholarsTableInCard';
import type { ThematicProjectWithScholars, ScholarWithProject } from './types';

interface ThematicScholarCardProps {
  project: ThematicProjectWithScholars;
  scholars: ScholarWithProject[];
  onRefresh: () => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: 'Ativo', className: 'bg-success/10 text-success border-success/30' },
  paused: { label: 'Pausado', className: 'bg-warning/10 text-warning border-warning/30' },
  archived: { label: 'Arquivado', className: 'bg-muted text-muted-foreground border-muted' },
};

import { forwardRef } from 'react';

export const ThematicScholarCard = forwardRef<HTMLDivElement, ThematicScholarCardProps>(
  function ThematicScholarCard({ project, scholars, onRefresh }, ref) {
  const [isOpen, setIsOpen] = useState(false);

  const config = statusConfig[project.status] || statusConfig.active;

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-0">
            <Button
              variant="ghost"
              className="w-full h-auto p-5 justify-start hover:bg-muted/50 rounded-none"
            >
              <div className="flex items-start gap-4 w-full">
                {/* Expand Icon */}
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                  {isOpen ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </div>

                {/* Project Info */}
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={cn("text-xs", config.className)}>
                      {config.label}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-foreground truncate">
                    {project.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Building2 className="h-3.5 w-3.5" />
                    <span className="truncate">{project.sponsor_name}</span>
                  </div>
                </div>

                {/* KPIs */}
                <div className="hidden md:flex items-center gap-6 shrink-0">
                  {/* Scholars */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground mb-0.5">
                      <Users className="h-3.5 w-3.5" />
                      <span>Bolsistas</span>
                    </div>
                    <p className="text-lg font-semibold text-foreground">
                      {project.active_scholars_count}
                      <span className="text-muted-foreground font-normal text-sm">/{project.scholars_count}</span>
                    </p>
                  </div>

                  {/* Pending Reports */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground mb-0.5">
                      <FileText className="h-3.5 w-3.5" />
                      <span>Relatórios</span>
                    </div>
                    <p className={cn(
                      "text-lg font-semibold",
                      project.pending_reports_count > 0 ? "text-warning" : "text-foreground"
                    )}>
                      {project.pending_reports_count}
                    </p>
                  </div>

                  {/* Pending Payments */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground mb-0.5">
                      <CreditCard className="h-3.5 w-3.5" />
                      <span>Pagamentos</span>
                    </div>
                    <p className={cn(
                      "text-lg font-semibold",
                      project.pending_payments_count > 0 ? "text-warning" : "text-foreground"
                    )}>
                      {project.pending_payments_count}
                    </p>
                  </div>
                </div>
              </div>
            </Button>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t">
            <ScholarsTableInCard 
              scholars={scholars} 
              onRefresh={onRefresh}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
});

ThematicScholarCard.displayName = "ThematicScholarCard";
