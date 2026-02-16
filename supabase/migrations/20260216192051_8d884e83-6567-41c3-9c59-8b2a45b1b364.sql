
-- Create storage bucket for news images
INSERT INTO storage.buckets (id, name, public) VALUES ('news-images', 'news-images', true);

-- Allow authenticated users to upload news images (managers/admins)
CREATE POLICY "news_images_insert_manager" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'news-images'
  AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Allow public read access to news images
CREATE POLICY "news_images_select_public" ON storage.objects
FOR SELECT USING (bucket_id = 'news-images');

-- Allow managers/admins to delete their news images
CREATE POLICY "news_images_delete_manager" ON storage.objects
FOR DELETE USING (
  bucket_id = 'news-images'
  AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);
