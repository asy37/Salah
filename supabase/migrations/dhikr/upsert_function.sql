-- Function: Atomic upsert with conflict resolution (last-write-wins)
-- Only updates if incoming updated_at is newer than existing updated_at
-- This ensures atomic conflict resolution without race conditions

create or replace function public.upsert_dhikr_with_conflict_resolution(
  p_id uuid,
  p_user_id uuid,
  p_slug text,
  p_label text,
  p_target_count integer,
  p_current_count integer,
  p_status text,
  p_started_at bigint,
  p_completed_at bigint,
  p_updated_at bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Verify user is authenticated and matches
  if auth.uid() is null or auth.uid() != p_user_id then
    raise exception 'Unauthorized: user_id mismatch';
  end if;

  -- Atomic upsert with conflict resolution
  insert into public.dhikr_list (
    id,
    user_id,
    slug,
    label,
    target_count,
    current_count,
    status,
    started_at,
    completed_at,
    updated_at
  )
  values (
    p_id,
    p_user_id,
    p_slug,
    p_label,
    p_target_count,
    p_current_count,
    p_status,
    p_started_at,
    p_completed_at,
    p_updated_at
  )
  on conflict (id) do update
  set
    slug = excluded.slug,
    label = excluded.label,
    target_count = excluded.target_count,
    current_count = excluded.current_count,
    status = excluded.status,
    started_at = excluded.started_at,
    completed_at = excluded.completed_at,
    updated_at = excluded.updated_at
  where dhikr_list.updated_at < excluded.updated_at; -- Only update if incoming is newer
end;
$$;
