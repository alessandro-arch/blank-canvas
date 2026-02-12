 import { useState, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { toast } from "sonner";
 
 interface UseAvatarUploadReturn {
   avatarUrl: string | null;
   uploading: boolean;
   uploadAvatar: (file: File) => Promise<string | null>;
   deleteAvatar: () => Promise<boolean>;
   refreshAvatar: () => Promise<void>;
 }
 
 export function useAvatarUpload(): UseAvatarUploadReturn {
   const { user } = useAuth();
   const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
   const [uploading, setUploading] = useState(false);
 
   const refreshAvatar = useCallback(async () => {
     if (!user) {
       setAvatarUrl(null);
       return;
     }
 
     try {
       const { data: profile } = await supabase
         .from("profiles")
         .select("avatar_url")
         .eq("user_id", user.id)
         .maybeSingle();
 
       if (profile?.avatar_url) {
         // Get public URL for the avatar
         const { data } = supabase.storage
           .from("avatars")
           .getPublicUrl(profile.avatar_url);
         
         setAvatarUrl(data?.publicUrl || null);
       } else {
         setAvatarUrl(null);
       }
     } catch (err) {
       console.error("Error fetching avatar:", err);
     }
   }, [user]);
 
   const uploadAvatar = async (file: File): Promise<string | null> => {
     if (!user) {
       toast.error("Usuário não autenticado");
       return null;
     }
 
     // Validate file type
     if (!file.type.startsWith("image/")) {
       toast.error("Apenas imagens são permitidas");
       return null;
     }
 
     // Validate file size (max 2MB)
     if (file.size > 2 * 1024 * 1024) {
       toast.error("A imagem deve ter no máximo 2MB");
       return null;
     }
 
     setUploading(true);
 
     try {
       // Generate unique filename
       const fileExt = file.name.split(".").pop();
       const fileName = `${user.id}/avatar.${fileExt}`;
 
       // Upload to storage (upsert to replace existing)
       const { error: uploadError } = await supabase.storage
         .from("avatars")
         .upload(fileName, file, {
           cacheControl: "3600",
           upsert: true,
         });
 
       if (uploadError) throw uploadError;
 
       // Update profile with avatar path
       const { error: updateError } = await supabase
         .from("profiles")
         .update({ avatar_url: fileName })
         .eq("user_id", user.id);
 
       if (updateError) throw updateError;
 
       // Get public URL
       const { data } = supabase.storage
         .from("avatars")
         .getPublicUrl(fileName);
 
       const publicUrl = data?.publicUrl || null;
       setAvatarUrl(publicUrl);
 
       toast.success("Foto atualizada com sucesso!");
       return publicUrl;
     } catch (error: any) {
       console.error("Error uploading avatar:", error);
       toast.error("Erro ao enviar foto. Tente novamente.");
       return null;
     } finally {
       setUploading(false);
     }
   };
 
   const deleteAvatar = async (): Promise<boolean> => {
     if (!user) return false;
 
     setUploading(true);
 
     try {
       // Get current avatar path
       const { data: profile } = await supabase
         .from("profiles")
         .select("avatar_url")
         .eq("user_id", user.id)
         .maybeSingle();
 
       if (profile?.avatar_url) {
         // Delete from storage
         await supabase.storage
           .from("avatars")
           .remove([profile.avatar_url]);
       }
 
       // Clear avatar_url in profile
       await supabase
         .from("profiles")
         .update({ avatar_url: null })
         .eq("user_id", user.id);
 
       setAvatarUrl(null);
       toast.success("Foto removida");
       return true;
     } catch (error) {
       console.error("Error deleting avatar:", error);
       toast.error("Erro ao remover foto");
       return false;
     } finally {
       setUploading(false);
     }
   };
 
   return {
     avatarUrl,
     uploading,
     uploadAvatar,
     deleteAvatar,
     refreshAvatar,
   };
 }