import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Search, CheckCircle, XCircle, Clock, Building2, Loader2 } from "lucide-react";

interface Institution {
  id: string;
  name: string;
  acronym: string | null;
  uf: string;
  municipality: string | null;
  cnpj: string | null;
  source: string;
  status: string;
  institution_type: string | null;
  submitted_by: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export default function InstitutionsManagement() {
  const { user } = useAuth();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("pending");
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });

  // Reject dialog
  const [rejectDialog, setRejectDialog] = useState<Institution | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchInstitutions = async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from("institutions")
        .select("*")
        .eq("status", tab)
        .order("created_at", { ascending: false })
        .limit(100);

      if (search.trim()) {
        const norm = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        query = query.or(`normalized_name.ilike.%${norm}%,acronym.ilike.%${search.toUpperCase()}%,cnpj.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setInstitutions(data || []);
    } catch (e) {
      console.error("Error fetching institutions:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCounts = async () => {
    try {
      const statuses = ["pending", "approved", "rejected"];
      const results = await Promise.all(
        statuses.map(s =>
          (supabase as any).from("institutions").select("id", { count: "exact", head: true }).eq("status", s)
        )
      );
      setCounts({
        pending: results[0].count || 0,
        approved: results[1].count || 0,
        rejected: results[2].count || 0,
      });
    } catch (e) {
      console.warn("Count error:", e);
    }
  };

  useEffect(() => { fetchInstitutions(); }, [tab, search]);
  useEffect(() => { fetchCounts(); }, []);

  const handleApprove = async (inst: Institution) => {
    setActionLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("institutions")
        .update({ status: "approved", rejection_reason: null })
        .eq("id", inst.id);
      if (error) throw error;

      await supabase.from("audit_logs").insert({
        user_id: user?.id,
        action: "institution_approved",
        entity_type: "institution",
        entity_id: inst.id,
        details: { name: inst.name, acronym: inst.acronym },
      } as any);

      toast.success(`"${inst.name}" aprovada com sucesso!`);
      fetchInstitutions();
      fetchCounts();
    } catch (e) {
      toast.error("Erro ao aprovar instituição.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("institutions")
        .update({ status: "rejected", rejection_reason: rejectReason.trim() })
        .eq("id", rejectDialog.id);
      if (error) throw error;

      await supabase.from("audit_logs").insert({
        user_id: user?.id,
        action: "institution_rejected",
        entity_type: "institution",
        entity_id: rejectDialog.id,
        details: { name: rejectDialog.name, reason: rejectReason.trim() },
      } as any);

      toast.success(`"${rejectDialog.name}" rejeitada.`);
      setRejectDialog(null);
      setRejectReason("");
      fetchInstitutions();
      fetchCounts();
    } catch (e) {
      toast.error("Erro ao rejeitar instituição.");
    } finally {
      setActionLoading(false);
    }
  };

  const typeLabel = (t: string | null) => {
    const map: Record<string, string> = { ies: "IES", empresa: "Empresa", ong: "ONG", orgao_publico: "Órgão Público" };
    return t ? map[t] || t : "—";
  };

  const formatCnpj = (c: string | null) => {
    if (!c || c.length !== 14) return c || "—";
    return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-6 h-6" /> Gestão de Instituições
              </h1>
              <p className="text-muted-foreground text-sm mt-1">Aprove ou rejeite instituições cadastradas por usuários.</p>
            </div>

            {/* Counters */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="cursor-pointer" onClick={() => setTab("pending")}>
                <CardContent className="p-4 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  <div><p className="text-2xl font-bold">{counts.pending}</p><p className="text-xs text-muted-foreground">Pendentes</p></div>
                </CardContent>
              </Card>
              <Card className="cursor-pointer" onClick={() => setTab("approved")}>
                <CardContent className="p-4 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div><p className="text-2xl font-bold">{counts.approved}</p><p className="text-xs text-muted-foreground">Aprovadas</p></div>
                </CardContent>
              </Card>
              <Card className="cursor-pointer" onClick={() => setTab("rejected")}>
                <CardContent className="p-4 flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-destructive" />
                  <div><p className="text-2xl font-bold">{counts.rejected}</p><p className="text-xs text-muted-foreground">Rejeitadas</p></div>
                </CardContent>
              </Card>
            </div>

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="pending">Pendentes</TabsTrigger>
                <TabsTrigger value="approved">Aprovadas</TabsTrigger>
                <TabsTrigger value="rejected">Rejeitadas</TabsTrigger>
              </TabsList>

              {/* Search */}
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome, sigla ou CNPJ..."
                  className="pl-10"
                />
              </div>

              <TabsContent value={tab} className="mt-4 space-y-3">
                {loading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : institutions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhuma instituição encontrada.</p>
                ) : (
                  institutions.map((inst) => (
                    <Card key={inst.id}>
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-foreground">{inst.name}</p>
                              {inst.acronym && <Badge variant="secondary" className="text-xs">{inst.acronym}</Badge>}
                              <Badge variant="outline" className="text-xs">{inst.uf}</Badge>
                              <Badge variant="outline" className="text-xs">{inst.source === "MEC" ? "MEC" : "Usuário"}</Badge>
                            </div>
                            <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                              {inst.municipality && <span>📍 {inst.municipality}</span>}
                              <span>CNPJ: {formatCnpj(inst.cnpj)}</span>
                              <span>Tipo: {typeLabel(inst.institution_type)}</span>
                              <span>Criado: {new Date(inst.created_at).toLocaleDateString("pt-BR")}</span>
                            </div>
                            {inst.rejection_reason && (
                              <p className="text-xs text-destructive mt-1">Motivo: {inst.rejection_reason}</p>
                            )}
                          </div>
                          {tab === "pending" && (
                            <div className="flex gap-2 shrink-0">
                              <Button size="sm" onClick={() => handleApprove(inst)} disabled={actionLoading} className="gap-1">
                                <CheckCircle className="w-4 h-4" /> Aprovar
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => setRejectDialog(inst)} disabled={actionLoading} className="gap-1">
                                <XCircle className="w-4 h-4" /> Rejeitar
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
        <Footer />
      </div>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={(o) => { if (!o) { setRejectDialog(null); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Instituição</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Você está rejeitando: <strong>{rejectDialog?.name}</strong>
          </p>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Informe o motivo da rejeição (obrigatório)..."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialog(null); setRejectReason(""); }}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim() || actionLoading}>
              {actionLoading ? "Rejeitando..." : "Confirmar Rejeição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
