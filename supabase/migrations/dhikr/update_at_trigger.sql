-- Auto-update updated_at timestamp (if using timestamptz)
-- Note: We're using bigint (milliseconds) for updated_at, so this trigger is optional
-- Keeping it for consistency with other tables

create or replace function public.update_dhikr_updated_at()
returns trigger
language plpgsql
as $$
begin
  -- updated_at is stored as bigint (milliseconds) in our case
  -- This trigger would update timestamptz, but we handle it client-side
  -- Keeping function for potential future use
  return new;
end;
$$;

-- Trigger (optional, since we use bigint)
-- create trigger update_dhikr_updated_at_trigger
--   before update on public.dhikr_list
--   for each row
--   execute function public.update_dhikr_updated_at();
