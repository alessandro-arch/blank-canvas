import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DollarSign, Edit, Save, X, Loader2, TrendingUp, ArrowUpDown, Percent } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FinancialInfoSectionProps {
  projectId: string;
  valorTotalProjeto: number;
  taxaAdministrativaPercentual: number;
  impostosPercentual: number;
  valorTotalBolsasMensal: number;
  valorTotalEstimadoBolsas: number;
  duracaoMesesProjeto: number | null;
  valorTotalAtribuidoAuto: number;
  atribuicaoModo: string;
  valorTotalAtribuidoManual: number;
  atribuicaoJustificativa: string;
  onUpdate: () => void;
}

export function FinancialInfoSection({
  projectId,
  valorTotalProjeto,
  taxaAdministrativaPercentual,
  impostosPercentual,
  valorTotalBolsasMensal,
  valorTotalEstimadoBolsas,
  duracaoMesesProjeto,
  valorTotalAtribuidoAuto,
  atribuicaoModo,
  valorTotalAtribuidoManual,
  atribuicaoJustificativa,
  onUpdate,
}: FinancialInfoSectionProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    valor_total_projeto: valorTotalProjeto,
    taxa_administrativa_percentual: taxaAdministrativaPercentual,
    impostos_percentual: impostosPercentual,
    atribuicao_modo: atribuicaoModo,
    valor_total_atribuido_bolsas_manual: valorTotalAtribuidoManual,
    atribuicao_justificativa: atribuicaoJustificativa,
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const valorTaxaAdministrativa = (formData.valor_total_projeto * formData.taxa_administrativa_percentual) / 100;
  const valorImpostos = (formData.valor_total_projeto * formData.impostos_percentual) / 100;

  // Determine effective attributed value
  const valorAtribuido = atribuicaoModo === 'manual' ? valorTotalAtribuidoManual : valorTotalAtribuidoAuto;
  const diferenca = valorTotalEstimadoBolsas - valorAtribuido;
  const percentualAtribuido = valorTotalEstimadoBolsas > 0 ? (valorAtribuido / valorTotalEstimadoBolsas) * 100 : 0;

  const handleSave = async () => {
    if (formData.atribuicao_modo === 'manual' && !formData.atribuicao_justificativa.trim()) {
      toast.error('Justificativa é obrigatória no modo manual');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('thematic_projects')
        .update({
          valor_total_projeto: formData.valor_total_projeto,
          taxa_administrativa_percentual: formData.taxa_administrativa_percentual,
          impostos_percentual: formData.impostos_percentual,
          atribuicao_modo: formData.atribuicao_modo,
          valor_total_atribuido_bolsas_manual: formData.atribuicao_modo === 'manual' ? formData.valor_total_atribuido_bolsas_manual : null,
          atribuicao_justificativa: formData.atribuicao_modo === 'manual' ? formData.atribuicao_justificativa : null,
        } as any)
        .eq('id', projectId);

      if (error) throw error;

      // Audit log for manual override
      if (formData.atribuicao_modo === 'manual') {
        await supabase.rpc('insert_audit_log', {
          p_action: 'atribuicao_manual_bolsas',
          p_entity_type: 'thematic_project',
          p_entity_id: projectId,
          p_details: {
            modo: 'manual',
            valor_manual: formData.valor_total_atribuido_bolsas_manual,
            valor_auto: valorTotalAtribuidoAuto,
            justificativa: formData.atribuicao_justificativa,
          },
          p_previous_value: { modo: atribuicaoModo, valor: valorAtribuido },
          p_new_value: { modo: 'manual', valor: formData.valor_total_atribuido_bolsas_manual },
        });
      }

      toast.success('Informações financeiras atualizadas');
      setEditing(false);
      onUpdate();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar informações financeiras');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      valor_total_projeto: valorTotalProjeto,
      taxa_administrativa_percentual: taxaAdministrativaPercentual,
      impostos_percentual: impostosPercentual,
      atribuicao_modo: atribuicaoModo,
      valor_total_atribuido_bolsas_manual: valorTotalAtribuidoManual,
      atribuicao_justificativa: atribuicaoJustificativa,
    });
    setEditing(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-5 w-5 text-primary" />
          Informações Financeiras
        </CardTitle>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Salvar
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Campos editáveis do projeto */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Valor Total do Projeto</Label>
            {editing ? (
              <Input
                type="number"
                step="0.01"
                value={formData.valor_total_projeto}
                onChange={(e) => setFormData(prev => ({ ...prev, valor_total_projeto: parseFloat(e.target.value) || 0 }))}
              />
            ) : (
              <p className="text-lg font-semibold">{formatCurrency(valorTotalProjeto)}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Taxa Administrativa (%)</Label>
            {editing ? (
              <Input
                type="number"
                step="0.01"
                value={formData.taxa_administrativa_percentual}
                onChange={(e) => setFormData(prev => ({ ...prev, taxa_administrativa_percentual: parseFloat(e.target.value) || 0 }))}
              />
            ) : (
              <p className="text-lg font-semibold">{taxaAdministrativaPercentual}%</p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Valor Taxa Administrativa</Label>
            <p className="text-lg font-semibold text-muted-foreground">
              {formatCurrency(editing ? valorTaxaAdministrativa : (valorTotalProjeto * taxaAdministrativaPercentual) / 100)}
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Impostos (%)</Label>
            {editing ? (
              <Input
                type="number"
                step="0.01"
                value={formData.impostos_percentual}
                onChange={(e) => setFormData(prev => ({ ...prev, impostos_percentual: parseFloat(e.target.value) || 0 }))}
              />
            ) : (
              <p className="text-lg font-semibold">{impostosPercentual}%</p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Valor Impostos</Label>
            <p className="text-lg font-semibold text-muted-foreground">
              {formatCurrency(editing ? valorImpostos : (valorTotalProjeto * impostosPercentual) / 100)}
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Total Mensal em Bolsas</Label>
            <p className="text-lg font-semibold text-primary">{formatCurrency(valorTotalBolsasMensal)}</p>
          </div>
        </div>

        <Separator />

        {/* Bloco de Bolsas Estimado vs Atribuído */}
        <div>
          <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Bolsas — Estimado vs Atribuído
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Estimado (read-only) */}
            <div className="border rounded-lg p-4 bg-muted/30 space-y-1">
              <Label className="text-xs text-muted-foreground">
                Valor Total Estimado de Bolsas
                {duracaoMesesProjeto && (
                  <span className="ml-1">({duracaoMesesProjeto} meses × {formatCurrency(valorTotalBolsasMensal)}/mês)</span>
                )}
              </Label>
              <p className="text-xl font-bold text-primary">{formatCurrency(valorTotalEstimadoBolsas)}</p>
              {!duracaoMesesProjeto && (
                <p className="text-xs text-warning">Defina as datas do projeto para calcular</p>
              )}
            </div>

            {/* Atribuído */}
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">
                  Valor Total Atribuído com Bolsas
                </Label>
                {editing && (
                  <Select
                    value={formData.atribuicao_modo}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, atribuicao_modo: v }))}
                  >
                    <SelectTrigger className="w-[120px] h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Automático</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {!editing && (
                  <Badge variant={atribuicaoModo === 'manual' ? 'secondary' : 'outline'} className="text-xs">
                    {atribuicaoModo === 'manual' ? 'Manual' : 'Automático'}
                  </Badge>
                )}
              </div>

              {editing && formData.atribuicao_modo === 'manual' ? (
                <div className="space-y-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valor_total_atribuido_bolsas_manual}
                    onChange={(e) => setFormData(prev => ({ ...prev, valor_total_atribuido_bolsas_manual: parseFloat(e.target.value) || 0 }))}
                    placeholder="Valor manual"
                  />
                  <Textarea
                    value={formData.atribuicao_justificativa}
                    onChange={(e) => setFormData(prev => ({ ...prev, atribuicao_justificativa: e.target.value }))}
                    placeholder="Justificativa obrigatória para modo manual..."
                    className="min-h-[60px] text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Valor automático: {formatCurrency(valorTotalAtribuidoAuto)}
                  </p>
                </div>
              ) : (
                <p className="text-xl font-bold">{formatCurrency(valorAtribuido)}</p>
              )}

              {!editing && atribuicaoModo === 'manual' && atribuicaoJustificativa && (
                <p className="text-xs text-muted-foreground italic">
                  Justificativa: {atribuicaoJustificativa}
                </p>
              )}
            </div>
          </div>

          {/* Indicadores */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="border rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-xs text-muted-foreground">Diferença (Estimado - Atribuído)</Label>
              </div>
              <p className={`text-lg font-bold ${diferenca >= 0 ? 'text-success' : 'text-destructive'}`}>
                {diferenca >= 0 ? '+' : ''}{formatCurrency(diferenca)}
              </p>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-xs text-muted-foreground">% Atribuído</Label>
              </div>
              <p className={`text-lg font-bold ${percentualAtribuido <= 100 ? 'text-primary' : 'text-destructive'}`}>
                {percentualAtribuido.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
