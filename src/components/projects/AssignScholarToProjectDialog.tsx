import { useState, useEffect, forwardRef } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Project {
  id: string;
  code: string;
  title: string;
  modalidade_bolsa: string | null;
  valor_mensal: number;
  start_date: string;
  end_date: string;
}

interface Scholar {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface AssignScholarToProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onSuccess: () => void;
}

export function AssignScholarToProjectDialog({
  open,
  onOpenChange,
  project,
  onSuccess,
}: AssignScholarToProjectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [scholars, setScholars] = useState<Scholar[]>([]);
  const [loadingScholars, setLoadingScholars] = useState(true);
  const [selectedScholarId, setSelectedScholarId] = useState('');
  const [startDate, setStartDate] = useState(project.start_date);
  const [endDate, setEndDate] = useState(project.end_date);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  // Fetch available scholars (those without active enrollment)
  useEffect(() => {
    async function fetchScholars() {
      setLoadingScholars(true);
      setError(null);
      try {
        // Get all active profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .eq('is_active', true);

        if (profilesError) throw profilesError;

        // Get scholars with scholar role
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'scholar');

        if (rolesError) throw rolesError;

        const scholarUserIds = new Set(roles?.map(r => r.user_id) || []);

        // Get scholars with ANY active enrollment (exclusivity rule)
        const { data: activeEnrollments, error: enrollmentsError } = await supabase
          .from('enrollments')
          .select('user_id')
          .eq('status', 'active');

        if (enrollmentsError) throw enrollmentsError;

        const enrolledUserIds = new Set(activeEnrollments?.map(e => e.user_id) || []);

        // Filter to scholars without any active enrollment
        const availableScholars = (profiles || []).filter(
          p => scholarUserIds.has(p.user_id) && !enrolledUserIds.has(p.user_id)
        );

        setScholars(availableScholars);
      } catch (err) {
        console.error('Error fetching scholars:', err);
        setError('Erro ao carregar bolsistas disponíveis.');
      } finally {
        setLoadingScholars(false);
      }
    }

    if (open) {
      fetchScholars();
      setSelectedScholarId('');
      setStartDate(project.start_date);
      setEndDate(project.end_date);
      setError(null);
      setFieldError(null);
    }
  }, [open, project.id, project.start_date, project.end_date]);

  const calculateInstallments = () => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end > start) {
        return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
      }
    }
    return 1;
  };

  const selectedScholar = scholars.find(s => s.user_id === selectedScholarId);

  const handleSubmit = async () => {
    setError(null);
    setFieldError(null);

    // Client-side validation
    if (!selectedScholarId) {
      setFieldError('scholar');
      setError('Selecione um bolsista.');
      return;
    }

    if (!startDate) {
      setFieldError('startDate');
      setError('Informe a data de início.');
      return;
    }

    if (!endDate) {
      setFieldError('endDate');
      setError('Informe a data de término.');
      return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
      setFieldError('endDate');
      setError('A data de término deve ser posterior à data de início.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('assign-scholar-to-project', {
        body: {
          scholar_id: selectedScholarId,
          project_id: project.id,
          start_date: startDate,
          end_date: endDate,
        },
      });

      // Handle function invocation error - try to extract message from error context
      if (fnError) {
        console.error('Function error:', fnError);
        
        // Try to parse error message from the error context
        let errorMessage = 'Erro de comunicação com o servidor. Tente novamente.';
        try {
          // fnError.context may contain the response body
          if (fnError.context && typeof fnError.context === 'object') {
            const ctx = fnError.context as { error?: string; code?: string };
            if (ctx.error) {
              errorMessage = ctx.error;
              // Set field error based on code
              if (ctx.code === 'DUPLICATE_ENROLLMENT') {
                setFieldError('scholar');
              } else if (ctx.code === 'SCHOLAR_HAS_ACTIVE_ENROLLMENT') {
                setFieldError('scholar');
              }
            }
          }
        } catch (e) {
          console.error('Error parsing fnError context:', e);
        }
        
        setError(errorMessage);
        return;
      }

      // Handle error in response data
      if (data?.error) {
        console.error('Backend error:', data.error, data.code);
        setError(data.error);
        
        // Highlight specific field based on error code
        if (data.code === 'MISSING_SCHOLAR_ID' || data.code === 'SCHOLAR_HAS_ACTIVE_ENROLLMENT' || data.code === 'DUPLICATE_ENROLLMENT') {
          setFieldError('scholar');
        } else if (data.code === 'MISSING_START_DATE' || data.code === 'DATE_OUT_OF_PROJECT_RANGE') {
          setFieldError('startDate');
        } else if (data.code === 'MISSING_END_DATE' || data.code === 'INVALID_DATE_RANGE') {
          setFieldError('endDate');
        }
        return;
      }

      toast.success(data?.message || `Bolsista ${data?.scholar_name || selectedScholar?.full_name} vinculado com sucesso!`);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Atribuir Bolsista</DialogTitle>
              <DialogDescription>
                Vincular bolsista ao subprojeto {project.code}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Project Info Summary */}
          <div className="p-3 rounded-lg bg-muted/50 space-y-2 border">
            <p className="text-sm font-medium">{project.title}</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>Código: {project.code}</span>
              <span>Modalidade: {project.modalidade_bolsa || 'N/A'}</span>
              <span>
                Valor: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(project.valor_mensal)}
              </span>
              <span>Período: {project.start_date} a {project.end_date}</span>
            </div>
          </div>

          {/* Scholar Selection */}
          <div className="space-y-2">
            <Label className={fieldError === 'scholar' ? 'text-destructive' : ''}>
              Bolsista *
            </Label>
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
                <p className="text-xs text-muted-foreground mt-1">
                  Todos os bolsistas já possuem subprojetos ativos.
                </p>
              </div>
            ) : (
              <Select value={selectedScholarId} onValueChange={setSelectedScholarId}>
                <SelectTrigger className={fieldError === 'scholar' ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione um bolsista" />
                </SelectTrigger>
                <SelectContent>
                  {scholars.map((scholar) => (
                    <SelectItem key={scholar.user_id} value={scholar.user_id}>
                      <span className="font-medium">{scholar.full_name || 'Sem nome'}</span>
                      {scholar.email && (
                        <span className="text-muted-foreground ml-2">({scholar.email})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className={fieldError === 'startDate' ? 'text-destructive' : ''}>
                Data de Início *
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={fieldError === 'startDate' ? 'border-destructive' : ''}
                min={project.start_date}
                max={project.end_date}
              />
            </div>
            <div className="space-y-2">
              <Label className={fieldError === 'endDate' ? 'text-destructive' : ''}>
                Data de Término *
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={fieldError === 'endDate' ? 'border-destructive' : ''}
                min={project.start_date}
                max={project.end_date}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Total de parcelas calculado: <strong>{calculateInstallments()}</strong>
          </p>

          {/* Summary before confirmation */}
          {selectedScholarId && (
            <div className="p-3 rounded-lg bg-accent/50 border">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">
                    Resumo do Vínculo
                  </p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    <li>Bolsista: {selectedScholar?.full_name || 'N/A'}</li>
                    <li>Subprojeto: {project.code} - {project.title}</li>
                    <li>Período: {startDate} a {endDate}</li>
                    <li>
                      Valor mensal: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(project.valor_mensal)}
                    </li>
                    <li>Parcelas: {calculateInstallments()}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || scholars.length === 0}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {loading ? 'Processando...' : 'Confirmar Vínculo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
