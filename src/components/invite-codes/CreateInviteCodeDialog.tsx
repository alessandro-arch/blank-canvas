import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { CalendarIcon, Copy, Loader2, Ticket, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ThematicProject {
  id: string;
  title: string;
  sponsor_name: string;
}

interface CreateInviteCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateInviteCodeDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateInviteCodeDialogProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  
  // Thematic projects state
  const [thematicProjects, setThematicProjects] = useState<ThematicProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  
  // Form state
  const [maxUses, setMaxUses] = useState<string>('1');
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDate, setExpirationDate] = useState<Date | undefined>();

  // Fetch thematic projects on mount - filtered by organization
  useEffect(() => {
    const fetchThematicProjects = async () => {
      if (!currentOrganization) return;
      
      setIsLoadingProjects(true);
      try {
        const { data, error } = await supabase
          .from('thematic_projects')
          .select('id, title, sponsor_name')
          .eq('status', 'active')
          .eq('organization_id', currentOrganization.id)
          .order('title');
        
        if (error) throw error;
        setThematicProjects(data || []);
        
        // Auto-select if only one project
        if (data && data.length === 1) {
          setSelectedProjectId(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching thematic projects:', error);
      } finally {
        setIsLoadingProjects(false);
      }
    };

    if (open) {
      fetchThematicProjects();
    }
  }, [open, currentOrganization]);

  const selectedProject = thematicProjects.find(p => p.id === selectedProjectId);

  const resetForm = () => {
    setMaxUses('1');
    setHasExpiration(false);
    setExpirationDate(undefined);
    setGeneratedCode(null);
    setSelectedProjectId('');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const generateCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'SC-';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    if (!currentOrganization) {
      toast.error('Nenhuma organização selecionada');
      return;
    }

    if (!selectedProjectId) {
      toast.error('Selecione um Projeto Temático');
      return;
    }

    setIsLoading(true);
    const code = generateCode();
    
    // Generate a unique ID for partner_company (placeholder, not used in this flow)
    const partnerCompanyId = crypto.randomUUID();

    try {
      const { data, error } = await supabase
        .from('invite_codes')
        .insert({
          thematic_project_id: selectedProjectId,
          partner_company_id: partnerCompanyId,
          code,
          max_uses: maxUses === 'unlimited' ? null : parseInt(maxUses),
          expires_at: hasExpiration && expirationDate ? expirationDate.toISOString().split('T')[0] : null,
          created_by: user.id,
          organization_id: currentOrganization.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit
      await supabase.rpc('insert_audit_log', {
        p_action: 'CREATE_INVITE_CODE',
        p_entity_type: 'invite_code',
        p_entity_id: data.id,
        p_details: {
          code,
          thematic_project_title: selectedProject?.title,
          max_uses: maxUses === 'unlimited' ? null : parseInt(maxUses),
          expires_at: hasExpiration && expirationDate ? expirationDate.toISOString() : null,
        },
        p_new_value: data,
      });

      setGeneratedCode(code);
      toast.success('Código gerado com sucesso!');
      onSuccess();
    } catch (error: any) {
      console.error('Error creating invite code:', error);
      toast.error('Erro ao gerar código', { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyAndClose = async () => {
    if (generatedCode) {
      await navigator.clipboard.writeText(generatedCode);
      toast.success('Código copiado!');
    }
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            {generatedCode ? 'Código Gerado' : 'Gerar Código de Convite'}
          </DialogTitle>
          <DialogDescription>
            {generatedCode 
              ? 'O código foi gerado com sucesso. Copie e envie para o bolsista autorizado.'
              : 'Crie um código de acesso para autorizar novos bolsistas no Projeto Temático.'
            }
          </DialogDescription>
        </DialogHeader>

        {generatedCode ? (
          <div className="py-6">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-muted rounded-lg w-full">
                <p className="text-xs text-muted-foreground text-center mb-2">Código de Convite</p>
                <div className="flex items-center justify-center gap-3">
                  <code className="text-2xl font-mono font-bold text-primary">
                    {generatedCode}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCode);
                      toast.success('Código copiado!');
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="text-sm text-center text-muted-foreground space-y-1">
                <p>
                  <strong>Usos permitidos:</strong> {maxUses === 'unlimited' ? 'Ilimitado' : maxUses}
                </p>
                {hasExpiration && expirationDate && (
                  <p>
                    <strong>Válido até:</strong> {format(expirationDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                )}
              </div>

              <Alert className="border-primary/20 bg-primary/5">
                <Info className="h-4 w-4 text-primary" />
                <AlertDescription className="text-xs">
                  Envie este código apenas para bolsistas autorizados. 
                  Usuários não autorizados podem ser excluídos após o cadastro.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Thematic Project Selector */}
            <div className="space-y-2">
              <Label htmlFor="thematicProject">Projeto Temático</Label>
              <Select 
                value={selectedProjectId} 
                onValueChange={setSelectedProjectId}
                disabled={isLoadingProjects}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingProjects ? "Carregando..." : "Selecione o Projeto Temático"} />
                </SelectTrigger>
                <SelectContent>
                  {thematicProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex flex-col">
                        <span className="line-clamp-1">{project.title}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProject && (
                <p className="text-xs text-muted-foreground">
                  Financiador: {selectedProject.sponsor_name}
                </p>
              )}
            </div>

            {/* Max Uses */}
            <div className="space-y-2">
              <Label htmlFor="maxUses">Limite de usos</Label>
              <Select value={maxUses} onValueChange={setMaxUses}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 uso (código individual)</SelectItem>
                  <SelectItem value="5">5 usos</SelectItem>
                  <SelectItem value="10">10 usos</SelectItem>
                  <SelectItem value="25">25 usos</SelectItem>
                  <SelectItem value="50">50 usos</SelectItem>
                  <SelectItem value="unlimited">Ilimitado</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Quantos bolsistas podem se cadastrar usando este código.
              </p>
            </div>

            {/* Expiration */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="expiration">Data de expiração</Label>
                <Switch
                  id="expiration"
                  checked={hasExpiration}
                  onCheckedChange={setHasExpiration}
                />
              </div>
              
              {hasExpiration && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !expirationDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expirationDate 
                        ? format(expirationDate, "PPP", { locale: ptBR })
                        : "Selecione uma data"
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={expirationDate}
                      onSelect={setExpirationDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {generatedCode ? (
            <Button onClick={handleCopyAndClose} className="gap-2">
              <Copy className="h-4 w-4" />
              Copiar e Fechar
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Ticket className="h-4 w-4" />
                    Gerar Código
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
