import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { OrgMember } from "@/types/admin-members";

interface EditMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: OrgMember | null;
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
    
    if (role !== member.role) {
      await onUpdateRole(member.id, role);
    }
    if (isActive !== member.is_active) {
      await onToggleActive(member.id, isActive);
    }
    
    setLoading(false);
    onOpenChange(false);
  };

  const name = member?.profiles?.full_name || member?.profiles?.email || "Membro";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Membro: {name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="active">Ativo</Label>
            <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
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
