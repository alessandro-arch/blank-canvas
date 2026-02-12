import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, RefreshCw, Trash2, Bot, UserCircle, Bell, Mail, Send, Layers } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { EnrichedMessage } from "@/pages/AdminMessages";

interface MessagesTableProps {
  messages: EnrichedMessage[];
  loading: boolean;
  groupByCampaign: boolean;
  onToggleGroup: (v: boolean) => void;
  onView: (msg: EnrichedMessage) => void;
  onResend: (msg: EnrichedMessage) => void;
  onDelete: (msg: EnrichedMessage) => void;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}

function getStatusBadge(msg: EnrichedMessage) {
  if (msg.email_status === "failed" || msg.email_error) {
    return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Falha</Badge>;
  }
  if (msg.read_at || msg.read) {
    return <Badge className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">Lida</Badge>;
  }
  if (msg.email_status === "sent" || msg.sent_at) {
    return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Enviada</Badge>;
  }
  return <Badge variant="outline" className="text-[10px] px-1.5 py-0">Em fila</Badge>;
}

function getTypeBadge(msg: EnrichedMessage) {
  if (msg.type === "SYSTEM") return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-300 text-blue-700">Sistema</Badge>;
  return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/50 text-primary">Manual</Badge>;
}

function getTypeIcon(msg: EnrichedMessage) {
  if (msg.type === "SYSTEM") return <Bot className="w-4 h-4 text-blue-600" />;
  if (msg.event_type === "monthly_reminder") return <Bell className="w-4 h-4 text-amber-600" />;
  return <UserCircle className="w-4 h-4 text-primary" />;
}

function getEventLabel(eventType: string | null) {
  const map: Record<string, string> = {
    report_submitted: "Relatório enviado",
    report_reviewed: "Relatório devolvido",
    monthly_reminder: "Lembrete dia 25",
    report_status_change: "Status relatório",
    payment_status_change: "Status pagamento",
    general: "Geral",
  };
  return eventType ? map[eventType] || eventType : "—";
}

function MessageRow({ msg, onView, onResend, onDelete }: { msg: EnrichedMessage; onView: () => void; onResend: () => void; onDelete: () => void }) {
  return (
    <TableRow className="group">
      <TableCell className="w-10">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>{getTypeIcon(msg)}</TooltipTrigger>
            <TooltipContent><p>{msg.type === "SYSTEM" ? "Sistema" : "Manual"}</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell className="max-w-[200px]">
        <p className="text-sm font-medium truncate">{msg.subject}</p>
      </TableCell>
      <TableCell>
        <p className="text-sm truncate">{msg.recipient_name || "—"}</p>
        <p className="text-[11px] text-muted-foreground truncate">{msg.recipient_email || ""}</p>
      </TableCell>
      <TableCell>{getStatusBadge(msg)}</TableCell>
      <TableCell>
        <span className="text-xs text-muted-foreground">{getEventLabel(msg.event_type)}</span>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
        {msg.sent_at ? format(new Date(msg.sent_at), "dd/MM/yy HH:mm", { locale: ptBR }) : format(new Date(msg.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onView}>
                  <Eye className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ver detalhes</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onResend}>
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reenviar</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Excluir</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function MessagesTable({ messages, loading, groupByCampaign, onToggleGroup, onView, onResend, onDelete, page, totalPages, onPageChange }: MessagesTableProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (messages.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma mensagem encontrada</h3>
          <p className="text-muted-foreground">Nenhuma mensagem encontrada para os filtros selecionados.</p>
        </CardContent>
      </Card>
    );
  }

  // Group by campaign
  const campaignGroups = groupByCampaign
    ? messages.reduce<Record<string, EnrichedMessage[]>>((acc, msg) => {
        const key = msg.campaign_code || "individual";
        (acc[key] = acc[key] || []).push(msg);
        return acc;
      }, {})
    : null;

  return (
    <div className="space-y-3">
      {/* Campaign toggle */}
      <div className="flex items-center gap-2">
        <Switch id="group-campaign" checked={groupByCampaign} onCheckedChange={onToggleGroup} />
        <Label htmlFor="group-campaign" className="text-xs text-muted-foreground flex items-center gap-1">
          <Layers className="w-3.5 h-3.5" />
          Agrupar por campanha
        </Label>
      </div>

      {groupByCampaign && campaignGroups ? (
        <Accordion type="multiple" className="space-y-2">
          {Object.entries(campaignGroups).map(([code, msgs]) => {
            const readCount = msgs.filter(m => m.read).length;
            const failedCount = msgs.filter(m => m.email_status === "failed" || m.email_error).length;
            return (
              <AccordionItem key={code} value={code} className="border rounded-lg px-4">
                <AccordionTrigger className="py-3 hover:no-underline">
                  <div className="flex items-center gap-3 text-sm">
                    <Layers className="w-4 h-4 text-primary" />
                    <span className="font-medium">{code === "individual" ? "Envios individuais" : `Campanha: ${code}`}</span>
                    <Badge variant="secondary" className="text-[10px]">{msgs.length} mensagens</Badge>
                    <Badge className="text-[10px] bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{readCount} lidas</Badge>
                    {failedCount > 0 && <Badge variant="destructive" className="text-[10px]">{failedCount} erros</Badge>}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Assunto</TableHead>
                        <TableHead>Destinatário</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Evento</TableHead>
                        <TableHead>Enviado em</TableHead>
                        <TableHead className="w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {msgs.map((msg) => (
                        <MessageRow key={msg.id} msg={msg} onView={() => onView(msg)} onResend={() => onResend(msg)} onDelete={() => onDelete(msg)} />
                      ))}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead>Destinatário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Enviado em</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((msg) => (
                <MessageRow key={msg.id} msg={msg} onView={() => onView(msg)} onResend={() => onResend(msg)} onDelete={() => onDelete(msg)} />
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
