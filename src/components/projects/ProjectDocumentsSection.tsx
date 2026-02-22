import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Eye, Replace, Loader2, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { PdfViewerDialog } from '@/components/ui/PdfViewerDialog';

interface ProjectDocumentsSectionProps {
  projectId: string;
  contratoUrl: string | null;
  contratoNome: string | null;
  contratoUploadedAt: string | null;
  planoUrl: string | null;
  planoNome: string | null;
  planoUploadedAt: string | null;
  onUpdate: () => void;
  readOnly?: boolean;
}

export function ProjectDocumentsSection({
  projectId,
  contratoUrl,
  contratoNome,
  contratoUploadedAt,
  planoUrl,
  planoNome,
  planoUploadedAt,
  onUpdate,
  readOnly = false,
}: ProjectDocumentsSectionProps) {
  const [uploadingContrato, setUploadingContrato] = useState(false);
  const [uploadingPlano, setUploadingPlano] = useState(false);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfTitle, setPdfTitle] = useState("");
  const contratoInputRef = useRef<HTMLInputElement>(null);
  const planoInputRef = useRef<HTMLInputElement>(null);
  const { currentOrganization } = useOrganizationContext();

  const tenantId = currentOrganization?.id || 'default';

  const handleUpload = async (file: File, docType: 'contrato' | 'plano') => {
    const setUploading = docType === 'contrato' ? setUploadingContrato : setUploadingPlano;
    setUploading(true);

    try {
      const sanitizedName = file.name
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_');
      const filePath = `tenant/${tenantId}/projetos/${projectId}/${docType}_${Date.now()}_${sanitizedName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documentos-projetos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const updateData = docType === 'contrato'
        ? { contrato_projeto_url: filePath, contrato_projeto_nome: file.name, contrato_projeto_uploaded_at: new Date().toISOString() }
        : { plano_trabalho_url: filePath, plano_trabalho_nome: file.name, plano_trabalho_uploaded_at: new Date().toISOString() };

      const { error: dbError } = await supabase
        .from('thematic_projects')
        .update(updateData as any)
        .eq('id', projectId);

      if (dbError) throw dbError;

      toast.success(`${docType === 'contrato' ? 'Contrato' : 'Plano de Trabalho'} enviado com sucesso`);
      onUpdate();
    } catch (err) {
      console.error(err);
      toast.error(`Erro ao enviar ${docType === 'contrato' ? 'contrato' : 'plano de trabalho'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleView = async (filePath: string, docLabel: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documentos-projetos')
        .createSignedUrl(filePath, 300);

      if (error) throw error;

      setPdfUrl(data.signedUrl);
      setPdfTitle(docLabel);
      setPdfViewerOpen(true);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao abrir documento. O arquivo pode não existir mais.');
    }
  };

  const renderDocCard = (
    label: string,
    url: string | null,
    nome: string | null,
    uploadedAt: string | null,
    uploading: boolean,
    inputRef: React.RefObject<HTMLInputElement>,
    docType: 'contrato' | 'plano'
  ) => (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">{label}</h4>
        {!readOnly && (
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file, docType);
              e.target.value = '';
            }}
          />
        )}
      </div>

      {url && nome ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-primary" />
            <span className="truncate flex-1" title={nome}>{nome}</span>
          </div>
          {uploadedAt && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Enviado em {format(new Date(uploadedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" onClick={() => handleView(url!, label)}>
              <Eye className="h-4 w-4 mr-1" />
              Visualizar
            </Button>
            {!readOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Replace className="h-4 w-4 mr-1" />}
                Substituir
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground mb-2">Nenhum arquivo enviado</p>
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
              Enviar PDF
            </Button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-5 w-5 text-primary" />
          Documentos do Projeto
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderDocCard('Contrato do Projeto', contratoUrl, contratoNome, contratoUploadedAt, uploadingContrato, contratoInputRef, 'contrato')}
          {renderDocCard('Plano de Trabalho', planoUrl, planoNome, planoUploadedAt, uploadingPlano, planoInputRef, 'plano')}
        </div>
      </CardContent>
      <PdfViewerDialog
        open={pdfViewerOpen}
        onOpenChange={setPdfViewerOpen}
        title={pdfTitle}
        pdfUrl={pdfUrl}
      />
    </Card>
  );
}
