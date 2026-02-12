import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { GraduationCap, Search, Filter, Eye, AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ScholarRow {
  userId: string;
  fullName: string;
  email: string;
  organizationName: string;
  organizationId: string;
  thematicProjectTitle: string;
  subprojectTitle: string;
  onboardingStatus: string;
  bankStatus: string;
  reportStatus: string;
  enrollmentStatus: string;
}

export function ScholarsTab() {
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const navigate = useNavigate();

  // Fetch organizations for filter
  const { data: organizations } = useQuery({
    queryKey: ["admin-icca-orgs-scholars-filter"],
    queryFn: async () => {
      const { data } = await supabase
        .from("organizations")
        .select("id, name")
        .order("name");
      return data || [];
    }
  });

  // Fetch scholars
  const { data: scholars, isLoading } = useQuery({
    queryKey: ["admin-icca-scholars"],
    queryFn: async (): Promise<ScholarRow[]> => {
      // Get all profiles with scholar role
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select(`
          user_id,
          full_name,
          email,
          onboarding_status,
          organization_id,
          organizations(id, name)
        `)
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;

      const scholarRows: ScholarRow[] = [];

      for (const profile of profiles || []) {
        // Check if user has scholar role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", profile.user_id)
          .single();

        if (roleData?.role !== "scholar") continue;

        // Get enrollment info
        const { data: enrollment } = await supabase
          .from("enrollments")
          .select(`
            status,
            projects(title, thematic_projects(title))
          `)
          .eq("user_id", profile.user_id)
          .eq("status", "active")
          .maybeSingle();

        // Get bank account status
        const { data: bankAccount } = await supabase
          .from("bank_accounts")
          .select("validation_status")
          .eq("user_id", profile.user_id)
          .maybeSingle();

        // Get latest report status
        const { data: latestReport } = await supabase
          .from("reports")
          .select("status")
          .eq("user_id", profile.user_id)
          .order("submitted_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        scholarRows.push({
          userId: profile.user_id,
          fullName: profile.full_name || "Sem nome",
          email: profile.email || "",
          organizationName: (profile.organizations as any)?.name || "Sem organização",
          organizationId: (profile.organizations as any)?.id || "",
          thematicProjectTitle: (enrollment?.projects as any)?.thematic_projects?.title || "-",
          subprojectTitle: (enrollment?.projects as any)?.title || "-",
          onboardingStatus: profile.onboarding_status,
          bankStatus: bankAccount?.validation_status || "none",
          reportStatus: latestReport?.status || "none",
          enrollmentStatus: enrollment?.status || "none"
        });
      }

      return scholarRows;
    }
  });

  // Filter scholars
  const filteredScholars = scholars?.filter(scholar => {
    const matchesSearch = 
      scholar.fullName.toLowerCase().includes(search.toLowerCase()) ||
      scholar.email.toLowerCase().includes(search.toLowerCase());
    const matchesOrg = orgFilter === "all" || scholar.organizationId === orgFilter;
    
    let matchesStatus = true;
    if (statusFilter === "incomplete") {
      matchesStatus = scholar.onboardingStatus !== "COMPLETO";
    } else if (statusFilter === "blocked") {
      matchesStatus = scholar.enrollmentStatus === "suspended" || scholar.enrollmentStatus === "cancelled";
    } else if (statusFilter === "bank_pending") {
      matchesStatus = scholar.bankStatus === "pending" || scholar.bankStatus === "none";
    }

    return matchesSearch && matchesOrg && matchesStatus;
  }) || [];

  const getOnboardingBadge = (status: string) => {
    switch (status) {
      case "COMPLETO":
        return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle className="h-3 w-3 mr-1" />Completo</Badge>;
      case "DADOS_BANCARIOS_PENDENTES":
        return <Badge className="bg-warning/10 text-warning border-warning/20"><Clock className="h-3 w-3 mr-1" />Dados Bancários</Badge>;
      case "AGUARDANDO_ATRIBUICAO":
        return <Badge className="bg-info/10 text-info border-info/20"><Clock className="h-3 w-3 mr-1" />Aguardando</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getBankBadge = (status: string) => {
    switch (status) {
      case "validated":
        return <Badge className="bg-success/10 text-success border-success/20">Validado</Badge>;
      case "pending":
        return <Badge className="bg-warning/10 text-warning border-warning/20">Pendente</Badge>;
      case "under_review":
        return <Badge className="bg-info/10 text-info border-info/20">Em Análise</Badge>;
      case "returned":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Devolvido</Badge>;
      case "none":
        return <Badge variant="outline" className="text-muted-foreground">Não cadastrado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getReportBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success/10 text-success border-success/20">Aprovado</Badge>;
      case "under_review":
        return <Badge className="bg-info/10 text-info border-info/20">Em Análise</Badge>;
      case "rejected":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Recusado</Badge>;
      case "none":
        return <Badge variant="outline" className="text-muted-foreground">-</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getEnrollmentBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-success/10 text-success border-success/20">Ativo</Badge>;
      case "suspended":
        return <Badge className="bg-warning/10 text-warning border-warning/20">Suspenso</Badge>;
      case "completed":
        return <Badge className="bg-info/10 text-info border-info/20">Concluído</Badge>;
      case "cancelled":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Cancelado</Badge>;
      case "none":
        return <Badge variant="outline" className="text-muted-foreground">Sem vínculo</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Bolsistas (Visão Agregada)
          </CardTitle>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar bolsista..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={orgFilter} onValueChange={setOrgFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Organização" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Organizações</SelectItem>
                {organizations?.map(org => (
                  <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtro Rápido" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Bolsistas</SelectItem>
                <SelectItem value="incomplete">Cadastros Incompletos</SelectItem>
                <SelectItem value="blocked">Bloqueados</SelectItem>
                <SelectItem value="bank_pending">Dados Bancários Pendentes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Organização</TableHead>
                  <TableHead>Projeto Temático</TableHead>
                  <TableHead>Subprojeto</TableHead>
                  <TableHead className="text-center">Cadastro</TableHead>
                  <TableHead className="text-center">Bancário</TableHead>
                  <TableHead className="text-center">Relatórios</TableHead>
                  <TableHead className="text-center">Bolsa</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredScholars.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhum bolsista encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredScholars.map((scholar) => (
                    <TableRow key={scholar.userId}>
                      <TableCell className="font-medium">{scholar.fullName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{scholar.organizationName}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[150px] truncate">
                        {scholar.thematicProjectTitle}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[150px] truncate">
                        {scholar.subprojectTitle}
                      </TableCell>
                      <TableCell className="text-center">
                        {getOnboardingBadge(scholar.onboardingStatus)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getBankBadge(scholar.bankStatus)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getReportBadge(scholar.reportStatus)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getEnrollmentBadge(scholar.enrollmentStatus)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/bolsista/${scholar.userId}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
