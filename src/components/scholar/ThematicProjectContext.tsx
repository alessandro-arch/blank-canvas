import { Building2, BookOpen, Briefcase, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProjectWithThematic } from "@/hooks/useScholarPayments";
import type { Database } from "@/integrations/supabase/types";

type Enrollment = Database["public"]["Tables"]["enrollments"]["Row"];

interface ThematicProjectContextProps {
  project: ProjectWithThematic | null;
  enrollment: Enrollment | null;
  loading: boolean;
}

export function ThematicProjectContext({ project, enrollment, loading }: ThematicProjectContextProps) {
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <div className="flex items-start gap-4">
          <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-full max-w-md" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </div>
    );
  }

  // No active enrollment - show empty state
  if (!enrollment || !project) {
    return (
      <div className="bg-muted/30 border border-dashed border-border rounded-xl p-5 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Projeto Temático</p>
            <p className="text-base text-foreground mt-1">
              Você ainda não está vinculado a um Projeto Temático institucional.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Aguarde a atribuição pelo gestor para visualizar o contexto acadêmico da sua bolsa.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const thematicProject = project.thematic_project;
  const thematicTitle = thematicProject?.title || "—";
  const sponsorName = thematicProject?.sponsor_name || "—";

  return (
    <div className="bg-card border border-border rounded-xl p-5 mb-6 space-y-4">
      {/* Projeto Temático */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Projeto Temático
          </p>
          <h2 className="text-base font-semibold text-foreground leading-snug">
            {thematicTitle}
          </h2>
          
          <div className="flex flex-wrap items-center gap-4 mt-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">
                <span className="text-muted-foreground">Financiamento: </span>
                <span className="font-medium">{sponsorName}</span>
              </span>
            </div>
            
            {project.orientador && (
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">
                  <span className="text-muted-foreground">Orientador: </span>
                  <span className="font-medium">{project.orientador}</span>
                </span>
              </div>
            )}
          </div>
          
          {project.code && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                {project.code}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Plano de Trabalho (Subprojeto) */}
      <div className="border-t border-border pt-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-info" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Plano de Trabalho
            </p>
            <h3 className="text-base font-semibold text-foreground leading-snug">
              {project.title}
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
}