import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Building2, CheckCircle2, FileText, Calendar as CalendarIcon, Clock, Pencil } from 'lucide-react';
import { differenceInMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface MasterProjectCardProps {
  projectId: string;
  title: string;
  financiador: string;
  status: 'active' | 'inactive' | 'archived';
  startDate?: string | null;
  endDate?: string | null;
}

function calcDurationMonths(start: string | null | undefined, end: string | null | undefined): number | null {
  if (!start || !end) return null;
  try {
    const months = differenceInMonths(new Date(end), new Date(start));
    return Math.max(1, months + 1);
  } catch {
    return null;
  }
}

export function MasterProjectCard({ projectId, title, financiador, status, startDate, endDate }: MasterProjectCardProps) {
  const queryClient = useQueryClient();
  const [localStartDate, setLocalStartDate] = useState<Date | undefined>(startDate ? new Date(startDate) : undefined);
  const [localEndDate, setLocalEndDate] = useState<Date | undefined>(endDate ? new Date(endDate) : undefined);
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const saveDate = async (field: 'start_date' | 'end_date', date: Date | undefined) => {
    const value = date ? format(date, 'yyyy-MM-dd') : null;
    const { error } = await supabase
      .from('thematic_projects')
      .update({ [field]: value })
      .eq('id', projectId);

    if (error) {
      toast.error('Erro ao salvar data');
      return;
    }
    toast.success('Data atualizada');
    queryClient.invalidateQueries({ queryKey: ['thematic-project', projectId] });
  };

  const handleStartSelect = (date: Date | undefined) => {
    setLocalStartDate(date);
    setStartOpen(false);
    saveDate('start_date', date);
  };

  const handleEndSelect = (date: Date | undefined) => {
    setLocalEndDate(date);
    setEndOpen(false);
    saveDate('end_date', date);
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-success text-success-foreground gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Ativo
          </Badge>
        );
      case 'inactive':
        return <Badge variant="secondary">Inativo</Badge>;
      case 'archived':
        return <Badge variant="outline">Arquivado</Badge>;
      default:
        return null;
    }
  };

  const effectiveStart = localStartDate ? format(localStartDate, 'yyyy-MM-dd') : null;
  const effectiveEnd = localEndDate ? format(localEndDate, 'yyyy-MM-dd') : null;
  const duracaoMeses = calcDurationMonths(effectiveStart, effectiveEnd);

  const formatDateDisplay = (d: Date) => {
    try {
      return format(d, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '';
    }
  };

  return (
    <Card className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Projeto Temático
                </span>
                {getStatusBadge()}
              </div>
              <h2 className="text-lg font-semibold text-foreground leading-tight max-w-3xl">
                {title}
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium">Financiador:</span>
                  <span>{financiador}</span>
                </div>

                {/* Editable dates */}
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  <Popover open={startOpen} onOpenChange={setStartOpen}>
                    <PopoverTrigger asChild>
                      <button
                        className={cn(
                          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted transition-colors text-sm",
                          !localStartDate && "text-muted-foreground/60 italic"
                        )}
                      >
                        {localStartDate ? formatDateDisplay(localStartDate) : 'Início'}
                        <Pencil className="h-3 w-3 opacity-50" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={localStartDate}
                        onSelect={handleStartSelect}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <span>—</span>
                  <Popover open={endOpen} onOpenChange={setEndOpen}>
                    <PopoverTrigger asChild>
                      <button
                        className={cn(
                          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted transition-colors text-sm",
                          !localEndDate && "text-muted-foreground/60 italic"
                        )}
                      >
                        {localEndDate ? formatDateDisplay(localEndDate) : 'Término'}
                        <Pencil className="h-3 w-3 opacity-50" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={localEndDate}
                        onSelect={handleEndSelect}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {duracaoMeses !== null && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Duração: {duracaoMeses} {duracaoMeses === 1 ? 'mês' : 'meses'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
