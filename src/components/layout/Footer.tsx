import logoInnovago from "@/assets/logo-innovago.png";

export function Footer() {
  return (
    <footer className="py-4 px-6 border-t border-border bg-background">
      <div className="flex flex-col items-center gap-2">
        <img src={logoInnovago} alt="InnovaGO" className="h-6 w-auto" />
        <p className="text-xs text-muted-foreground text-center">
          © InnovaGO – Sistema de Gestão de Bolsas em Pesquisa e Desenvolvimento (
          <a 
            href="https://www.innovago.app" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            www.innovago.app
          </a>
          )
        </p>
      </div>
    </footer>
  );
}
