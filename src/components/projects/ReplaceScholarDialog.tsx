import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';
import { format, addMonths, startOfMonth } from 'date-fns';

interface Scholar {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface ReplaceScholarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollmentId: string;
  previousScholarName: string;
  projectCode: string;
  projectTitle: string;
  totalInstallments: number;
  paidInstallments: number;
  monthlyAmount: number;
  projectEndDate: string;
  onSuccess: () => void;
}

export function ReplaceScholarDialog({
  open,
  onOpenChange,
  enrollmentId,
  previousScholarName,
  projectCode,
  projectTitle,
  totalInstallments,
  paidInstallments,
  monthlyAmount,
  projectEndDate,
  onSuccess,
}: ReplaceScholarDialogProps) {
  const remaining = totalInstallments - paidInstallments;
  const defaultStartDate = format(startOfMonth(addMonths(new Date(), 1)), 'yyyy-MM-dd');

  const [scholars, setScholars] = useState<Scholar[]>([]);
  const [loadingScholars, setLoadingScholars] = useState(true);
  const [selectedScholarId, setSelectedScholarId] = useState('');
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [newMonthlyAmount, setNewMonthlyAmount] = useState(monthlyAmount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    async function fetchScholars() {
      setLoadingScholars(true);
      setError(null);
      try {
        const { data: profiles, error: pErr } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .eq('is_active', true);
        if (pErr) throw pErr;

        const { data: roles, error: rErr } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'scholar');
        if (rErr) throw rErr;

        const scholarIds = new Set(roles?.map(r => r.user_id) || []);

        const { data: active, error: eErr } = await supabase
          .from('enrollments')
          .select('user_id')
          .eq('status', 'active');
        if (eErr) throw eErr;

        const enrolledIds = new Set(active?.map(e => e.user_id) || []);

        setScholars(
          (profiles || []).filter(p => scholarIds.has(p.user_id) && !enrolledIds.has(p.user_id))
        );
      } catch (err) {
        console.error('Error fetching scholars:', err);
        setError('Erro ao carregar bolsistas disponíveis.');
      } finally {
        setLoadingScholars(false);
      }
    }

    fetchScholars();
    setSelectedScholarId('');
    setStartDate(defaultStartDate);
    setNewMonthlyAmount(monthlyAmount);
    setError(null);
  }, [open, monthlyAmount, defaultStartDate]);

  const selectedScholar = scholars.find(s => s.user_id === selectedScholarId);

  const handleSubmit = async () => {
    setError(null);

    if (!selectedScholarId) {
      setError('Selecione o novo bolsista.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('replace_scholarship', {
        p_old_enrollment_id: enrollmentId,
        p_new_scholar_user_id: selectedScholarId,
        p_start_date: startDate,
        p_monthly_amount: newMonthlyAmount,
      });

      if (rpcError) throw rpcError;

      toast.success(`Substituição realizada! ${selectedScholar?.full_name} vinculado com ${remaining} parcelas.`);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      console.error('Replace scholarship error:', err);
      setError(err.message || 'Erro ao substituir bolsista.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setError(null);
      setSelectedScholarId('');
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
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Indicar Substituto</DialogTitle>
              <DialogDescription>
                Substituir bolsista no subprojeto {projectCode}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Summary */}
          <div className="p-3 rounded-lg bg-muted/50 space-y-2 border">
            <p className="text-sm font-medium">{projectTitle}</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>Bolsista anterior: <strong className="text-foreground">{previousScholarName}</strong></span>
              <span>Parcelas totais: {totalInstallments}</span>
              <span>Parcelas pagas: {paidInstallments}</span>
              <span className="text-primary font-medium">Parcelas para substituto: {remaining}</span>
            </div>
          </div>

          {/* Scholar selection */}
          <div className="space-y-2">
            <Label>Novo Bolsista *</Label>
            {loadingScholars ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando bolsistas disponíveis...
              </div>
            ) : scholars.length === 0 ? (
              <div className="p-4 rounded-lg bg-muted/50 border border-dashed text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhum bolsista disponível para atribuição.
                </p>
              </div>
            ) : (
              <Select value={selectedScholarId} onValueChange={setSelectedScholarId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um bolsista" />
                </SelectTrigger>
                <SelectContent>
                  {scholars.map((s) => (
                    <SelectItem key={s.user_id} value={s.user_id}>
                      <span className="font-medium">{s.full_name || 'Sem nome'}</span>
                      {s.email && <span className="text-muted-foreground ml-2">({s.email})</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Start date */}
          <div className="space-y-2">
            <Label>Data de início *</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={projectEndDate}
            />
          </div>

          {/* Monthly amount */}
          <div className="space-y-2">
            <Label>Valor mensal</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={newMonthlyAmount}
              onChange={(e) => setNewMonthlyAmount(parseFloat(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">
              Valor herdado do vínculo anterior. Edite se necessário.
            </p>
          </div>

          {/* Confirmation summary */}
          {selectedScholarId && (
            <div className="p-3 rounded-lg bg-accent/50 border">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Resumo da Substituição</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    <li>Novo bolsista: {selectedScholar?.full_name}</li>
                    <li>Parcelas: {remaining}</li>
                    <li>Início: {startDate}</li>
                    <li>Valor mensal: {formatCurrency(newMonthlyAmount)}</li>
                    <li>Vigência até: {projectEndDate}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !selectedScholarId || scholars.length === 0}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {loading ? 'Processando...' : 'Confirmar Substituição'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
