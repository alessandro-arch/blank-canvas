import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, X, ExternalLink, Bot, UserCircle, Clock, Mail, CheckCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { EnrichedMessage } from "@/pages/AdminMessages";

interface MessageDetailDrawerProps {
  message: EnrichedMessage | null;
  open: boolean;
  onClose: () => void;
  onResend: (msg: EnrichedMessage) => void;
}

function TimestampRow({ icon: Icon, label, date, className }: { icon: any; label: string; date: string | null; className?: string }) {
  if (!date) return null;
  return (
    <div className={`flex items-center gap-2 text-xs ${className || "text-muted-foreground"}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{label}:</span>
      <span className="font-medium">{format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
    </div>
  );
}

export function MessageDetailDrawer({ message, open, onClose, onResend }: MessageDetailDrawerProps) {
  if (!message) return null;

  const isFailed = message.email_status === "failed" || !!message.email_error;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-[520px] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-lg leading-tight">{message.subject}</SheetTitle>
          <SheetDescription className="text-xs">
            {message.type === "SYSTEM" ? "Notificação automática do sistema" : "Mensagem manual do gestor"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5">
          {/* Recipient */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Destinatário</p>
            <p className="text-sm font-medium">{message.recipient_name || "—"}</p>
            {message.recipient_email && (
              <p className="text-xs text-muted-foreground">{message.recipient_email}</p>
            )}
          </div>

          <Separator />

          {/* Status & Type */}
          <div className="flex flex-wrap gap-2">
            {message.type === "SYSTEM" ? (
              <Badge variant="outline" className="border-blue-300 text-blue-700 gap-1">
                <Bot className="w-3 h-3" /> Sistema
              </Badge>
            ) : (
              <Badge variant="outline" className="border-primary/50 text-primary gap-1">
                <UserCircle className="w-3 h-3" /> Manual
              </Badge>
            )}
            {isFailed ? (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" /> Falha no envio
              </Badge>
            ) : message.read ? (
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 gap-1">
                <CheckCircle className="w-3 h-3" /> Lida
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Mail className="w-3 h-3" /> Enviada
              </Badge>
            )}
            {message.event_type && (
              <Badge variant="outline" className="text-xs">{message.event_type}</Badge>
            )}
          </div>

          <Separator />

          {/* Timestamps */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cronologia</p>
            <TimestampRow icon={Clock} label="Criada" date={message.created_at} />
            <TimestampRow icon={Mail} label="Enviada" date={message.sent_at} />
            <TimestampRow icon={CheckCircle} label="Entregue" date={message.delivered_at} />
            <TimestampRow icon={CheckCircle} label="Lida" date={message.read_at} className="text-emerald-700" />
          </div>

          {/* Error info */}
          {isFailed && message.email_error && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs font-medium text-destructive uppercase tracking-wider">Motivo do erro</p>
                <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">{message.email_error}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Body */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Conteúdo</p>
            <div className="bg-muted/50 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.body}
            </div>
          </div>

          {/* Link */}
          {message.link_url && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Link relacionado</p>
              <a href={message.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                <ExternalLink className="w-3 h-3" /> {message.link_url}
              </a>
            </div>
          )}

          {/* Provider ID */}
          {message.provider_message_id && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">ID do provedor</p>
              <p className="text-xs font-mono text-muted-foreground">{message.provider_message_id}</p>
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button variant="default" size="sm" onClick={() => onResend(message)} className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reenviar
            </Button>
            <Button variant="outline" size="sm" onClick={onClose} className="flex-1">
              <X className="w-4 h-4 mr-2" />
              Fechar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
