import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { DollarSign, Search, Filter, CheckCircle, Clock, XCircle, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

interface PaymentKPIs {
  releasedThisPeriod: number;
  blockedPayments: number;
  orgsWithRecurrentPendencies: number;
}

interface PaymentRow {
  id: string;
  organizationName: string;
  scholarName: string;
  thematicProjectTitle: string;
  referenceMonth: string;
  reportStatus: string;
  paymentStatus: string;
  amount: number;
}

export function PaymentsGovernanceTab() {
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch organizations for filter
  const { data: organizations } = useQuery({
    queryKey: ["admin-icca-orgs-payments-filter"],
    queryFn: async () => {
      const { data } = await supabase
        .from("organizations")
        .select("id, name")
        .order("name");
      return data || [];
    }
  });

  // Fetch KPIs
  const { data: kpis } = useQuery({
    queryKey: ["admin-icca-payment-kpis"],
    queryFn: async (): Promise<PaymentKPIs> => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      // Released this period (eligible or paid this month)
      const { count: released } = await supabase
        .from("payments")
        .select("id", { count: "exact" })
        .in("status", ["eligible", "paid"])
        .gte("updated_at", `${currentMonth}-01`);

      // Blocked/pending payments
      const { count: blocked } = await supabase
        .from("payments")
        .select("id", { count: "exact" })
        .eq("status", "pending");

      return {
        releasedThisPeriod: released || 0,
        blockedPayments: blocked || 0,
        orgsWithRecurrentPendencies: 0 // Would need more complex logic
      };
    }
  });

  // Fetch payments
  const { data: payments, isLoading } = useQuery({
    queryKey: ["admin-icca-payments"],
    queryFn: async (): Promise<PaymentRow[]> => {
      const { data: paymentsData, error } = await supabase
        .from("payments")
        .select(`
          id,
          reference_month,
          status,
          amount,
          user_id,
          report_id
        `)
        .order("reference_month", { ascending: false })
        .limit(100);

      if (error) throw error;

      const paymentRows: PaymentRow[] = [];

      for (const payment of paymentsData || []) {
        // Get profile info
        const { data: profile } = await supabase
          .from("profiles")
          .select(`
            full_name,
            organization_id,
            organizations(name)
          `)
          .eq("user_id", payment.user_id)
          .single();

        // Get enrollment/project info
        const { data: enrollment } = await supabase
          .from("enrollments")
          .select(`
            projects(thematic_projects(title))
          `)
          .eq("user_id", payment.user_id)
          .eq("status", "active")
          .maybeSingle();

        // Get report status if exists
        let reportStatus = "none";
        if (payment.report_id) {
          const { data: report } = await supabase
            .from("reports")
            .select("status")
            .eq("id", payment.report_id)
            .single();
          reportStatus = report?.status || "none";
        }

        paymentRows.push({
          id: payment.id,
          organizationName: (profile?.organizations as any)?.name || "Sem organização",
          scholarName: profile?.full_name || "Sem nome",
          thematicProjectTitle: (enrollment?.projects as any)?.thematic_projects?.title || "-",
          referenceMonth: payment.reference_month,
          reportStatus,
          paymentStatus: payment.status,
          amount: payment.amount
        });
      }

      return paymentRows;
    }
  });

  // Filter payments
  const filteredPayments = payments?.filter(payment => {
    const matchesSearch = 
      payment.scholarName.toLowerCase().includes(search.toLowerCase()) ||
      payment.organizationName.toLowerCase().includes(search.toLowerCase());
    const matchesOrg = orgFilter === "all" || 
      organizations?.find(o => o.name === payment.organizationName)?.id === orgFilter;
    const matchesStatus = statusFilter === "all" || payment.paymentStatus === statusFilter;

    return matchesSearch && matchesOrg && matchesStatus;
  }) || [];

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle className="h-3 w-3 mr-1" />Pago</Badge>;
      case "eligible":
        return <Badge className="bg-info/10 text-info border-info/20"><TrendingUp className="h-3 w-3 mr-1" />Liberado</Badge>;
      case "pending":
        return <Badge className="bg-warning/10 text-warning border-warning/20"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case "cancelled":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="h-3 w-3 mr-1" />Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getReportStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success/10 text-success border-success/20">Aprovado</Badge>;
      case "under_review":
        return <Badge className="bg-info/10 text-info border-info/20">Em Análise</Badge>;
      case "rejected":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Recusado</Badge>;
      case "none":
        return <Badge variant="outline" className="text-muted-foreground">Não enviado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Parcelas Liberadas (Período)
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">
              {kpis?.releasedThisPeriod || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Parcelas Bloqueadas
            </CardTitle>
            <TrendingDown className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">
              {kpis?.blockedPayments || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Orgs com Pendências Recorrentes
            </CardTitle>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {kpis?.orgsWithRecurrentPendencies || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pagamentos (Governança)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Visão consolidada de pagamentos. O Admin ICCA visualiza, mas não executa pagamentos.
            </p>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
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
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="eligible">Liberado</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
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
                    <TableHead>Organização</TableHead>
                    <TableHead>Bolsista</TableHead>
                    <TableHead>Projeto Temático</TableHead>
                    <TableHead className="text-center">Mês Ref.</TableHead>
                    <TableHead className="text-center">Status Relatório</TableHead>
                    <TableHead className="text-center">Status Pagamento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum pagamento encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <Badge variant="outline">{payment.organizationName}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{payment.scholarName}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[150px] truncate">
                          {payment.thematicProjectTitle}
                        </TableCell>
                        <TableCell className="text-center">{payment.referenceMonth}</TableCell>
                        <TableCell className="text-center">
                          {getReportStatusBadge(payment.reportStatus)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getPaymentStatusBadge(payment.paymentStatus)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(payment.amount)}
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
    </div>
  );
}
