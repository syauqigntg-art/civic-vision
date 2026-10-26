BEGIN;

-- The composite submission->version FK is only fully enforced when both
-- referencing columns are NOT NULL. The original backfill guard checked this
-- already for existing rows; preserve that invariant for all future writes.
DO $submission_project_not_null_guard$
BEGIN
  IF EXISTS (SELECT 1 FROM public.submissions WHERE project_id IS NULL) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23502',
      MESSAGE = 'submission_project_id_backfill_failed',
      DETAIL = 'Cannot enforce submissions.project_id NOT NULL while unmapped submissions remain.';
  END IF;
END;
$submission_project_not_null_guard$;

ALTER TABLE public.submissions
  ALTER COLUMN project_id SET NOT NULL;

-- Replace the draft saver so updated_at changes with the actual mutation time,
-- rather than the transaction-start timestamp. This makes a validation
-- timestamp reliable for compare-and-swap publication checks.
CREATE OR REPLACE FUNCTION public.admin_save_project_version_draft(p_project_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_project_active boolean;
  v_content jsonb;
  v_version_id uuid;
  v_active_version_id uuid;
  v_next_number integer;
  v_existing_content jsonb;
BEGIN
  IF NOT COALESCE((SELECT private.is_admin()), false) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'admin_required';
  END IF;

  SELECT p.is_active, p.active_version_id
    INTO v_project_active, v_active_version_id
  FROM public.projects AS p
  WHERE p.id = p_project_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'project_not_found';
  END IF;
  IF v_project_active IS FALSE THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'project_archived';
  END IF;

  v_content := private.build_project_version_content(p_project_id);
  IF v_content IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'project_content_not_found';
  END IF;

  SELECT pv.id, pv.content INTO v_version_id, v_existing_content
  FROM public.project_versions AS pv
  WHERE pv.project_id = p_project_id
    AND pv.status = 'draft'
  FOR UPDATE;

  IF v_version_id IS NOT NULL THEN
    -- Avoid changing updated_at for an identical snapshot. When the content
    -- actually changes, record wall-clock mutation time for stale-validation CAS.
    IF v_existing_content IS DISTINCT FROM v_content THEN
      UPDATE public.project_versions
      SET content = v_content,
          updated_at = clock_timestamp()
      WHERE id = v_version_id
        AND project_id = p_project_id
        AND status = 'draft';
    END IF;
    RETURN v_version_id;
  END IF;

  SELECT COALESCE(max(pv.version_number), 0) + 1
    INTO v_next_number
  FROM public.project_versions AS pv
  WHERE pv.project_id = p_project_id;

  INSERT INTO public.project_versions (
    project_id, version_number, status, content,
    based_on_version_id, created_by
  )
  VALUES (
    p_project_id, v_next_number, 'draft', v_content,
    v_active_version_id, (SELECT auth.uid())
  )
  RETURNING id INTO v_version_id;

  RETURN v_version_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_save_project_version_draft(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_project_version_draft(uuid) TO authenticated;

-- Publication receives the exact draft updated_at observed during validation.
-- Locking the project and draft rows and comparing this value closes the race
-- between the UI's stale-draft check and the publish RPC.
DROP FUNCTION public.admin_publish_project_version(uuid, uuid);

CREATE FUNCTION public.admin_publish_project_version(
  p_project_id uuid,
  p_version_id uuid,
  p_expected_updated_at timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_project_active boolean;
  v_content jsonb;
  v_status text;
  v_updated_at timestamptz;
  v_validation jsonb;
BEGIN
  IF NOT COALESCE((SELECT private.is_admin()), false) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'admin_required';
  END IF;

  SELECT p.is_active INTO v_project_active
  FROM public.projects AS p
  WHERE p.id = p_project_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'project_not_found';
  END IF;
  IF v_project_active IS FALSE THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'project_archived';
  END IF;

  SELECT pv.content, pv.status, pv.updated_at
    INTO v_content, v_status, v_updated_at
  FROM public.project_versions AS pv
  WHERE pv.id = p_version_id
    AND pv.project_id = p_project_id
  FOR UPDATE;
  IF NOT FOUND OR v_status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'project_version_draft_not_found';
  END IF;

  IF v_updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION USING
      ERRCODE = '40001',
      MESSAGE = 'project_version_validation_stale',
      DETAIL = 'The draft changed after validation. Refresh the snapshot, preview, and validate again.';
  END IF;

  v_validation := private.validate_project_version_content(v_content);
  IF COALESCE((v_validation->>'valid')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'project_version_validation_failed',
      DETAIL = v_validation::text;
  END IF;

  UPDATE public.project_versions
  SET status = 'published',
      published_at = now(),
      published_by = (SELECT auth.uid()),
      updated_at = clock_timestamp()
  WHERE id = p_version_id
    AND project_id = p_project_id
    AND status = 'draft'
    AND updated_at = p_expected_updated_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'project_version_publish_conflict';
  END IF;

  UPDATE public.projects
  SET active_version_id = p_version_id,
      updated_at = now()
  WHERE id = p_project_id;

  RETURN p_version_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_publish_project_version(uuid, uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_publish_project_version(uuid, uuid, timestamptz) TO authenticated;

-- Update the pointer guard's owner lookup to the new CAS-protected RPC signature.
CREATE OR REPLACE FUNCTION private.guard_active_project_version_pointer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_publish_owner name;
BEGIN
  IF NEW.active_version_id IS NOT DISTINCT FROM OLD.active_version_id THEN
    RETURN NEW;
  END IF;

  SELECT pg_catalog.pg_get_userbyid(p.proowner)
    INTO v_publish_owner
  FROM pg_catalog.pg_proc AS p
  WHERE p.oid = 'public.admin_publish_project_version(uuid,uuid,timestamptz)'::regprocedure;

  IF v_publish_owner IS NULL OR current_user IS DISTINCT FROM v_publish_owner THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'active_project_version_must_use_publish_rpc';
  END IF;

  IF NEW.active_version_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.project_versions AS pv
    WHERE pv.id = NEW.active_version_id
      AND pv.project_id = NEW.id
      AND pv.status = 'published'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'active_project_version_must_be_published_for_project';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.guard_active_project_version_pointer() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.guard_active_project_version_pointer() TO authenticated, service_role;

COMMIT;
