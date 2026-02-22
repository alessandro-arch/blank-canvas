
-- Table: work_plans
CREATE TABLE public.work_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  scholar_user_id uuid NOT NULL,
  uploaded_by uuid NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  file_name text NOT NULL,
  file_size bigint,
  pdf_path text NOT NULL,
  checksum_sha256 text NOT NULL,
  extracted_json jsonb,
  extracted_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_work_plans_org_project ON public.work_plans(organization_id, project_id);
CREATE INDEX idx_work_plans_scholar ON public.work_plans(scholar_user_id);

-- Partial unique: only 1 active per (project_id, scholar_user_id)
CREATE UNIQUE INDEX idx_work_plans_active_unique ON public.work_plans(project_id, scholar_user_id) WHERE status = 'active';

-- Trigger for updated_at
CREATE TRIGGER set_work_plans_updated_at
  BEFORE UPDATE ON public.work_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.work_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies (PERMISSIVE)
CREATE POLICY "work_plans_select_own"
  ON public.work_plans FOR SELECT
  TO authenticated
  USING (scholar_user_id = auth.uid());

CREATE POLICY "work_plans_select_admin"
  ON public.work_plans FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "work_plans_select_manager_org"
  ON public.work_plans FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'manager'::app_role)
    AND organization_id IN (SELECT get_user_organizations())
  );

CREATE POLICY "work_plans_insert_manager_admin"
  ON public.work_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'manager'::app_role)
      AND organization_id IN (SELECT get_user_organizations())
    )
  );

CREATE POLICY "work_plans_update_manager_admin"
  ON public.work_plans FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'manager'::app_role)
      AND organization_id IN (SELECT get_user_organizations())
    )
  );

CREATE POLICY "work_plans_delete_admin"
  ON public.work_plans FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('workplans', 'workplans', false);

-- Storage RLS policies
CREATE POLICY "workplans_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'workplans'
    AND EXISTS (
      SELECT 1 FROM public.work_plans wp
      WHERE wp.pdf_path = name AND wp.scholar_user_id = auth.uid()
    )
  );

CREATE POLICY "workplans_select_manager"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'workplans'
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR (
        has_role(auth.uid(), 'manager'::app_role)
        AND EXISTS (
          SELECT 1 FROM public.work_plans wp
          WHERE wp.pdf_path = name
          AND wp.organization_id IN (SELECT get_user_organizations())
        )
      )
    )
  );

CREATE POLICY "workplans_insert_manager"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'workplans'
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  );

CREATE POLICY "workplans_update_manager"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'workplans'
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  );

CREATE POLICY "workplans_delete_manager"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'workplans'
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  );
