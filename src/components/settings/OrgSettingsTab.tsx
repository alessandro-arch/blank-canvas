import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Upload, Palette } from "lucide-react";
import { useRef } from "react";

export function OrgSettingsTab() {
  const { currentOrganization: selectedOrganization, refreshOrganizations } = useOrganization();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    primary_color: "",
    secondary_color: "",
    watermark_text: "",
    report_footer_text: "",
    default_admin_fee: 0,
    default_currency: "BRL",
    logo_url: "",
  });

  useEffect(() => {
    if (selectedOrganization) {
      setForm({
        primary_color: selectedOrganization.primary_color || "#1e3a5f",
        secondary_color: selectedOrganization.secondary_color || "#f0f4f8",
        watermark_text: selectedOrganization.watermark_text || "",
        report_footer_text: selectedOrganization.report_footer_text || "",
        default_admin_fee: (selectedOrganization as any).default_admin_fee || 0,
        default_currency: (selectedOrganization as any).default_currency || "BRL",
        logo_url: selectedOrganization.logo_url || "",
      });
    }
  }, [selectedOrganization]);

  const handleSave = async () => {
    if (!selectedOrganization) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          primary_color: form.primary_color,
          secondary_color: form.secondary_color,
          watermark_text: form.watermark_text || null,
          report_footer_text: form.report_footer_text || null,
        } as any)
        .eq("id", selectedOrganization.id);

      if (error) throw error;

      toast({ title: "Configurações salvas", description: "As configurações institucionais foram atualizadas." });
      refreshOrganizations?.();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedOrganization) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `org-logos/${selectedOrganization.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("email-assets")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("email-assets")
        .getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("organizations")
        .update({ logo_url: urlData.publicUrl })
        .eq("id", selectedOrganization.id);

      if (updateError) throw updateError;

      setForm(prev => ({ ...prev, logo_url: urlData.publicUrl }));
      toast({ title: "Logo atualizado", description: "O logo da organização foi alterado." });
      refreshOrganizations?.();
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!selectedOrganization) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Selecione uma organização para configurar.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Logo da Organização</CardTitle>
          <CardDescription>O logo será utilizado nos relatórios e na interface.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-lg border border-border flex items-center justify-center overflow-hidden bg-muted">
            {form.logo_url ? (
              <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <Palette className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Enviar Logo
            </Button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            <p className="text-xs text-muted-foreground mt-1">PNG ou SVG, até 2MB</p>
          </div>
        </CardContent>
      </Card>

      {/* Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cores Institucionais</CardTitle>
          <CardDescription>Aplicadas nos relatórios PDF e na identidade visual.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cor Primária</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={(e) => setForm(prev => ({ ...prev, primary_color: e.target.value }))}
                  className="w-10 h-10 rounded border border-border cursor-pointer"
                />
                <Input
                  value={form.primary_color}
                  onChange={(e) => setForm(prev => ({ ...prev, primary_color: e.target.value }))}
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cor Secundária</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.secondary_color}
                  onChange={(e) => setForm(prev => ({ ...prev, secondary_color: e.target.value }))}
                  className="w-10 h-10 rounded border border-border cursor-pointer"
                />
                <Input
                  value={form.secondary_color}
                  onChange={(e) => setForm(prev => ({ ...prev, secondary_color: e.target.value }))}
                  className="font-mono"
                />
              </div>
            </div>
          </div>
          {/* Preview */}
          <div className="flex gap-3 mt-2">
            <div className="flex-1 h-12 rounded-lg flex items-center justify-center text-sm font-medium" style={{ backgroundColor: form.primary_color, color: "#fff" }}>
              Primária
            </div>
            <div className="flex-1 h-12 rounded-lg flex items-center justify-center text-sm font-medium border" style={{ backgroundColor: form.secondary_color, color: form.primary_color }}>
              Secundária
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Watermark & Footer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Relatórios</CardTitle>
          <CardDescription>Textos aplicados automaticamente nos PDFs gerados.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Marca d'água</Label>
            <Input
              value={form.watermark_text}
              onChange={(e) => setForm(prev => ({ ...prev, watermark_text: e.target.value }))}
              placeholder="Ex: CONFIDENCIAL"
            />
          </div>
          <div className="space-y-2">
            <Label>Texto do Rodapé</Label>
            <Textarea
              value={form.report_footer_text}
              onChange={(e) => setForm(prev => ({ ...prev, report_footer_text: e.target.value }))}
              placeholder="Texto exibido no rodapé dos relatórios"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
