import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Edit, Save, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FinancialInfoSectionProps {
  projectId: string;
  valorTotalProjeto: number;
  taxaAdministrativaPercentual: number;
  impostosPercentual: number;
  valorTotalBolsas: number;
  valorTotalEstimadoBolsas: number;
  onUpdate: () => void;
}

export function FinancialInfoSection({
  projectId,
  valorTotalProjeto,
  taxaAdministrativaPercentual,
  impostosPercentual,
  valorTotalBolsas,
  valorTotalEstimadoBolsas,
  onUpdate,
}: FinancialInfoSectionProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    valor_total_projeto: valorTotalProjeto,
    taxa_administrativa_percentual: taxaAdministrativaPercentual,
    impostos_percentual: impostosPercentual,
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const valorTaxaAdministrativa = (formData.valor_total_projeto * formData.taxa_administrativa_percentual) / 100;
  const valorImpostos = (formData.valor_total_projeto * formData.impostos_percentual) / 100;

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('thematic_projects')
        .update({
          valor_total_projeto: formData.valor_total_projeto,
          taxa_administrativa_percentual: formData.taxa_administrativa_percentual,
          impostos_percentual: formData.impostos_percentual,
        } as any)
        .eq('id', projectId);

      if (error) throw error;
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
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Valor Total do Projeto */}
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

          {/* Taxa Administrativa */}
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

          {/* Valor Taxa Administrativa (calculado) */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Valor Taxa Administrativa</Label>
            <p className="text-lg font-semibold text-muted-foreground">{formatCurrency(editing ? valorTaxaAdministrativa : (valorTotalProjeto * taxaAdministrativaPercentual) / 100)}</p>
          </div>

          {/* Impostos */}
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

          {/* Valor Impostos (calculado) */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Valor Impostos</Label>
            <p className="text-lg font-semibold text-muted-foreground">{formatCurrency(editing ? valorImpostos : (valorTotalProjeto * impostosPercentual) / 100)}</p>
          </div>

          {/* Valor Total Bolsas (soma) */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Total Mensal em Bolsas</Label>
            <p className="text-lg font-semibold text-primary">{formatCurrency(valorTotalBolsas)}</p>
          </div>

          {/* Valor Total Estimado Bolsas */}
          <div className="space-y-1 md:col-span-2 lg:col-span-3">
            <Label className="text-xs text-muted-foreground">Valor Total Estimado de Bolsas (considerando vigência)</Label>
            <p className="text-xl font-bold text-primary">{formatCurrency(valorTotalEstimadoBolsas)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
