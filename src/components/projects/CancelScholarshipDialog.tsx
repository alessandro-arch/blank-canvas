import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, Ban } from 'lucide-react';
import { format, addMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CancelScholarshipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollmentId: string;
  scholarName: string;
  projectCode: string;
  projectTitle: string;
  totalInstallments: number;
  paidInstallments: number;
  monthlyAmount: number;
  onSuccess: () => void;
}

export function CancelScholarshipDialog({
  open,
  onOpenChange,
  enrollmentId,
  scholarName,
  projectCode,
  projectTitle,
  totalInstallments,
  paidInstallments,
  monthlyAmount,
  onSuccess,
}: CancelScholarshipDialogProps) {
  const defaultEffectiveDate = format(startOfMonth(addMonths(new Date(), 1)), 'yyyy-MM-dd');
  const [effectiveDate, setEffectiveDate] = useState(defaultEffectiveDate);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = totalInstallments - paidInstallments;

  const handleSubmit = async () => {
    setError(null);

    if (!reason.trim()) {
      setError('O motivo do cancelamento é obrigatório.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('cancel_scholarship', {
        p_enrollment_id: enrollmentId,
        p_reason: reason.trim(),
        p_effective_date: effectiveDate,
      });

      if (rpcError) throw rpcError;

      toast.success(`Bolsa de ${scholarName} cancelada com sucesso.`);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      console.error('Cancel scholarship error:', err);
      setError(err.message || 'Erro ao cancelar bolsa.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setReason('');
      setEffectiveDate(defaultEffectiveDate);
      setError(null);
    }
    onOpenChange(val);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <Ban className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>Cancelar Bolsa</DialogTitle>
              <DialogDescription>
                Cancelar vínculo do bolsista com o subprojeto {projectCode}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Info summary */}
          <div className="p-3 rounded-lg bg-muted/50 space-y-2 border">
            <p className="text-sm font-medium">{projectTitle}</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>Bolsista: <strong className="text-foreground">{scholarName}</strong></span>
              <span>Valor mensal: {formatCurrency(monthlyAmount)}</span>
              <span>Parcelas totais: {totalInstallments}</span>
              <span>Parcelas pagas: {paidInstallments}</span>
            </div>
            <div className="pt-1 border-t">
              <p className="text-sm font-medium text-warning">
                Parcelas restantes: {remaining}
              </p>
            </div>
          </div>

          {/* Effective date */}
          <div className="space-y-2">
            <Label>Data de efeito do cancelamento *</Label>
            <Input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Pagamentos a partir deste mês serão cancelados. Parcelas já pagas não serão alteradas.
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Motivo do cancelamento *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo do cancelamento..."
              rows={3}
            />
          </div>

          {/* Warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Esta ação não pode ser desfeita. O histórico de pagamentos e relatórios será preservado.
              Após o cancelamento, será possível indicar um substituto para as {remaining} parcelas restantes.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Voltar
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={loading || !reason.trim()}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {loading ? 'Cancelando...' : 'Confirmar Cancelamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
