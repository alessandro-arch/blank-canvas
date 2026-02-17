import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { AdminBanner } from "@/components/admin/AdminBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PdfReadyDialog } from "@/components/ui/PdfReadyDialog";
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
  FileText,
  Download,
  ExternalLink,
  Search,
  FileBarChart,
  Calendar,
  Filter,
  Inbox,
} from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

const entityTypeLabels: Record<string, string> = {
  bolsa: "Bolsa Individual",
  projeto_tematico: "Projeto Temático",
  executivo: "Executivo",
  consolidado: "Consolidado",
};

const entityTypeBadgeClass: Record<string, string> = {
  bolsa: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  projeto_tematico: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  executivo: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  consolidado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
};

export default function PdfReports() {
  const isMobile = useIsMobile();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("");
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfDialogStatus, setPdfDialogStatus] = useState<"loading" | "ready" | "error">("loading");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Fetch pdf_logs
  const { data: pdfLogs, isLoading } = useQuery({
    queryKey: ["pdf-reports-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pdf_logs")
        .select("*")
        .eq("status", "success")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch thematic projects for reference names
  const { data: thematicProjects } = useQuery({
    queryKey: ["pdf-reports-thematic-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("thematic_projects")
        .select("id, title");
      if (error) throw error;
      return data || [];
    },
  });

  const projectMap = useMemo(() => {
    const map: Record<string, string> = {};
    thematicProjects?.forEach((p) => {
      map[p.id] = p.title;
    });
    return map;
  }, [thematicProjects]);

  // Unique entity types for filter
  const uniqueTypes = useMemo(() => {
    if (!pdfLogs) return [];
    const types = new Set(pdfLogs.map((l) => l.entity_type));
    return Array.from(types).sort();
  }, [pdfLogs]);

  // Unique entity_ids that match thematic projects
  const uniqueProjects = useMemo(() => {
    if (!pdfLogs || !thematicProjects) return [];
    const ids = new Set(pdfLogs.map((l) => l.entity_id));
    return thematicProjects.filter((p) => ids.has(p.id));
  }, [pdfLogs, thematicProjects]);

  // Filter
  const filteredLogs = useMemo(() => {
    if (!pdfLogs) return [];
    return pdfLogs.filter((log) => {
      if (typeFilter !== "all" && log.entity_type !== typeFilter) return false;
      if (projectFilter !== "all" && log.entity_id !== projectFilter) return false;
      if (monthFilter) {
        const logMonth = format(parseISO(log.created_at), "yyyy-MM");
        if (logMonth !== monthFilter) return false;
      }
      return true;
    });
  }, [pdfLogs, typeFilter, projectFilter, monthFilter]);

  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from("relatorios")
      .createSignedUrl(filePath, 600);
    if (error) {
      console.error("Error creating signed URL:", error);
      toast.error("Erro ao gerar link de acesso ao arquivo");
      return null;
    }
    return data?.signedUrl || null;
  };

  const handleOpen = async (filePath: string) => {
    if (isMobile) {
      setPdfDialogOpen(true);
      setPdfDialogStatus("loading");
      const url = await getSignedUrl(filePath);
      if (url) {
        setPdfUrl(url);
        setPdfDialogStatus("ready");
      } else {
        setPdfDialogStatus("error");
      }
      return;
    }

    const newWindow = window.open("about:blank", "_blank");
    const url = await getSignedUrl(filePath);
    if (url && newWindow) {
      newWindow.location.href = url;
    } else {
      newWindow?.close();
      if (!url) toast.error("Erro ao gerar link de acesso");
      else toast.error("Permita pop-ups no navegador para visualizar o arquivo");
    }
  };

  const handleDownload = async (filePath: string) => {
    const url = await getSignedUrl(filePath);
    if (url) {
      const link = document.createElement("a");
      link.href = url;
      link.download = filePath.split("/").pop() || "relatorio.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <AdminBanner />
          <div className="p-4 md:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <FileBarChart className="w-6 h-6 text-primary" />
                Relatórios Gerados
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Histórico de relatórios PDF gerados na plataforma
              </p>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo</label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os tipos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        {uniqueTypes.map((t) => (
                          <SelectItem key={t} value={t}>
                            {entityTypeLabels[t] || t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 min-w-[140px]">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Projeto</label>
                    <Select value={projectFilter} onValueChange={setProjectFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os projetos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os projetos</SelectItem>
                        {uniqueProjects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 min-w-[140px]">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Período</label>
                    <Input
                      type="month"
                      value={monthFilter}
                      onChange={(e) => setMonthFilter(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  {(typeFilter !== "all" || projectFilter !== "all" || monthFilter) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setTypeFilter("all");
                        setProjectFilter("all");
                        setMonthFilter("");
                      }}
                    >
                      Limpar filtros
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Relatórios
                  {filteredLogs.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{filteredLogs.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Inbox className="w-12 h-12 text-muted-foreground/40 mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-1">Nenhum relatório encontrado</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      {pdfLogs?.length === 0
                        ? "Nenhum relatório PDF foi gerado ainda. Gere relatórios a partir dos Projetos Temáticos ou da Gestão Financeira."
                        : "Nenhum relatório corresponde aos filtros selecionados."}
                    </p>
                  </div>
                ) : isMobile ? (
                  <div className="space-y-3">
                    {filteredLogs.map((log) => (
                      <Card key={log.id} className="border">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge className={entityTypeBadgeClass[log.entity_type] || "bg-muted text-muted-foreground"}>
                              {entityTypeLabels[log.entity_type] || log.entity_type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          <p className="text-sm text-foreground truncate">
                            {projectMap[log.entity_id] || log.entity_id?.substring(0, 8) || "—"}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatFileSize(log.file_size)}</span>
                            {log.generation_time_ms && <span>• {(log.generation_time_ms / 1000).toFixed(1)}s</span>}
                          </div>
                          <div className="flex gap-2 pt-1">
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => handleOpen(log.file_path)}>
                              <ExternalLink className="w-3.5 h-3.5 mr-1" /> Abrir
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => handleDownload(log.file_path)}>
                              <Download className="w-3.5 h-3.5 mr-1" /> Baixar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Referência</TableHead>
                          <TableHead>Data de Geração</TableHead>
                          <TableHead>Tamanho</TableHead>
                          <TableHead>Tempo</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <Badge className={entityTypeBadgeClass[log.entity_type] || "bg-muted text-muted-foreground"}>
                                {entityTypeLabels[log.entity_type] || log.entity_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {projectMap[log.entity_id] || log.entity_id?.substring(0, 8) || "—"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {format(parseISO(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell>{formatFileSize(log.file_size)}</TableCell>
                            <TableCell>
                              {log.generation_time_ms ? `${(log.generation_time_ms / 1000).toFixed(1)}s` : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                <Button size="sm" variant="ghost" onClick={() => handleOpen(log.file_path)}>
                                  <ExternalLink className="w-4 h-4 mr-1" /> Abrir
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleDownload(log.file_path)}>
                                  <Download className="w-4 h-4 mr-1" /> Baixar
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <Footer />
        </main>
      </div>

      <PdfReadyDialog
        open={pdfDialogOpen}
        onOpenChange={(open) => { setPdfDialogOpen(open); if (!open) setPdfUrl(null); }}
        signedUrl={pdfUrl}
        status={pdfDialogStatus}
      />
    </div>
  );
}
