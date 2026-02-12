import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Organization } from "@/hooks/useOrganization";

interface DeleteOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: Organization;
  onSuccess: () => void;
}

export function DeleteOrganizationDialog({
  open,
  onOpenChange,
  organization,
  onSuccess,
}: DeleteOrganizationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  const handleClose = () => {
    setConfirmName("");
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (confirmName !== organization.name) {
      toast.error("Nome da organização não confere");
      return;
    }

    setIsLoading(true);

    try {
      // Check for dependencies (members, projects)
      const [membersResult, projectsResult] = await Promise.all([
        supabase
          .from("organization_members")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organization.id),
        supabase
          .from("thematic_projects")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organization.id),
      ]);

      const memberCount = membersResult.count || 0;
      const projectCount = projectsResult.count || 0;

      if (memberCount > 0 || projectCount > 0) {
        const deps: string[] = [];
        if (memberCount > 0) deps.push(`${memberCount} membro(s)`);
        if (projectCount > 0) deps.push(`${projectCount} projeto(s) temático(s)`);
        
        throw new Error(
          `Não é possível excluir a organização. Existem dependências: ${deps.join(" e ")}. Remova-as primeiro ou desative a organização.`
        );
      }

      // Delete organization
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", organization.id);

      if (error) throw error;

      // Log audit
      await supabase.rpc("insert_audit_log", {
        p_action: "DELETE_ORGANIZATION",
        p_entity_type: "organization",
        p_entity_id: organization.id,
        p_details: { organization_name: organization.name },
        p_previous_value: {
          name: organization.name,
          slug: organization.slug,
          is_active: organization.is_active,
        },
      });

      toast.success("Organização excluída com sucesso!");
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      console.error("Error deleting organization:", err);
      toast.error("Erro ao excluir organização", {
        description: err instanceof Error ? err.message : "Tente novamente",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isConfirmValid = confirmName === organization.name;

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Excluir Organização
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Esta ação é <strong>irreversível</strong>. Todos os dados da organização 
                "{organization.name}" serão permanentemente excluídos.
              </p>
              <div className="space-y-2">
                <Label htmlFor="confirm-name" className="text-foreground">
                  Digite <strong>"{organization.name}"</strong> para confirmar:
                </Label>
                <Input
                  id="confirm-name"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder="Nome da organização"
                  disabled={isLoading}
                  className="bg-background"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading || !isConfirmValid}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Excluindo...
              </>
            ) : (
              "Excluir Permanentemente"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
