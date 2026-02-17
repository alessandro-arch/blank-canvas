import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  FileBarChart,
  Inbox,
  FolderSync,
  Loader2,
  HardDrive,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";

// ── Unified row type ──────────────────────────────────────────────
interface ReportRow {
  id: string;
  entity_type: string;
  entity_id: string | null;
  file_path: string;
  file_size: number | null;
  generation_time_ms: number | null;
  created_at: string; // ISO string
  source: "db" | "storage"; // where this entry came from
}

// ── Labels / badges ───────────────────────────────────────────────
const entityTypeLabels: Record<string, string> = {
  bolsa: "Bolsa Individual",
  projeto_tematico: "Projeto Temático",
  executivo: "Executivo",
  consolidado: "Consolidado",
  importado: "Importado (Storage)",
};

const entityTypeBadgeClass: Record<string, string> = {
  bolsa: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  projeto_tematico: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  executivo: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  consolidado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  importado: "bg-muted text-muted-foreground",
};

// ── Storage prefixes to scan ──────────────────────────────────────
const STORAGE_PREFIXES = [
  { prefix: "executivo/", type: "executivo" },
  { prefix: "consolidado/", type: "consolidado" },
  { prefix: "bolsas/", type: "bolsa" },
] as const;

// ── Helper: infer type from path ──────────────────────────────────
function inferTypeFromPath(path: string): string {
  if (path.startsWith("executivo/")) return "executivo";
  if (path.startsWith("consolidado/")) return "consolidado";
  if (path.startsWith("bolsas/")) return "bolsa";
  return "importado";
}

// ── Helper: list files recursively under a prefix ─────────────────
async function listStorageFiles(prefix: string): Promise<
  { name: string; created_at: string | null; size: number | null }[]
> {
  const { data, error } = await supabase.storage
    .from("relatorios")
    .list(prefix, { limit: 500, sortBy: { column: "created_at", order: "desc" } });

  if (error) {
    console.warn(`Storage list error for prefix "${prefix}":`, error.message);
    return [];
  }

  return (data || [])
    .filter((f) => f.name && !f.name.endsWith("/")) // skip folders
    .map((f) => ({
      name: `${prefix}${f.name}`,
      created_at: f.created_at ?? null,
      size: (f.metadata as any)?.size ?? null,
    }));
}

export default function PdfReports() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("");
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfDialogStatus, setPdfDialogStatus] = useState<"loading" | "ready" | "error">("loading");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [indexing, setIndexing] = useState(false);

  // ── 1. Fetch pdf_logs (DB) ──────────────────────────────────────
  const { data: pdfLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["pdf-reports-db"],
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

  // ── 2. Fallback: list Storage files ─────────────────────────────
  const { data: storageFiles, isLoading: storageLoading } = useQuery({
    queryKey: ["pdf-reports-storage"],
    queryFn: async () => {
      const results = await Promise.all(
        STORAGE_PREFIXES.map((p) => listStorageFiles(p.prefix))
      );
      return results.flat();
    },
  });

  // ── 3. Thematic projects for reference names ────────────────────
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
    thematicProjects?.forEach((p) => { map[p.id] = p.title; });
    return map;
  }, [thematicProjects]);

  // ── 4. Merge DB + Storage (deduplicate by file_path) ────────────
  const allRows: ReportRow[] = useMemo(() => {
    const knownPaths = new Set<string>();
    const rows: ReportRow[] = [];

    // DB rows first (authoritative)
    (pdfLogs || []).forEach((log) => {
      knownPaths.add(log.file_path);
      rows.push({
        id: log.id,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        file_path: log.file_path,
        file_size: log.file_size,
        generation_time_ms: log.generation_time_ms,
        created_at: log.created_at,
        source: "db",
      });
    });

    // Storage fallback – only files NOT already in DB
    (storageFiles || []).forEach((sf) => {
      if (knownPaths.has(sf.name)) return;
      knownPaths.add(sf.name);
      rows.push({
        id: `storage-${sf.name}`,
        entity_type: inferTypeFromPath(sf.name),
        entity_id: null,
        file_path: sf.name,
        file_size: sf.size,
        generation_time_ms: null,
        created_at: sf.created_at || new Date().toISOString(),
        source: "storage",
      });
    });

    // Sort by date desc
    rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return rows;
  }, [pdfLogs, storageFiles]);

  // ── Derived filter options ──────────────────────────────────────
  const uniqueTypes = useMemo(() => {
    const types = new Set(allRows.map((r) => r.entity_type));
    return Array.from(types).sort();
  }, [allRows]);

  const uniqueProjects = useMemo(() => {
    if (!thematicProjects) return [];
    const ids = new Set(allRows.map((r) => r.entity_id).filter(Boolean));
    return thematicProjects.filter((p) => ids.has(p.id));
  }, [allRows, thematicProjects]);

  const storageOnlyCount = useMemo(
    () => allRows.filter((r) => r.source === "storage").length,
    [allRows]
  );

  // ── Filtered rows ──────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      if (typeFilter !== "all" && row.entity_type !== typeFilter) return false;
      if (projectFilter !== "all" && row.entity_id !== projectFilter) return false;
      if (monthFilter) {
        const rowMonth = format(parseISO(row.created_at), "yyyy-MM");
        if (rowMonth !== monthFilter) return false;
      }
      return true;
    });
  }, [allRows, typeFilter, projectFilter, monthFilter]);

  const isLoading = logsLoading || storageLoading;

  // ── Signed URL helpers ──────────────────────────────────────────
  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from("relatorios")
      .createSignedUrl(filePath, 600);
    if (error) {
      console.error("Error creating signed URL:", error);
      const isNotFound = (error as any)?.statusCode === "404" || error.message?.includes("not found");
      toast.error(isNotFound ? "Arquivo não encontrado no storage" : "Erro ao gerar link de acesso ao arquivo");
      return null;
    }
    return data?.signedUrl || null;
  };

  const handleOpen = async (filePath: string) => {
    if (isMobile) {
      setPdfDialogOpen(true);
      setPdfDialogStatus("loading");
      const url = await getSignedUrl(filePath);
      if (url) { setPdfUrl(url); setPdfDialogStatus("ready"); }
      else { setPdfDialogStatus("error"); }
      return;
    }
    const newWindow = window.open("about:blank", "_blank");
    const url = await getSignedUrl(filePath);
    if (url && newWindow) { newWindow.location.href = url; }
    else {
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

  // ── Indexing: create pdf_logs rows for storage-only files ───────
  const handleIndex = async () => {
    const storageOnly = allRows.filter((r) => r.source === "storage");
    if (storageOnly.length === 0) {
      toast.info("Todos os arquivos já estão indexados.");
      return;
    }

    setIndexing(true);
    let indexed = 0;
    try {
      for (const row of storageOnly) {
        const { error } = await supabase.from("pdf_logs").insert({
          entity_type: row.entity_type === "importado" ? "bolsa" : row.entity_type,
          entity_id: row.entity_id || "00000000-0000-0000-0000-000000000000",
          file_path: row.file_path,
          file_size: row.file_size,
          status: "success",
          user_id: user?.id || "",
        });
        if (!error) indexed++;
      }
      toast.success(`${indexed} relatório(s) indexado(s) com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ["pdf-reports-db"] });
      queryClient.invalidateQueries({ queryKey: ["pdf-reports-storage"] });
    } catch (err) {
      console.error("Indexing error:", err);
      toast.error("Erro ao indexar relatórios");
    } finally {
      setIndexing(false);
    }
  };

  // ── Format helpers ─────────────────────────────────────────────
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (iso: string) => {
    try { return format(parseISO(iso), "dd/MM/yyyy HH:mm", { locale: ptBR }); }
    catch { return "—"; }
  };

  // ── Render row helpers ─────────────────────────────────────────
  const renderTypeBadge = (row: ReportRow) => (
    <Badge className={entityTypeBadgeClass[row.entity_type] || entityTypeBadgeClass.importado}>
      {entityTypeLabels[row.entity_type] || row.entity_type}
    </Badge>
  );

  const renderSource = (row: ReportRow) =>
    row.source === "storage" ? (
      <Badge variant="outline" className="text-[10px] gap-1">
        <HardDrive className="w-3 h-3" /> Storage
      </Badge>
    ) : null;

  const renderRef = (row: ReportRow) => {
    if (row.entity_id && projectMap[row.entity_id]) return projectMap[row.entity_id];
    if (row.source === "storage") return row.file_path.split("/").pop() || "—";
    return row.entity_id?.substring(0, 8) || "—";
  };

  // ── JSX ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <AdminBanner />
          <div className="p-4 md:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <FileBarChart className="w-6 h-6 text-primary" />
                  Relatórios Gerados
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Histórico de relatórios PDF gerados na plataforma
                </p>
              </div>

              {storageOnlyCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleIndex}
                  disabled={indexing}
                  className="gap-2"
                >
                  {indexing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderSync className="w-4 h-4" />}
                  {indexing ? "Indexando..." : `Indexar ${storageOnlyCount} relatório(s)`}
                </Button>
              )}
            </div>

            {/* Storage-only banner */}
            {storageOnlyCount > 0 && !isLoading && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3 flex items-start gap-3 text-sm">
                <HardDrive className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-300">
                    {storageOnlyCount} arquivo(s) encontrado(s) apenas no Storage
                  </p>
                  <p className="text-amber-700 dark:text-amber-400/80 mt-0.5">
                    Esses relatórios existem no bucket mas não possuem registro no banco. Use o botão "Indexar" para criar os registros sem mover arquivos.
                  </p>
                </div>
              </div>
            )}

            {/* Filters */}
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo</label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger><SelectValue placeholder="Todos os tipos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        {uniqueTypes.map((t) => (
                          <SelectItem key={t} value={t}>{entityTypeLabels[t] || t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Projeto</label>
                    <Select value={projectFilter} onValueChange={setProjectFilter}>
                      <SelectTrigger><SelectValue placeholder="Todos os projetos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os projetos</SelectItem>
                        {uniqueProjects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Período</label>
                    <Input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="w-full" />
                  </div>
                  {(typeFilter !== "all" || projectFilter !== "all" || monthFilter) && (
                    <Button variant="ghost" size="sm" onClick={() => { setTypeFilter("all"); setProjectFilter("all"); setMonthFilter(""); }}>
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
                  {filteredRows.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{filteredRows.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : filteredRows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Inbox className="w-12 h-12 text-muted-foreground/40 mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-1">Nenhum relatório encontrado</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      {allRows.length === 0
                        ? "Nenhum relatório PDF foi gerado ainda. Gere relatórios a partir dos Projetos Temáticos ou da Gestão Financeira."
                        : "Nenhum relatório corresponde aos filtros selecionados."}
                    </p>
                  </div>
                ) : isMobile ? (
                  /* ── Mobile cards ── */
                  <div className="space-y-3">
                    {filteredRows.map((row) => (
                      <Card key={row.id} className="border">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {renderTypeBadge(row)}
                              {renderSource(row)}
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(row.created_at)}</span>
                          </div>
                          <p className="text-sm text-foreground truncate">{renderRef(row)}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatFileSize(row.file_size)}</span>
                            {row.generation_time_ms && <span>• {(row.generation_time_ms / 1000).toFixed(1)}s</span>}
                          </div>
                          <div className="flex gap-2 pt-1">
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => handleOpen(row.file_path)}>
                              <ExternalLink className="w-3.5 h-3.5 mr-1" /> Abrir
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => handleDownload(row.file_path)}>
                              <Download className="w-3.5 h-3.5 mr-1" /> Baixar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  /* ── Desktop table ── */
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Origem</TableHead>
                          <TableHead>Referência</TableHead>
                          <TableHead>Data de Geração</TableHead>
                          <TableHead>Tamanho</TableHead>
                          <TableHead>Tempo</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>{renderTypeBadge(row)}</TableCell>
                            <TableCell>{renderSource(row) || <span className="text-xs text-muted-foreground">Banco</span>}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{renderRef(row)}</TableCell>
                            <TableCell className="whitespace-nowrap">{formatDate(row.created_at)}</TableCell>
                            <TableCell>{formatFileSize(row.file_size)}</TableCell>
                            <TableCell>{row.generation_time_ms ? `${(row.generation_time_ms / 1000).toFixed(1)}s` : "—"}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                <Button size="sm" variant="ghost" onClick={() => handleOpen(row.file_path)}>
                                  <ExternalLink className="w-4 h-4 mr-1" /> Abrir
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleDownload(row.file_path)}>
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
