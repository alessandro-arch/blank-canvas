import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Code, Eye, Save, Plus, Trash2, Copy, RotateCcw } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const DEFAULT_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}} | BolsaGO</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="display: none; max-height: 0; overflow: hidden;">
    {{subject}} - BolsaGO
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px;">
          <!-- Header -->
          <tr>
            <td style="background-color: #003366; border-radius: 8px 8px 0 0; padding: 24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <img src="{{logo_url}}" alt="{{org_name}}" style="max-height: 40px; width: auto;" />
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="font-size: 12px; color: #ffffff; opacity: 0.9;">BolsaGO</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Title -->
          <tr>
            <td style="background-color: #ffffff; padding: 32px 32px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align: middle;">
                    <h1 style="margin: 0; font-size: 22px; font-weight: 600; color: #003366; line-height: 1.3;">
                      Nova Mensagem
                    </h1>
                    <p style="margin: 8px 0 0 0; font-size: 14px; color: #666666;">
                      De: <strong>{{sender_name}}</strong>
                    </p>
                  </td>
                  <td width="64" align="right" style="vertical-align: middle;">
                    <div style="width: 56px; height: 56px; background-color: #e6f3ff; border-radius: 50%; text-align: center; line-height: 56px;">
                      <span style="font-size: 28px;">💬</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Subject -->
          <tr>
            <td style="background-color: #ffffff; padding: 0 32px 16px;">
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #333333;">
                {{subject}}
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color: #ffffff; padding: 0 32px 32px;">
              <div style="background-color: #fafafa; border: 1px solid #e8e8e8; border-radius: 8px; padding: 24px;">
                <p style="margin: 0; font-size: 15px; color: #333333; line-height: 1.7;">
                  {{body}}
                </p>
              </div>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="background-color: #ffffff; padding: 0 32px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #003366; border-radius: 6px;">
                    <a href="{{cta_url}}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600;">
                      {{cta_text}}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #003366; border-radius: 0 0 8px 8px; padding: 24px 32px;">
              <p style="margin: 0; font-size: 12px; color: #ffffff; opacity: 0.8; line-height: 1.5;">
                {{footer_text}}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const AVAILABLE_VARIABLES = [
  { key: "{{subject}}", desc: "Assunto da mensagem" },
  { key: "{{body}}", desc: "Conteúdo da mensagem" },
  { key: "{{recipient_name}}", desc: "Nome do destinatário" },
  { key: "{{sender_name}}", desc: "Nome do remetente" },
  { key: "{{logo_url}}", desc: "URL do logo da organização" },
  { key: "{{org_name}}", desc: "Nome da organização" },
  { key: "{{cta_url}}", desc: "URL do botão de ação" },
  { key: "{{cta_text}}", desc: "Texto do botão de ação" },
  { key: "{{footer_text}}", desc: "Texto do rodapé" },
];

const SAMPLE_DATA: Record<string, string> = {
  "{{subject}}": "Relatório Aprovado",
  "{{body}}": "Seu relatório de Janeiro/2026 foi aprovado com sucesso. Parabéns pelo excelente trabalho!",
  "{{recipient_name}}": "Alessandro Coutinho",
  "{{sender_name}}": "Equipe de Gestão",
  "{{logo_url}}": "",
  "{{org_name}}": "InnovaGO",
  "{{cta_url}}": "https://bolsago.lovable.app/bolsista/mensagens",
  "{{cta_text}}": "Ver no BolsaGO",
  "{{footer_text}}": "© InnovaGO – Sistema de Gestão de Bolsas em Pesquisa e Desenvolvimento",
};

interface TemplateRecord {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  html_template: string | null;
  is_default: boolean;
  organization_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface EmailTemplateEditorDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function EmailTemplateEditorDrawer({ open, onClose }: EmailTemplateEditorDrawerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | "new">("new");
  const [name, setName] = useState("Template Padrão");
  const [htmlTemplate, setHtmlTemplate] = useState(DEFAULT_HTML_TEMPLATE);
  const [activeTab, setActiveTab] = useState("editor");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["email-templates-editor"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_templates")
        .select("*")
        .order("is_default", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data || []) as TemplateRecord[];
    },
    enabled: open,
  });

  // Load selected template
  useEffect(() => {
    if (selectedTemplateId === "new") {
      setName("Novo Template");
      setHtmlTemplate(DEFAULT_HTML_TEMPLATE);
      setHasChanges(false);
    } else {
      const t = templates.find((t) => t.id === selectedTemplateId);
      if (t) {
        setName(t.name);
        setHtmlTemplate(t.html_template || DEFAULT_HTML_TEMPLATE);
        setHasChanges(false);
      }
    }
  }, [selectedTemplateId, templates]);

  const previewHtml = useMemo(() => {
    let html = htmlTemplate;
    for (const [key, value] of Object.entries(SAMPLE_DATA)) {
      html = html.split(key).join(value);
    }
    return html;
  }, [htmlTemplate]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Não autenticado");
      if (!name.trim()) throw new Error("Nome é obrigatório");

      if (selectedTemplateId === "new") {
        const { error } = await supabase.from("message_templates").insert({
          name: name.trim(),
          subject: "{{subject}}",
          body: "{{body}}",
          category: "email_layout",
          html_template: htmlTemplate,
          is_default: templates.length === 0,
          created_by: user.id,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("message_templates")
          .update({
            name: name.trim(),
            html_template: htmlTemplate,
          })
          .eq("id", selectedTemplateId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Template salvo com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["email-templates-editor"] });
      setHasChanges(false);
      if (selectedTemplateId === "new") {
        // Refresh and auto-select the new one
        queryClient.invalidateQueries({ queryKey: ["email-templates-editor"] });
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao salvar template."),
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (templateId: string) => {
      // Unset all defaults first
      await supabase.from("message_templates").update({ is_default: false }).neq("id", templateId);
      const { error } = await supabase.from("message_templates").update({ is_default: true }).eq("id", templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template definido como padrão!");
      queryClient.invalidateQueries({ queryKey: ["email-templates-editor"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (selectedTemplateId === "new") return;
      const { error } = await supabase.from("message_templates").delete().eq("id", selectedTemplateId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template excluído.");
      setSelectedTemplateId("new");
      setDeleteConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["email-templates-editor"] });
    },
    onError: () => toast.error("Erro ao excluir template."),
  });

  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    toast.success(`Copiado: ${variable}`);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <SheetContent className="w-full sm:max-w-[900px] overflow-y-auto p-0" side="right">
          <div className="p-6 pb-0">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                Editor de Templates de E-mail
              </SheetTitle>
              <SheetDescription>
                Personalize o layout dos e-mails enviados pelo sistema. Use variáveis para conteúdo dinâmico.
              </SheetDescription>
            </SheetHeader>
          </div>

          <div className="p-6 space-y-4">
            {/* Template selector */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1 block">Template</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar template..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">
                      <span className="flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5" /> Criar novo template
                      </span>
                    </SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} {t.is_default ? " ⭐" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedTemplateId !== "new" && (
                <div className="flex items-end gap-1.5 pt-4">
                  {!templates.find(t => t.id === selectedTemplateId)?.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDefaultMutation.mutate(selectedTemplateId)}
                      disabled={setDefaultMutation.isPending}
                    >
                      Definir padrão
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteConfirmOpen(true)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Name */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Nome do template</Label>
              <Input
                value={name}
                onChange={(e) => { setName(e.target.value); setHasChanges(true); }}
                placeholder="Ex: Layout Institucional"
              />
            </div>

            <Separator />

            {/* Variables reference */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Variáveis disponíveis (clique para copiar)</Label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_VARIABLES.map((v) => (
                  <Badge
                    key={v.key}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 transition-colors text-xs"
                    title={v.desc}
                    onClick={() => copyVariable(v.key)}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    {v.key}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Editor / Preview tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
              <TabsList className="w-full">
                <TabsTrigger value="editor" className="flex-1 gap-1.5">
                  <Code className="w-3.5 h-3.5" /> HTML
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex-1 gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Preview
                </TabsTrigger>
              </TabsList>

              <TabsContent value="editor" className="mt-3">
                <Textarea
                  value={htmlTemplate}
                  onChange={(e) => { setHtmlTemplate(e.target.value); setHasChanges(true); }}
                  className="font-mono text-xs min-h-[400px] leading-relaxed"
                  placeholder="Cole ou edite o HTML do template aqui..."
                />
              </TabsContent>

              <TabsContent value="preview" className="mt-3">
                <div className="border rounded-lg overflow-hidden bg-muted/30">
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full min-h-[500px] bg-white"
                    title="Preview do template"
                    sandbox="allow-same-origin"
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !hasChanges}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? "Salvando..." : "Salvar Template"}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setHtmlTemplate(DEFAULT_HTML_TEMPLATE); setHasChanges(true); }}
                title="Restaurar template padrão"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o template "{name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
