import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Check, RefreshCw, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { OrgInvite } from "@/types/admin-members";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface InvitesTabProps {
  invites: OrgInvite[];
  onRevoke: (inviteId: string) => Promise<boolean>;
  onResend: (inviteId: string) => Promise<boolean>;
}

const roleLabels: Record<string, string> = {
  admin: "Admin",
  manager: "Gestor",
  reviewer: "Avaliador",
  beneficiary: "Proponente",
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "default" },
  accepted: { label: "Aceito", variant: "secondary" },
  revoked: { label: "Revogado", variant: "destructive" },
  expired: { label: "Expirado", variant: "outline" },
};

export function InvitesTab({ invites, onRevoke, onResend }: InvitesTabProps) {
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Auto-mark expired
  const processedInvites = invites.map((inv) => {
    if (inv.status === "pending" && new Date(inv.expires_at) < new Date()) {
      return { ...inv, status: "expired" as const };
    }
    return inv;
  });

  const filtered = filter === "all"
    ? processedInvites
    : processedInvites.filter((i) => i.status === filter);

  const handleCopy = async (invite: OrgInvite) => {
    const link = `${window.location.origin}/convite?token=${invite.token}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(invite.id);
    toast({ title: "Link copiado!" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = async (inviteId: string) => {
    setLoadingAction(inviteId);
    await onRevoke(inviteId);
    setLoadingAction(null);
  };

  const handleResend = async (inviteId: string) => {
    setLoadingAction(inviteId);
    await onResend(inviteId);
    setLoadingAction(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Convites</CardTitle>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filtrar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="accepted">Aceitos</SelectItem>
            <SelectItem value="revoked">Revogados</SelectItem>
            <SelectItem value="expired">Expirados</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum convite encontrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>E-mail Enviado</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((invite) => {
                const status = statusConfig[invite.status] || statusConfig.pending;
                const isLoading = loadingAction === invite.id;
                const isPending = invite.status === "pending" && new Date(invite.expires_at) > new Date();

                return (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium">{invite.invited_email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{roleLabels[invite.role] || invite.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {invite.email_sent_at ? (
                        <span className="text-green-600">
                          ✓ {format(new Date(invite.email_sent_at), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                      ) : invite.send_error ? (
                        <span className="text-destructive text-xs">✗ Falha</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(invite.expires_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin inline" />
                      ) : (
                        <>
                          {isPending && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => handleCopy(invite)} title="Copiar link">
                                {copiedId === invite.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleResend(invite.id)} title="Reenviar e-mail">
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleRevoke(invite.id)} title="Revogar">
                                <XCircle className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
