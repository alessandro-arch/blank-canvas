import { useState } from "react";
import { Pencil, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateInstitutionalDocument, InstitutionalDocument, DocumentType } from "@/hooks/useInstitutionalDocuments";

interface EditDocumentDialogProps {
  document: InstitutionalDocument;
}

export function EditDocumentDialog({ document }: EditDocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(document.title);
  const [description, setDescription] = useState(document.description || "");
  const [type, setType] = useState<DocumentType>(document.type);
  const [newFile, setNewFile] = useState<File | null>(null);

  const updateMutation = useUpdateInstitutionalDocument();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        return;
      }
      setNewFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;

    updateMutation.mutate(
      {
        document,
        title: title.trim(),
        description: description.trim(),
        type,
        newFile: newFile || undefined,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setNewFile(null);
        },
      }
    );
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      // Reset to current document values when opening
      setTitle(document.title);
      setDescription(document.description || "");
      setType(document.type);
      setNewFile(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground hover:text-primary flex-shrink-0"
        >
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar Documento</DialogTitle>
            <DialogDescription>
              Altere as informações do documento ou substitua o arquivo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Título *</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Manual do Bolsista 2026"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve descrição do documento..."
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-type">Tipo de Documento *</Label>
              <Select value={type} onValueChange={(value: DocumentType) => setType(value)}>
                <SelectTrigger id="edit-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="template">Template</SelectItem>
                  <SelectItem value="termo">Termo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Arquivo</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm">
                  <span className="text-muted-foreground">Atual:</span>
                  <span className="font-medium truncate">{document.file_name}</span>
                </div>
                
                {newFile ? (
                  <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg text-sm">
                    <span className="text-primary">Novo:</span>
                    <span className="font-medium truncate flex-1">{newFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setNewFile(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      id="edit-file"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => window.document.getElementById("edit-file")?.click()}
                    >
                      <Upload className="w-4 h-4" />
                      Substituir arquivo
                    </Button>
                    <span className="text-xs text-muted-foreground">PDF, máx. 10MB</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending || !title.trim()}>
              {updateMutation.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
