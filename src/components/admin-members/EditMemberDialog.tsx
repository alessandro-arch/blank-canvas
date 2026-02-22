import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { AdminMemberFlat } from "@/types/admin-members";

interface EditMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: AdminMemberFlat | null;
  onUpdateRole: (memberId: string, role: string) => Promise<boolean>;
  onToggleActive: (memberId: string, isActive: boolean) => Promise<boolean>;
}

export function EditMemberDialog({ open, onOpenChange, member, onUpdateRole, onToggleActive }: EditMemberDialogProps) {
  const [role, setRole] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (member) {
      setRole(member.role);
      setIsActive(member.is_active);
    }
  }, [member]);

  const handleSave = async () => {
    if (!member) return;
    setLoading(true);
    if (role !== member.role) await onUpdateRole(member.id, role);
    if (isActive !== member.is_active) await onToggleActive(member.id, isActive);
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar: {member?.full_name || member?.email || "Membro"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Papel</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="reviewer">Reviewer</SelectItem>
                <SelectItem value="auditor">Auditor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="edit-active">Ativo</Label>
            <Switch id="edit-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
