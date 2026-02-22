import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Upload, CheckCircle } from "lucide-react";

export function ImportMecButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleImport = async () => {
    setLoading(true);
    try {
      // Fetch CSV from same origin (public folder)
      const response = await fetch("/data/institutions-mec.csv");
      if (!response.ok) throw new Error("Falha ao carregar CSV");
      const csvData = await response.text();

      // Send to edge function
      const { data, error } = await supabase.functions.invoke("import-institutions-mec", {
        body: { csv_data: csvData, skip_check: true },
      });

      if (error) throw error;

      const msg = data?.message || `${data?.imported || 0} instituições importadas`;
      setResult(msg);
      toast.success(msg);
    } catch (e: any) {
      console.error("Import error:", e);
      toast.error("Erro na importação: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handleImport} disabled={loading} variant="outline" size="sm">
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : result ? (
          <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
        ) : (
          <Upload className="w-4 h-4 mr-2" />
        )}
        {result || "Importar base MEC"}
      </Button>
    </div>
  );
}
