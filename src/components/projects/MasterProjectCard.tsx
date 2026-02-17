import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, CheckCircle2, FileText, Calendar, Clock } from 'lucide-react';
import { differenceInMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MasterProjectCardProps {
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

export function MasterProjectCard({ title, financiador, status, startDate, endDate }: MasterProjectCardProps) {
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

  const duracaoMeses = calcDurationMonths(startDate, endDate);

  const formatDate = (d: string) => {
    try {
      return format(new Date(d), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return d;
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
                {startDate && endDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(startDate)} — {formatDate(endDate)}</span>
                  </div>
                )}
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
