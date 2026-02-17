import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/contexts/ThemeContext";
import { useUserRole } from "@/hooks/useUserRole";
import { OrgSettingsTab } from "@/components/settings/OrgSettingsTab";
import { Sun, Moon, Monitor, PanelLeft, PanelLeftClose, MousePointerClick, Maximize, Minimize } from "lucide-react";

export default function Settings() {
  const { settings, updateSettings, loading } = useTheme();
  const { hasManagerAccess } = useUserRole();

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
              <p className="text-muted-foreground">Gerencie suas preferências e configurações institucionais.</p>
            </div>

            <Tabs defaultValue="user">
              <TabsList>
                <TabsTrigger value="user">Preferências</TabsTrigger>
                {hasManagerAccess && (
                  <TabsTrigger value="org">Institucional</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="user" className="space-y-4 mt-4">
                {/* Theme */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tema</CardTitle>
                    <CardDescription>Escolha o modo de aparência da interface.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: "light", label: "Claro", icon: Sun },
                        { value: "dark", label: "Escuro", icon: Moon },
                        { value: "system", label: "Sistema", icon: Monitor },
                      ].map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          onClick={() => updateSettings({ theme_mode: value as any })}
                          className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                            settings.theme_mode === value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-muted-foreground/30"
                          }`}
                          disabled={loading}
                        >
                          <Icon className={`w-6 h-6 ${settings.theme_mode === value ? "text-primary" : "text-muted-foreground"}`} />
                          <span className={`text-sm font-medium ${settings.theme_mode === value ? "text-primary" : "text-muted-foreground"}`}>
                            {label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Sidebar Behavior */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Barra Lateral</CardTitle>
                    <CardDescription>Controle o comportamento da navegação lateral.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: "expanded", label: "Expandida", icon: PanelLeft },
                        { value: "collapsed", label: "Compacta", icon: PanelLeftClose },
                        { value: "hover", label: "Ao Passar", icon: MousePointerClick },
                      ].map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          onClick={() => updateSettings({ sidebar_behavior: value as any })}
                          className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                            settings.sidebar_behavior === value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-muted-foreground/30"
                          }`}
                          disabled={loading}
                        >
                          <Icon className={`w-6 h-6 ${settings.sidebar_behavior === value ? "text-primary" : "text-muted-foreground"}`} />
                          <span className={`text-sm font-medium ${settings.sidebar_behavior === value ? "text-primary" : "text-muted-foreground"}`}>
                            {label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Density */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Densidade</CardTitle>
                    <CardDescription>Ajuste o espaçamento dos elementos da interface.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: "comfortable", label: "Confortável", icon: Maximize, desc: "Mais espaçamento, ideal para telas grandes" },
                        { value: "compact", label: "Compacta", icon: Minimize, desc: "Menos espaçamento, mais conteúdo visível" },
                      ].map(({ value, label, icon: Icon, desc }) => (
                        <button
                          key={value}
                          onClick={() => updateSettings({ density: value as any })}
                          className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                            settings.density === value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-muted-foreground/30"
                          }`}
                          disabled={loading}
                        >
                          <Icon className={`w-6 h-6 ${settings.density === value ? "text-primary" : "text-muted-foreground"}`} />
                          <span className={`text-sm font-medium ${settings.density === value ? "text-primary" : "text-muted-foreground"}`}>
                            {label}
                          </span>
                          <span className="text-xs text-muted-foreground text-center">{desc}</span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {hasManagerAccess && (
                <TabsContent value="org" className="mt-4">
                  <OrgSettingsTab />
                </TabsContent>
              )}
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
