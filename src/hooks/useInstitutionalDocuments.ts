import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DocumentType = "manual" | "template" | "termo";

export interface InstitutionalDocument {
  id: string;
  title: string;
  description: string | null;
  type: DocumentType;
  file_url: string;
  file_name: string;
  file_size: number | null;
  uploaded_by: string;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useInstitutionalDocuments() {
  return useQuery({
    queryKey: ["institutional-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institutional_documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as InstitutionalDocument[];
    },
  });
}

interface UploadDocumentParams {
  file: File;
  title: string;
  description: string;
  type: DocumentType;
  organizationId?: string | null;
}

export function useUploadInstitutionalDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, title, description, type, organizationId }: UploadDocumentParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Generate unique file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${type}/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("institutional-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("institutional-documents")
        .getPublicUrl(filePath);

      // Insert document record
      const { data, error } = await supabase
        .from("institutional_documents")
        .insert({
          title,
          description: description || null,
          type,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
          uploaded_by: user.id,
          organization_id: organizationId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["institutional-documents"] });
      toast.success("Documento adicionado com sucesso!");
    },
    onError: (error) => {
      console.error("Error uploading document:", error);
      toast.error("Erro ao adicionar documento");
    },
  });
}

export function useDeleteInstitutionalDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (document: InstitutionalDocument) => {
      // Extract file path from URL
      const urlParts = document.file_url.split("/institutional-documents/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage
          .from("institutional-documents")
          .remove([filePath]);
      }

      const { error } = await supabase
        .from("institutional_documents")
        .delete()
        .eq("id", document.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["institutional-documents"] });
      toast.success("Documento removido com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting document:", error);
      toast.error("Erro ao remover documento");
    },
  });
}

interface UpdateDocumentParams {
  document: InstitutionalDocument;
  title: string;
  description: string;
  type: DocumentType;
  newFile?: File;
}

export function useUpdateInstitutionalDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ document, title, description, type, newFile }: UpdateDocumentParams) => {
      let fileUrl = document.file_url;
      let fileName = document.file_name;
      let fileSize = document.file_size;

      // If a new file is provided, upload it and delete the old one
      if (newFile) {
        // Generate unique file path for new file
        const fileExt = newFile.name.split(".").pop();
        const newFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${type}/${newFileName}`;

        // Upload new file
        const { error: uploadError } = await supabase.storage
          .from("institutional-documents")
          .upload(filePath, newFile);

        if (uploadError) throw uploadError;

        // Get public URL for new file
        const { data: urlData } = supabase.storage
          .from("institutional-documents")
          .getPublicUrl(filePath);

        // Delete old file
        const oldUrlParts = document.file_url.split("/institutional-documents/");
        if (oldUrlParts.length > 1) {
          const oldFilePath = oldUrlParts[1];
          await supabase.storage
            .from("institutional-documents")
            .remove([oldFilePath]);
        }

        fileUrl = urlData.publicUrl;
        fileName = newFile.name;
        fileSize = newFile.size;
      }

      // Update document record
      const { data, error } = await supabase
        .from("institutional_documents")
        .update({
          title,
          description: description || null,
          type,
          file_url: fileUrl,
          file_name: fileName,
          file_size: fileSize,
          updated_at: new Date().toISOString(),
        })
        .eq("id", document.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["institutional-documents"] });
      toast.success("Documento atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating document:", error);
      toast.error("Erro ao atualizar documento");
    },
  });
}
