import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Building2, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { DeleteOrganizationDialog } from "./DeleteOrganizationDialog";
import type { Organization } from "@/hooks/useOrganization";

interface EditOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: Organization;
  onSuccess: () => void;
}

export function EditOrganizationDialog({
  open,
  onOpenChange,
  organization,
  onSuccess,
}: EditOrganizationDialogProps) {
  const { isAdmin } = useUserRole();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (organization) {
      setName(organization.name);
      setSlug(organization.slug);
      setIsActive(organization.is_active);
    }
  }, [organization]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (!slug.trim()) {
      toast.error("Slug é obrigatório");
      return;
    }

    setIsLoading(true);

    try {
      const updates = {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        is_active: isActive,
      };

      const { error } = await supabase
        .from("organizations")
        .update(updates)
        .eq("id", organization.id);

      if (error) {
        if (error.code === "23505") {
          throw new Error("Já existe uma organização com este slug");
        }
        throw error;
      }

      // Log audit
      await supabase.rpc("insert_audit_log", {
        p_action: "UPDATE_ORGANIZATION",
        p_entity_type: "organization",
        p_entity_id: organization.id,
        p_details: { 
          changes: Object.keys(updates).filter(k => 
            updates[k as keyof typeof updates] !== organization[k as keyof Organization]
          )
        },
        p_previous_value: {
          name: organization.name,
          slug: organization.slug,
          is_active: organization.is_active,
        },
        p_new_value: updates,
      });

      toast.success("Organização atualizada com sucesso!");
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      console.error("Error updating organization:", err);
      toast.error("Erro ao atualizar organização", {
        description: err instanceof Error ? err.message : "Tente novamente",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSuccess = () => {
    onSuccess();
    handleClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Editar Organização
              </DialogTitle>
              <DialogDescription>
                Atualize as informações da organização "{organization.name}".
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome da Organização</Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Instituto de Pesquisa XYZ"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-slug">Slug (identificador único)</Label>
                <Input
                  id="edit-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="instituto-xyz"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Cuidado ao alterar o slug de uma organização ativa.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Status</Label>
                  <p className="text-xs text-muted-foreground">
                    Organizações inativas não aparecem para seleção
                  </p>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  disabled={isLoading}
                />
              </div>

              {isAdmin && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-destructive">Zona de Perigo</Label>
                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full gap-2"
                      onClick={() => setDeleteDialogOpen(true)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir Organização
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Esta ação é irreversível e removerá todos os dados associados.
                    </p>
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="gap-2">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteOrganizationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        organization={organization}
        onSuccess={handleDeleteSuccess}
      />
    </>
  );
}
