
-- Add organization_id column
ALTER TABLE public.institutional_documents
ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

-- Drop existing policies
DROP POLICY IF EXISTS "All authenticated users can view institutional documents" ON public.institutional_documents;
DROP POLICY IF EXISTS "Managers can insert institutional documents" ON public.institutional_documents;
DROP POLICY IF EXISTS "Managers can update institutional documents" ON public.institutional_documents;
DROP POLICY IF EXISTS "Admins can delete institutional documents" ON public.institutional_documents;

-- Recreate with org-scoping
CREATE POLICY "institutional_docs_select_org_scoped"
ON public.institutional_documents FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    organization_id IS NULL
    OR organization_id IN (SELECT get_user_organizations())
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "institutional_docs_insert_org_scoped"
ON public.institutional_documents FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'manager'::app_role)
    AND organization_id IN (SELECT get_user_organizations())
  )
);

CREATE POLICY "institutional_docs_update_org_scoped"
ON public.institutional_documents FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'manager'::app_role)
    AND organization_id IN (SELECT get_user_organizations())
  )
);

CREATE POLICY "institutional_docs_delete_admin"
ON public.institutional_documents FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
