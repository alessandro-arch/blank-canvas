import { useState, useCallback, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { FileUploader } from '@/components/import/FileUploader';
import { ImportTypeSelector } from '@/components/import/ImportTypeSelector';
import { DataPreviewTable } from '@/components/import/DataPreviewTable';
import { ImportSummary } from '@/components/import/ImportSummary';
import { ImportResultReport } from '@/components/import/ImportResultReport';
import { useSpreadsheetParser } from '@/hooks/useSpreadsheetParser';
import { useDuplicateChecker } from '@/hooks/useDuplicateChecker';
import { useUserRole } from '@/hooks/useUserRole';
import { ImportType, ImportPreview, ImportResult, DuplicateAction, IMPORT_TYPES } from '@/types/import';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { unformatCPF, validateCPF } from '@/lib/cpf-validator';
import { 
  ChevronRight, 
  ChevronLeft, 
  Upload, 
  AlertCircle,
  Loader2,
  Download,
  ShieldAlert
} from 'lucide-react';

type Step = 'select-type' | 'upload' | 'preview' | 'importing' | 'result';

export default function Import() {
  const [currentStep, setCurrentStep] = useState<Step>('select-type');
  const [selectedType, setSelectedType] = useState<ImportType | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showSelectionWarning, setShowSelectionWarning] = useState(false);

  const { parseFile, isLoading: isParsing, error: parseError } = useSpreadsheetParser();
  const { checkDuplicates, isChecking } = useDuplicateChecker();
  const { hasManagerAccess, loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  // Check if user can process specific import types
  const canProcessImport = (type: ImportType | null): boolean => {
    if (!type) return false;
    // Projects and enrollments require manager access
    if (type === 'projects' || type === 'enrollments') {
      return hasManagerAccess;
    }
    // Other types also require manager access for now
    return hasManagerAccess;
  };

  const handleTypeSelect = (type: ImportType) => {
    setSelectedType(type);
    setCurrentStep('upload');
    setSelectedRows(new Set());
    setShowSelectionWarning(false);
  };

  const handleFileSelect = async (file: File) => {
    if (!selectedType) return;
    
    setSelectedFile(file);
    
    try {
      const parsedPreview = await parseFile(file, selectedType);
      
      // For scholars import, check for duplicates
      if (selectedType === 'scholars') {
        const checkedRows = await checkDuplicates(parsedPreview.rows);
        
        const newRows = checkedRows.filter(r => r.isValid && r.duplicateInfo?.status === 'new').length;
        const duplicateRows = checkedRows.filter(r => r.isValid && r.duplicateInfo?.status === 'duplicate').length;
        const conflictRows = checkedRows.filter(r => r.isValid && r.duplicateInfo?.status === 'conflict').length;
        
        setPreview({
          ...parsedPreview,
          rows: checkedRows,
          newRows,
          duplicateRows,
          conflictRows,
        });

        // Auto-select new valid rows for scholars
        const validRowNumbers = checkedRows
          .filter(r => r.isValid && r.duplicateInfo?.status === 'new')
          .map(r => r.rowNumber);
        setSelectedRows(new Set(validRowNumbers));
      } else {
        // For other import types (projects, bank_accounts, enrollments)
        // Auto-select all valid rows
        const validRowNumbers = parsedPreview.rows
          .filter(r => r.isValid)
          .map(r => r.rowNumber);
        setSelectedRows(new Set(validRowNumbers));
        
        setPreview({
          ...parsedPreview,
          newRows: parsedPreview.validRows,
          duplicateRows: 0,
          conflictRows: 0,
        });
      }
      
      setCurrentStep('preview');
      setShowSelectionWarning(false);
    } catch {
      toast({
        title: 'Erro ao processar arquivo',
        description: parseError || 'Não foi possível ler o arquivo',
        variant: 'destructive',
      });
    }
  };

  const handleRowActionChange = (rowNumber: number, action: DuplicateAction) => {
    if (!preview) return;
    
    setPreview({
      ...preview,
      rows: preview.rows.map(row => {
        if (row.rowNumber === rowNumber && row.duplicateInfo) {
          return {
            ...row,
            duplicateInfo: {
              ...row.duplicateInfo,
              action,
            },
          };
        }
        return row;
      }),
    });

    // Update selection based on action
    if (action === 'update' || action === 'import') {
      setSelectedRows(prev => new Set([...prev, rowNumber]));
    } else if (action === 'skip') {
      setSelectedRows(prev => {
        const next = new Set(prev);
        next.delete(rowNumber);
        return next;
      });
    }
  };

  const handleRowSelectionChange = (rowNumber: number, selected: boolean) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(rowNumber);
      } else {
        next.delete(rowNumber);
      }
      return next;
    });
    setShowSelectionWarning(false);
  };

  const handleSelectAllValid = (selected: boolean) => {
    if (!preview) return;
    
    if (selected) {
      const validRowNumbers = preview.rows
        .filter(r => r.isValid)
        .map(r => r.rowNumber);
      setSelectedRows(new Set(validRowNumbers));
    } else {
      setSelectedRows(new Set());
    }
    setShowSelectionWarning(false);
  };

  const handleImport = useCallback(async () => {
    if (!preview || !selectedType || !selectedFile) return;

    // Check if any rows are selected
    if (selectedRows.size === 0) {
      setShowSelectionWarning(true);
      toast({
        title: 'Nenhum registro selecionado',
        description: 'Selecione ao menos um registro válido para processar.',
        variant: 'destructive',
      });
      return;
    }

    setCurrentStep('importing');
    setImportProgress(0);

    const startedAt = new Date().toISOString();
    
    // Get rows to process based on selection
    const rowsToProcess = preview.rows.filter(r => 
      r.isValid && selectedRows.has(r.rowNumber)
    );
    const invalidRows = preview.rows.filter(r => !r.isValid);
    const skippedByUser = preview.rows.filter(r => 
      r.isValid && !selectedRows.has(r.rowNumber)
    );
    
    // Separate by action for scholars
    const rowsToImport = rowsToProcess.filter(r => 
      !r.duplicateInfo || r.duplicateInfo?.status === 'new' || r.duplicateInfo?.action === 'import'
    );
    const rowsToUpdate = rowsToProcess.filter(r => 
      r.duplicateInfo && 
      (r.duplicateInfo?.status === 'duplicate' || r.duplicateInfo?.status === 'conflict') && 
      r.duplicateInfo?.action === 'update'
    );
    
    const importedRecords: ImportResult['importedRecords'] = [];
    const updatedRecords: ImportResult['updatedRecords'] = [];
    const skippedRecords: ImportResult['skippedRecords'] = [];
    const rejectedRecords: ImportResult['rejectedRecords'] = [];

    // Add invalid rows to rejected
    invalidRows.forEach(row => {
      rejectedRecords.push({
        rowNumber: row.rowNumber,
        data: row.data,
        reasons: row.errors,
      });
    });

    // Add user-skipped rows
    skippedByUser.forEach(row => {
      skippedRecords.push({
        rowNumber: row.rowNumber,
        data: row.data,
        reason: row.duplicateInfo?.conflictReason || 'Não selecionado para importação',
      });
    });

    const totalToProcess = rowsToImport.length + rowsToUpdate.length;
    let processed = 0;

    // Process new records (import)
    for (const row of rowsToImport) {
      processed++;
      setImportProgress(Math.round((processed / totalToProcess) * 100));

      try {
        if (selectedType === 'scholars') {
          const email = String(row.data.email || '');
          const cpf = String(row.data.cpf || '');
          
          if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            rejectedRecords.push({
              rowNumber: row.rowNumber,
              data: row.data,
              reasons: ['Email inválido ou ausente'],
            });
            continue;
          }

          if (!cpf || !validateCPF(cpf)) {
            rejectedRecords.push({
              rowNumber: row.rowNumber,
              data: row.data,
              reasons: ['CPF inválido'],
            });
            continue;
          }

          importedRecords.push({
            rowNumber: row.rowNumber,
            data: row.data,
          });
        } else if (selectedType === 'projects') {
          // Process project/subproject import
          const code = String(row.data.code || '');
          const title = String(row.data.title || '');
          const orientador = String(row.data.orientador || row.data.empresa_parceira || '');
          const modalidadeBolsa = String(row.data.modalidade_bolsa || '');
          const valorMensal = Number(row.data.valor_mensal);
          const startDate = String(row.data.start_date || '');
          const endDate = String(row.data.end_date || '');
          const coordenadorTecnicoIcca = row.data.coordenador_tecnico_icca ? String(row.data.coordenador_tecnico_icca) : null;

          // Validate required fields
          const errors: string[] = [];
          if (!code) errors.push('Código é obrigatório');
          if (!title) errors.push('Título é obrigatório');
          if (!orientador) errors.push('Orientador é obrigatório');
          if (!modalidadeBolsa) errors.push('Modalidade da bolsa é obrigatória');
          if (isNaN(valorMensal) || valorMensal <= 0) errors.push('Valor mensal deve ser um número positivo');
          if (!startDate) errors.push('Data de início é obrigatória');
          if (!endDate) errors.push('Data de término é obrigatória');

          if (errors.length > 0) {
            rejectedRecords.push({
              rowNumber: row.rowNumber,
              data: row.data,
              reasons: errors,
            });
            continue;
          }

          // Get the active thematic project
          const { data: thematicProject } = await supabase
            .from('thematic_projects')
            .select('id')
            .eq('status', 'active')
            .limit(1)
            .maybeSingle();

          if (!thematicProject) {
            rejectedRecords.push({
              rowNumber: row.rowNumber,
              data: row.data,
              reasons: ['Nenhum Projeto Temático ativo encontrado'],
            });
            continue;
          }

          // Insert into database
          const { error } = await supabase
            .from('projects')
            .insert({
              code,
              title,
              orientador,
              thematic_project_id: thematicProject.id,
              modalidade_bolsa: modalidadeBolsa,
              valor_mensal: valorMensal,
              start_date: startDate,
              end_date: endDate,
              coordenador_tecnico_icca: coordenadorTecnicoIcca,
            });

          if (error) {
            const dbErrorMap: Record<string, string> = {
              '23505': `Projeto com código "${code}" já existe`,
              '23503': 'Referência inválida - dados relacionados não encontrados',
              '23502': 'Campo obrigatório não preenchido',
              '23514': 'Valor inválido para o campo',
              '22001': 'Texto muito longo para o campo',
              '22P02': 'Formato de dado inválido',
            };
            const reason = dbErrorMap[error.code] || 'Erro ao processar registro. Verifique os dados e tente novamente.';
            console.error('Import error:', { code: error.code, row: row.rowNumber });
            rejectedRecords.push({
              rowNumber: row.rowNumber,
              data: row.data,
              reasons: [reason],
            });
          } else {
            importedRecords.push({
              rowNumber: row.rowNumber,
              data: row.data,
            });
          }
        } else {
          // Other import types - basic validation
          importedRecords.push({
            rowNumber: row.rowNumber,
            data: row.data,
          });
        }

        await new Promise(resolve => setTimeout(resolve, 30));
      } catch (err) {
        rejectedRecords.push({
          rowNumber: row.rowNumber,
          data: row.data,
          reasons: [err instanceof Error ? err.message : 'Erro desconhecido'],
        });
      }
    }

    // Process updates
    for (const row of rowsToUpdate) {
      processed++;
      setImportProgress(Math.round((processed / totalToProcess) * 100));

      try {
        if (selectedType === 'scholars' && row.duplicateInfo?.existingProfileId) {
          const updateData: Record<string, unknown> = {
            full_name: row.data.full_name,
            origin: 'import',
          };

          const { error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', row.duplicateInfo.existingProfileId);

          if (error) {
            rejectedRecords.push({
              rowNumber: row.rowNumber,
              data: row.data,
              reasons: [error.message],
            });
          } else {
            updatedRecords.push({
              rowNumber: row.rowNumber,
              data: row.data,
            });
          }
        } else {
          updatedRecords.push({
            rowNumber: row.rowNumber,
            data: row.data,
          });
        }

        await new Promise(resolve => setTimeout(resolve, 30));
      } catch (err) {
        rejectedRecords.push({
          rowNumber: row.rowNumber,
          data: row.data,
          reasons: [err instanceof Error ? err.message : 'Erro desconhecido'],
        });
      }
    }

    const result: ImportResult = {
      success: importedRecords.length > 0 || updatedRecords.length > 0,
      importedCount: importedRecords.length,
      updatedCount: updatedRecords.length,
      skippedCount: skippedRecords.length,
      rejectedCount: rejectedRecords.length,
      importedRecords,
      updatedRecords,
      skippedRecords,
      rejectedRecords,
      summary: {
        startedAt,
        completedAt: new Date().toISOString(),
        importType: selectedType,
        fileName: selectedFile.name,
        totalProcessed: preview.totalRows,
      },
    };

    setImportResult(result);
    setCurrentStep('result');

    toast({
      title: result.success ? 'Importação concluída' : 'Importação com erros',
      description: `${result.importedCount} novo(s), ${result.updatedCount} atualizado(s), ${result.skippedCount} ignorado(s), ${result.rejectedCount} rejeitado(s)`,
      variant: result.rejectedCount > 0 ? 'destructive' : 'default',
    });
  }, [preview, selectedType, selectedFile, selectedRows, toast]);

  const handleNewImport = () => {
    setCurrentStep('select-type');
    setSelectedType(null);
    setSelectedFile(null);
    setPreview(null);
    setImportResult(null);
    setImportProgress(0);
    setSelectedRows(new Set());
    setShowSelectionWarning(false);
  };

  const downloadTemplate = () => {
    if (!selectedType) return;
    
    const config = IMPORT_TYPES[selectedType];
    const headers = [...config.requiredFields, ...config.optionalFields];
    
    const csvContent = headers.join(',');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modelo-${selectedType}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStepNumber = (): number => {
    switch (currentStep) {
      case 'select-type': return 1;
      case 'upload': return 2;
      case 'preview': return 3;
      case 'importing': return 4;
      case 'result': return 4;
      default: return 1;
    }
  };

  const getSelectedCount = () => {
    return selectedRows.size;
  };

  const hasPermission = canProcessImport(selectedType);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Page header */}
            <div>
              <h1 className="text-2xl font-bold text-foreground">Importar Dados</h1>
              <p className="text-muted-foreground">
                Importe bolsistas, dados bancários, projetos e vínculos via planilha
              </p>
            </div>

            {/* Progress steps */}
            <div className="flex items-center gap-2">
              {['Tipo', 'Arquivo', 'Revisar', 'Concluir'].map((label, index) => (
                <div key={label} className="flex items-center">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                    getStepNumber() > index + 1 
                      ? 'bg-success text-success-foreground' 
                      : getStepNumber() === index + 1 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 text-xs">
                      {index + 1}
                    </span>
                    {label}
                  </div>
                  {index < 3 && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />
                  )}
                </div>
              ))}
            </div>

            <Separator />

            {/* Step content */}
            {currentStep === 'select-type' && (
              <Card>
                <CardHeader>
                  <CardTitle>Selecione o Tipo de Importação</CardTitle>
                  <CardDescription>
                    Escolha qual tipo de dados você deseja importar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ImportTypeSelector 
                    selected={selectedType} 
                    onSelect={handleTypeSelect} 
                  />
                </CardContent>
              </Card>
            )}

            {currentStep === 'upload' && selectedType && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Upload de Arquivo</CardTitle>
                      <CardDescription>
                        Tipo selecionado: <strong>{IMPORT_TYPES[selectedType].label}</strong>
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={downloadTemplate}>
                      <Download className="w-4 h-4 mr-2" />
                      Baixar Modelo
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FileUploader onFileSelect={handleFileSelect} />
                  
                  {(isParsing || isChecking) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {isChecking ? 'Verificando duplicados...' : 'Processando arquivo...'}
                    </div>
                  )}

                  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                    <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium mb-1">Campos obrigatórios:</p>
                      <p>{IMPORT_TYPES[selectedType].requiredFields.join(', ')}</p>
                      {IMPORT_TYPES[selectedType].optionalFields.length > 0 && (
                        <>
                          <p className="font-medium mt-2 mb-1">Campos opcionais:</p>
                          <p>{IMPORT_TYPES[selectedType].optionalFields.join(', ')}</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <Button variant="outline" onClick={() => setCurrentStep('select-type')}>
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Voltar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 'preview' && preview && selectedType && (
              <div className="space-y-6">
                <ImportSummary preview={preview} />

                {/* Permission warning */}
                {!roleLoading && !hasPermission && (
                  <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertDescription>
                      Você não tem permissão para processar importações de {IMPORT_TYPES[selectedType].label.toLowerCase()}. 
                      Apenas Gestores ou Administradores podem realizar esta ação.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Selection warning */}
                {showSelectionWarning && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Selecione ao menos um registro válido para processar.
                    </AlertDescription>
                  </Alert>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Pré-visualização dos Dados</CardTitle>
                    <CardDescription>
                      Revise os dados antes de confirmar a importação. 
                      {selectedType === 'scholars' && ' Para registros duplicados ou em conflito, escolha a ação desejada.'}
                      {' '}Use os checkboxes para selecionar os registros a processar.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DataPreviewTable 
                      rows={preview.rows} 
                      importType={selectedType}
                      onActionChange={handleRowActionChange}
                      selectedRows={selectedRows}
                      onRowSelectionChange={handleRowSelectionChange}
                      onSelectAllValid={handleSelectAllValid}
                    />
                  </CardContent>
                </Card>

                {preview.invalidRows > 0 && (
                  <div className="p-4 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Atenção</p>
                      <p className="text-sm text-muted-foreground">
                        {preview.invalidRows} registro(s) contêm erros e não podem ser selecionados.
                      </p>
                    </div>
                  </div>
                )}

                {(preview.duplicateRows > 0 || preview.conflictRows > 0) && (
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Registros Duplicados/Conflitos Detectados</p>
                      <p className="text-sm text-muted-foreground">
                        {preview.duplicateRows > 0 && `${preview.duplicateRows} registro(s) com CPF já cadastrado. `}
                        {preview.conflictRows > 0 && `${preview.conflictRows} registro(s) com e-mail em conflito. `}
                        Para cada registro, escolha se deseja <strong>Atualizar</strong> o cadastro existente ou <strong>Ignorar</strong>.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <Button variant="outline" onClick={() => setCurrentStep('upload')}>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Voltar
                  </Button>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {getSelectedCount()} de {preview.validRows} registro(s) selecionado(s)
                    </span>
                    <Button 
                      onClick={handleImport}
                      disabled={!hasPermission || roleLoading}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Processar {getSelectedCount()} Registro(s)
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 'importing' && (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
                    <h3 className="text-lg font-semibold">Importando dados...</h3>
                    <p className="text-muted-foreground">Por favor, aguarde</p>
                    <div className="max-w-md mx-auto">
                      <Progress value={importProgress} className="h-2" />
                      <p className="text-sm text-muted-foreground mt-2">{importProgress}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 'result' && importResult && (
              <ImportResultReport 
                result={importResult}
                onClose={() => window.history.back()}
                onNewImport={handleNewImport}
              />
            )}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
