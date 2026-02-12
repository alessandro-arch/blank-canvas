import { User, Clock } from "lucide-react";
import { useScholarProfile } from "@/hooks/useScholarProfile";
import { getModalityLabel } from "@/lib/modality-labels";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { EnrollmentWithProject } from "@/hooks/useScholarPayments";

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "MMMM/yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

interface ScholarProfileCardProps {
  enrollment: EnrollmentWithProject | null;
  loading: boolean;
}

export function ScholarProfileCard({ enrollment, loading }: ScholarProfileCardProps) {
  const { personalData } = useScholarProfile();

  const hasEnrollment = !!enrollment;
  const project = enrollment?.project;

  return (
    <div className="card-institutional mb-6">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <User className="w-8 h-8 text-primary" />
        </div>
        <div className="flex-1">
          {loading ? (
            <div className="space-y-2">
              <div className="h-6 w-48 bg-muted rounded animate-pulse" />
              <div className="h-4 w-64 bg-muted rounded animate-pulse" />
              <div className="h-3 w-40 bg-muted rounded animate-pulse mt-1" />
            </div>
          ) : hasEnrollment && project ? (
            <>
              <h1 className="text-xl font-semibold text-foreground">
                {personalData.name || "Bolsista"}
              </h1>
              <p className="text-muted-foreground">
                Bolsa: {project.modalidade_bolsa || getModalityLabel(enrollment.modality)} • Projeto: {project.title}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Vigência: {formatDate(enrollment.start_date)} a {formatDate(enrollment.end_date)}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-foreground">
                {personalData.name || "Bolsista"}
              </h1>
              <p className="text-muted-foreground">Aguardando atribuição de bolsa</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {loading ? (
            <div className="h-8 w-24 bg-muted rounded-full animate-pulse" />
          ) : hasEnrollment ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-success/10 text-success">
              <span className="w-2 h-2 rounded-full bg-current" />
              Bolsa Ativa
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-warning/10 text-warning">
              <Clock className="w-4 h-4" />
              Aguardando Atribuição
            </span>
          )}
        </div>
      </div>
    </div>
  );
}