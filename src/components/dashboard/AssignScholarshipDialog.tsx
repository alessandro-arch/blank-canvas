import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, GraduationCap, FolderOpen } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { MODALITY_LABELS } from "@/lib/modality-labels";

type GrantModality = Database["public"]["Enums"]["grant_modality"];

interface ThematicProject {
  id: string;
  title: string;
  sponsor_name: string;
}

interface Subproject {
  id: string;
  code: string;
  title: string;
  thematic_project_id: string;
  valor_mensal: number;
  modalidade_bolsa: string | null;
}

interface AssignScholarshipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string | null;
  onSuccess: () => void;
}

export function AssignScholarshipDialog({
  open,
  onOpenChange,
  userId,
  userName,
  onSuccess,
}: AssignScholarshipDialogProps) {
  const [loading, setLoading] = useState(false);
  const [thematicProjects, setThematicProjects] = useState<ThematicProject[]>([]);
  const [subprojects, setSubprojects] = useState<Subproject[]>([]);
  const [loadingThematic, setLoadingThematic] = useState(true);
  const [loadingSubprojects, setLoadingSubprojects] = useState(false);
  
  // Form state
  const [thematicProjectId, setThematicProjectId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [modality, setModality] = useState<GrantModality | "">("");
  const [grantValue, setGrantValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalInstallments, setTotalInstallments] = useState("");
  const [observations, setObservations] = useState("");

  // Fetch thematic projects
  useEffect(() => {
    async function fetchThematicProjects() {
      setLoadingThematic(true);
      try {
        const { data, error } = await supabase
          .from("thematic_projects")
          .select("id, title, sponsor_name")
          .eq("status", "active")
          .order("title");

        if (error) throw error;
        setThematicProjects(data || []);
      } catch (error) {
        console.error("Error fetching thematic projects:", error);
        toast.error("Erro ao carregar projetos temáticos");
      } finally {
        setLoadingThematic(false);
      }
    }

    if (open) {
      fetchThematicProjects();
    }
  }, [open]);

  // Fetch subprojects when thematic project changes
  useEffect(() => {
    async function fetchSubprojects() {
      if (!thematicProjectId) {
        setSubprojects([]);
        setProjectId("");
        return;
      }

      setLoadingSubprojects(true);
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("id, code, title, thematic_project_id, valor_mensal, modalidade_bolsa")
          .eq("thematic_project_id", thematicProjectId)
          .eq("status", "active")
          .order("code");

        if (error) throw error;
        setSubprojects(data || []);
        setProjectId(""); // Reset subproject selection
      } catch (error) {
        console.error("Error fetching subprojects:", error);
        toast.error("Erro ao carregar subprojetos");
      } finally {
        setLoadingSubprojects(false);
      }
    }

    fetchSubprojects();
  }, [thematicProjectId]);

  // Calculate installments based on dates
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (end > start) {
        const months = 
          (end.getFullYear() - start.getFullYear()) * 12 + 
          (end.getMonth() - start.getMonth()) + 1;
        setTotalInstallments(String(months));
      }
    }
  }, [startDate, endDate]);

  const resetForm = () => {
    setThematicProjectId("");
    setProjectId("");
    setModality("");
    setGrantValue("");
    setStartDate("");
    setEndDate("");
    setTotalInstallments("");
    setObservations("");
  };

  // Auto-fill grant value and modality when subproject is selected
  const handleSubprojectChange = (subprojectId: string) => {
    setProjectId(subprojectId);
    const selected = subprojects.find(p => p.id === subprojectId);
    if (selected) {
      if (selected.valor_mensal) {
        setGrantValue(String(selected.valor_mensal).replace(".", ","));
      }
      if (selected.modalidade_bolsa) {
        setModality(selected.modalidade_bolsa as GrantModality);
      }
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!projectId || !modality || !grantValue || !startDate || !endDate || !totalInstallments) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const parsedValue = parseFloat(grantValue.replace(",", "."));
    if (isNaN(parsedValue) || parsedValue <= 0) {
      toast.error("Valor mensal inválido");
      return;
    }

    const parsedInstallments = parseInt(totalInstallments);
    if (isNaN(parsedInstallments) || parsedInstallments <= 0) {
      toast.error("Número de parcelas inválido");
      return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
      toast.error("A data de término deve ser posterior à data de início");
      return;
    }

    setLoading(true);
    try {
      // Create enrollment
      const { data: enrollment, error: enrollmentError } = await supabase
        .from("enrollments")
        .insert({
          user_id: userId,
          project_id: projectId,
          modality: modality as GrantModality,
          grant_value: parsedValue,
          start_date: startDate,
          end_date: endDate,
          total_installments: parsedInstallments,
          observations: observations || null,
          status: "active",
        })
        .select()
        .single();

      if (enrollmentError) throw enrollmentError;

      // Create first payment (auto-eligible as per business rules)
      const startMonth = new Date(startDate);
      const referenceMonth = `${startMonth.getFullYear()}-${String(startMonth.getMonth() + 1).padStart(2, "0")}`;

      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          user_id: userId,
          enrollment_id: enrollment.id,
          installment_number: 1,
          reference_month: referenceMonth,
          amount: parsedValue,
          status: "eligible", // First installment is auto-eligible
        });

      if (paymentError) throw paymentError;

      toast.success(`Bolsa atribuída com sucesso para ${userName || "o bolsista"}`);
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error assigning scholarship:", error);
      toast.error("Erro ao atribuir bolsa");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Atribuir Bolsa</DialogTitle>
              <DialogDescription>
                Vincular bolsa para {userName || "bolsista selecionado"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Thematic Project Selection */}
          <div className="space-y-2">
            <Label htmlFor="thematicProject" className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
              Projeto Temático *
            </Label>
            {loadingThematic ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando projetos temáticos...
              </div>
            ) : thematicProjects.length === 0 ? (
              <div className="p-4 rounded-lg bg-muted/50 border border-dashed text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Nenhum projeto temático cadastrado
                </p>
                <p className="text-xs text-muted-foreground">
                  Cadastre projetos temáticos antes de atribuir bolsas
                </p>
              </div>
            ) : (
              <Select value={thematicProjectId} onValueChange={setThematicProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o projeto temático" />
                </SelectTrigger>
                <SelectContent>
                  {thematicProjects.map((tp) => (
                    <SelectItem key={tp.id} value={tp.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{tp.title}</span>
                        <span className="text-xs text-muted-foreground">{tp.sponsor_name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Subproject Selection */}
          <div className="space-y-2">
            <Label htmlFor="project" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-muted-foreground" />
              Subprojeto *
            </Label>
            {!thematicProjectId ? (
              <div className="p-3 rounded-lg bg-muted/30 border border-dashed text-center">
                <p className="text-sm text-muted-foreground">
                  Selecione um projeto temático primeiro
                </p>
              </div>
            ) : loadingSubprojects ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando subprojetos...
              </div>
            ) : subprojects.length === 0 ? (
              <div className="p-4 rounded-lg bg-warning/10 border border-warning/20 text-center">
                <p className="text-sm text-warning-foreground mb-2">
                  Nenhum subprojeto ativo encontrado
                </p>
                <p className="text-xs text-muted-foreground">
                  Cadastre subprojetos neste projeto temático
                </p>
              </div>
            ) : (
              <Select value={projectId} onValueChange={handleSubprojectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o subprojeto" />
                </SelectTrigger>
                <SelectContent>
                  {subprojects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <span className="font-medium">{project.code}</span>
                      <span className="text-muted-foreground ml-2">- {project.title}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Modality Selection */}
          <div className="space-y-2">
            <Label htmlFor="modality">Modalidade *</Label>
            <Select value={modality} onValueChange={(v) => setModality(v as GrantModality)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a modalidade" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(MODALITY_LABELS) as GrantModality[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {MODALITY_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grant Value */}
          <div className="space-y-2">
            <Label htmlFor="grantValue">Valor Mensal (R$) *</Label>
            <Input
              id="grantValue"
              type="text"
              placeholder="Ex: 700,00"
              value={grantValue}
              onChange={(e) => setGrantValue(e.target.value)}
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data de Início *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data de Término *</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Total Installments */}
          <div className="space-y-2">
            <Label htmlFor="installments">Total de Parcelas *</Label>
            <Input
              id="installments"
              type="number"
              min="1"
              placeholder="Calculado automaticamente"
              value={totalInstallments}
              onChange={(e) => setTotalInstallments(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Calculado automaticamente com base no período da bolsa
            </p>
          </div>

          {/* Observations */}
          <div className="space-y-2">
            <Label htmlFor="observations">Observações</Label>
            <Textarea
              id="observations"
              placeholder="Observações adicionais (opcional)"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !projectId || thematicProjects.length === 0}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Atribuir Bolsa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
