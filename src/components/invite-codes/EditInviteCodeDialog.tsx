import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { CalendarIcon, Edit, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface InviteCode {
  id: string;
  thematic_project_id: string;
  partner_company_id: string;
  code: string;
  status: string;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  created_by: string;
  created_at: string;
}

interface EditInviteCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inviteCode: InviteCode;
  onSuccess: () => void;
}

export function EditInviteCodeDialog({
  open,
  onOpenChange,
  inviteCode,
  onSuccess,
}: EditInviteCodeDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [maxUses, setMaxUses] = useState<string>('1');
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDate, setExpirationDate] = useState<Date | undefined>();

  // Initialize form with current values
  useEffect(() => {
    if (open && inviteCode) {
      // Set max uses
      if (inviteCode.max_uses === null) {
        setMaxUses('unlimited');
      } else {
        // Check if it matches predefined options
        const predefinedValues = ['1', '5', '10', '25', '50'];
        if (predefinedValues.includes(inviteCode.max_uses.toString())) {
          setMaxUses(inviteCode.max_uses.toString());
        } else {
          // Custom value - use the closest higher predefined value or 'custom'
          setMaxUses(inviteCode.max_uses.toString());
        }
      }
      
      // Set expiration
      if (inviteCode.expires_at) {
        setHasExpiration(true);
        setExpirationDate(new Date(inviteCode.expires_at));
      } else {
        setHasExpiration(false);
        setExpirationDate(undefined);
      }
    }
  }, [open, inviteCode]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    const newMaxUses = maxUses === 'unlimited' ? null : parseInt(maxUses);
    const newExpiresAt = hasExpiration && expirationDate 
      ? expirationDate.toISOString().split('T')[0] 
      : null;

    try {
      const { error } = await supabase
        .from('invite_codes')
        .update({
          max_uses: newMaxUses,
          expires_at: newExpiresAt,
        })
        .eq('id', inviteCode.id);

      if (error) throw error;

      // Log audit
      await supabase.rpc('insert_audit_log', {
        p_action: 'UPDATE_INVITE_CODE',
        p_entity_type: 'invite_code',
        p_entity_id: inviteCode.id,
        p_details: {
          code: inviteCode.code,
          changes: {
            max_uses: { from: inviteCode.max_uses, to: newMaxUses },
            expires_at: { from: inviteCode.expires_at, to: newExpiresAt },
          }
        },
        p_previous_value: {
          max_uses: inviteCode.max_uses,
          expires_at: inviteCode.expires_at,
        },
        p_new_value: {
          max_uses: newMaxUses,
          expires_at: newExpiresAt,
        },
      });

      toast.success('Código atualizado com sucesso!');
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error updating invite code:', error);
      toast.error('Erro ao atualizar código', { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Get available max_uses options based on current used_count
  const getMaxUsesOptions = () => {
    const usedCount = inviteCode.used_count;
    const options = [
      { value: '1', label: '1 uso' },
      { value: '5', label: '5 usos' },
      { value: '10', label: '10 usos' },
      { value: '25', label: '25 usos' },
      { value: '50', label: '50 usos' },
      { value: 'unlimited', label: 'Ilimitado' },
    ];
    
    // Filter options to only show those >= used_count
    return options.filter(opt => {
      if (opt.value === 'unlimited') return true;
      return parseInt(opt.value) >= usedCount;
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-primary" />
            Editar Código de Convite
          </DialogTitle>
          <DialogDescription>
            Altere o limite de usos ou a validade do código <code className="font-mono bg-muted px-1 rounded">{inviteCode.code}</code>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current usage info */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Uso atual:</strong> {inviteCode.used_count} {inviteCode.used_count === 1 ? 'uso' : 'usos'} registrados
            </p>
          </div>

          {/* Max Uses */}
          <div className="space-y-2">
            <Label htmlFor="maxUses">Limite de usos</Label>
            <Select value={maxUses} onValueChange={setMaxUses}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getMaxUsesOptions().map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              O limite deve ser maior ou igual ao número de usos já registrados ({inviteCode.used_count}).
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

        <DialogFooter>
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
                Salvando...
              </>
            ) : (
              <>
                <Edit className="h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
