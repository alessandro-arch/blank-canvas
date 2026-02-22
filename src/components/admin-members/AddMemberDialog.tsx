import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Check, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import type { OrgInvite } from "@/types/admin-members";

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (email: string, role: string, expiresDays: number) => Promise<{ invite_id: string; token: string } | null>;
  existingInvites?: OrgInvite[];
}

export function AddMemberDialog({ open, onOpenChange, onSubmit, existingInvites = [] }: AddMemberDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("manager");
  const [expiresDays, setExpiresDays] = useState("7");
  const [loading, setLoading] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const trimmedEmail = email.trim().toLowerCase();

  const pendingInvites = useMemo(() => {
    if (!trimmedEmail) return [];
    return existingInvites.filter(
      (inv) =>
        inv.invited_email.toLowerCase() === trimmedEmail &&
        inv.status === "pending" &&
        new Date(inv.expires_at) > new Date()
    );
  }, [trimmedEmail, existingInvites]);

  const inviteLink = inviteToken
    ? `${window.location.origin}/invite/${inviteToken}`
    : null;

  const handleSubmit = async () => {
    if (!trimmedEmail) return;
    setLoading(true);
    const result = await onSubmit(trimmedEmail, role, parseInt(expiresDays) || 7);
    if (result?.token) {
      setInviteToken(result.token);
    }
    setLoading(false);
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast({ title: "Link copiado!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setEmail("");
      setRole("manager");
      setExpiresDays("7");
      setInviteToken(null);
      setCopied(false);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {inviteToken ? "Convite Criado" : "Convidar Membro"}
          </DialogTitle>
        </DialogHeader>

        {inviteToken ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O convite foi criado. Copie o link abaixo e envie para <strong>{email}</strong>.
            </p>
            <div className="flex items-center gap-2">
              <Input value={inviteLink || ""} readOnly className="text-xs" />
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Fechar</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">E-mail *</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="nome@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {pendingInvites.length > 0 && (
              <Alert variant="destructive" className="border-yellow-500/50 bg-yellow-50 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400 [&>svg]:text-yellow-600">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Já {pendingInvites.length === 1 ? "existe" : "existem"}{" "}
                  <strong>{pendingInvites.length}</strong>{" "}
                  {pendingInvites.length === 1 ? "convite pendente" : "convites pendentes"} para este e-mail.
                  Revogue os anteriores na aba "Convites" antes de criar um novo, ou o sistema poderá bloquear a criação.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="reviewer">Reviewer</SelectItem>
                  <SelectItem value="auditor">Auditor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expires">Expiração (dias)</Label>
              <Select value={expiresDays} onValueChange={setExpiresDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 dia</SelectItem>
                  <SelectItem value="3">3 dias</SelectItem>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="14">14 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={loading || !trimmedEmail}>
                {loading ? "Criando..." : "Gerar Convite"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
