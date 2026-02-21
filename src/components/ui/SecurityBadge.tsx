import { Shield, Lock, ShieldCheck, Fingerprint } from "lucide-react";

interface SecurityBadgeProps {
  variant?: "footer" | "banner" | "inline";
  className?: string;
}

/**
 * Reusable security indicator component.
 * - footer: compact badge for global footer
 * - banner: contextual alert for sensitive screens
 * - inline: small inline indicator
 */
export function SecurityBadge({ variant = "inline", className = "" }: SecurityBadgeProps) {
  if (variant === "footer") {
    return (
      <div className={`flex items-center justify-center gap-2 text-muted-foreground ${className}`}>
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-medium tracking-wide">
            Criptografia AES-256-GCM • SHA-256 • TLS 1.3
          </span>
        </div>
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div className={`flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 ${className}`}>
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-foreground leading-tight">
            🔐 Dados protegidos por criptografia de ponta
          </p>
          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
            Todas as informações sensíveis são criptografadas com AES-256-GCM em repouso e em trânsito (TLS 1.3). 
            Integridade verificada por hash SHA-256. Acesso auditado e restrito.
          </p>
        </div>
      </div>
    );
  }

  // inline
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] text-muted-foreground ${className}`}>
      <Lock className="w-3 h-3" />
      <span>Criptografado</span>
    </span>
  );
}

/**
 * Expanded security section for landing page.
 */
export function SecurityShowcase() {
  const features = [
    {
      icon: Lock,
      title: "Criptografia AES-256-GCM",
      desc: "Dados bancários, relatórios e informações pessoais são criptografados em repouso com padrão militar. Chaves gerenciadas via Envelope Encryption.",
      tag: "Em repouso",
    },
    {
      icon: ShieldCheck,
      title: "Integridade SHA-256",
      desc: "Cada documento gerado recebe uma assinatura digital SHA-256. Qualquer alteração é detectada automaticamente pelo sistema.",
      tag: "Verificável",
    },
    {
      icon: Shield,
      title: "Zero-Trust Architecture",
      desc: "Nenhum dado sensível trafega em texto puro. Acesso exclusivo via funções autorizadas com validação JWT e controle por organização.",
      tag: "Arquitetura",
    },
    {
      icon: Fingerprint,
      title: "Auditoria Completa",
      desc: "Cada visualização, download ou alteração de dados é registrada com timestamp, IP e identificação do usuário para conformidade total.",
      tag: "LGPD",
    },
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {features.map((f) => (
        <div
          key={f.title}
          className="relative bg-white rounded-xl border border-border p-6 text-center hover:shadow-md transition-shadow group overflow-hidden"
        >
          {/* Subtle encrypted background pattern */}
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none select-none text-[8px] leading-[10px] font-mono text-foreground break-all overflow-hidden">
            a3f8b2c1d9e4f7a6b0c5d8e3f2a1b7c4d6e9f0a2b5c8d1e4f7a0b3c6d9e2f5a8b1c4d7e0f3a6b9c2d5e8f1a4b7c0d3e6f9a2b5c8d1e4f7a0b3c6d9e2f5
          </div>
          <div className="relative">
            <span className="inline-block text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full mb-3">
              {f.tag}
            </span>
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <f.icon className="w-5 h-5 text-foreground" />
            </div>
            <h3 className="text-[15px] font-semibold text-foreground mb-2">{f.title}</h3>
            <p className="text-[12px] text-muted-foreground leading-relaxed">{f.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
