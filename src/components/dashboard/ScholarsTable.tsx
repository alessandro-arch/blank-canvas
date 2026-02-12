import { StatusBadge, StatusType } from "./StatusBadge";
import { MoreHorizontal, Eye, Edit, Trash2, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Scholar {
  id: string;
  name: string;
  email: string;
  course: string;
  scholarshipType: string;
  monthlyValue: number;
  status: StatusType;
  startDate: string;
}

// Empty array - data will be loaded from backend or imported via spreadsheet
const scholars: Scholar[] = [];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function ScholarsTable() {
  return (
    <div className="card-institutional overflow-hidden p-0">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Bolsistas Recentes</h3>
          <p className="text-sm text-muted-foreground">Últimos bolsistas cadastrados no sistema</p>
        </div>
        <Button variant="outline" size="sm">
          Ver todos
        </Button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="table-institutional">
          <thead>
            <tr>
              <th>Bolsista</th>
              <th>Curso</th>
              <th>Tipo de Bolsa</th>
              <th>Valor Mensal</th>
              <th>Data Início</th>
              <th>Status</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {scholars.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <Users className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Nenhum bolsista cadastrado</p>
                      <p className="text-sm text-muted-foreground">
                        Importe dados via planilha ou aguarde sincronização com o backend.
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              scholars.map((scholar) => (
                <tr key={scholar.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-primary">
                          {scholar.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{scholar.name}</p>
                        <p className="text-xs text-muted-foreground">{scholar.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-muted-foreground">{scholar.course}</td>
                  <td className="text-muted-foreground">{scholar.scholarshipType}</td>
                  <td className="font-medium text-foreground">{formatCurrency(scholar.monthlyValue)}</td>
                  <td className="text-muted-foreground">{scholar.startDate}</td>
                  <td>
                    <StatusBadge status={scholar.status} />
                  </td>
                  <td>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded hover:bg-muted transition-colors">
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2">
                          <Eye className="w-4 h-4" />
                          Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <Edit className="w-4 h-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-destructive">
                          <Trash2 className="w-4 h-4" />
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
