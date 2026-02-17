import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { UsersManagement } from "@/components/dashboard/UsersManagement";

export default function AllUsers() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-foreground mb-1">Todos os Usuários</h1>
            <p className="text-muted-foreground mb-6">
              Gestão completa de todos os usuários cadastrados na plataforma.
            </p>
            <UsersManagement />
          </div>
        </main>
      </div>
    </div>
  );
}
