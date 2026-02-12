import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Users, 
  Loader2, 
  Plus, 
  Trash2, 
  Crown, 
  Shield, 
  UserCog, 
  User,
  Search 
} from "lucide-react";
import { toast } from "sonner";
import type { Organization } from "@/hooks/useOrganization";

interface Member {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

interface OrganizationMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: Organization;
  onSuccess: () => void;
}

export function OrganizationMembersDialog({
  open,
  onOpenChange,
  organization,
  onSuccess,
}: OrganizationMembersDialogProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingMember, setAddingMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("member");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchMembers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("organization_members")
        .select(`
          id,
          user_id,
          role,
          created_at
        `)
        .eq("organization_id", organization.id)
        .order("created_at");

      if (error) throw error;

      // Fetch user emails from profiles
      const memberIds = data?.map(m => m.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .in("user_id", memberIds);

      const profileMap = new Map(
        profiles?.map(p => [p.user_id, { email: p.email, name: p.full_name }])
      );

      const membersWithEmails: Member[] = (data || []).map(m => ({
        ...m,
        user_email: profileMap.get(m.user_id)?.email || "Email não encontrado",
        user_name: profileMap.get(m.user_id)?.name || undefined,
      }));

      setMembers(membersWithEmails);
    } catch (err) {
      console.error("Error fetching members:", err);
      toast.error("Erro ao carregar membros");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchMembers();
    }
  }, [open, organization.id]);

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) {
      toast.error("Informe o e-mail do usuário");
      return;
    }

    setAddingMember(true);

    try {
      // Find user by email
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", newMemberEmail.trim().toLowerCase())
        .single();

      if (profileError || !profile) {
        toast.error("Usuário não encontrado", {
          description: "Verifique se o e-mail está correto e se o usuário está cadastrado.",
        });
        return;
      }

      // Check if already a member
      const existing = members.find(m => m.user_id === profile.user_id);
      if (existing) {
        toast.error("Usuário já é membro desta organização");
        return;
      }

      // Add member
      const { error } = await supabase
        .from("organization_members")
        .insert({
          organization_id: organization.id,
          user_id: profile.user_id,
          role: newMemberRole,
        });

      if (error) throw error;

      // Update user's profile organization_id
      await supabase
        .from("profiles")
        .update({ organization_id: organization.id })
        .eq("user_id", profile.user_id);

      toast.success("Membro adicionado com sucesso!");
      setNewMemberEmail("");
      setNewMemberRole("member");
      fetchMembers();
      onSuccess();
    } catch (err: unknown) {
      console.error("Error adding member:", err);
      toast.error("Erro ao adicionar membro", {
        description: err instanceof Error ? err.message : "Tente novamente",
      });
    } finally {
      setAddingMember(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from("organization_members")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Papel atualizado!");
      fetchMembers();
    } catch (err) {
      console.error("Error updating role:", err);
      toast.error("Erro ao atualizar papel");
    }
  };

  const handleRemoveMember = async (member: Member) => {
    if (member.role === "owner") {
      toast.error("Não é possível remover o proprietário");
      return;
    }

    try {
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", member.id);

      if (error) throw error;

      toast.success("Membro removido");
      fetchMembers();
      onSuccess();
    } catch (err) {
      console.error("Error removing member:", err);
      toast.error("Erro ao remover membro");
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner": return <Crown className="w-4 h-4 text-warning" />;
      case "admin": return <Shield className="w-4 h-4 text-primary" />;
      case "manager": return <UserCog className="w-4 h-4 text-info" />;
      default: return <User className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const filteredMembers = members.filter(m => 
    m.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.user_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Membros - {organization.name}
          </DialogTitle>
          <DialogDescription>
            Gerencie os membros desta organização e seus papéis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add member form */}
          <div className="flex gap-2 p-4 bg-muted/50 rounded-lg">
            <Input
              placeholder="E-mail do usuário"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              disabled={addingMember}
              className="flex-1"
            />
            <Select value={newMemberRole} onValueChange={setNewMemberRole}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Membro</SelectItem>
                <SelectItem value="manager">Gestor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAddMember} disabled={addingMember} className="gap-2">
              {addingMember ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Adicionar
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar membros..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Members table */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum membro encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getRoleIcon(member.role)}
                        <div>
                          <p className="font-medium">{member.user_name || "Sem nome"}</p>
                          <p className="text-xs text-muted-foreground">{member.user_email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                    {member.role === "owner" ? (
                        <Badge className="bg-warning/20 text-warning border-warning/30">
                          Proprietário
                        </Badge>
                      ) : (
                        <Select
                          value={member.role}
                          onValueChange={(value) => handleUpdateRole(member.id, value)}
                        >
                          <SelectTrigger className="w-[130px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Membro</SelectItem>
                            <SelectItem value="manager">Gestor</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      {member.role !== "owner" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
