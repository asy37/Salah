-- Function: Calculate prayer streak for a given user (for service role / Edge Functions)
-- Same logic as get_prayer_streak but accepts user_id parameter
-- Used by send-prayer-streak Edge Function

create or replace function public.get_prayer_streak_for_user(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_streak int := 0;
  v_check_date date := current_date;
  v_log_record public.prayer_logs%rowtype;
  v_all_prayed boolean;
begin
  if p_user_id is null then
    return 0;
  end if;

  loop
    if v_check_date < current_date - interval '365 days' then
      exit;
    end if;

    begin
      select * into strict v_log_record
      from public.prayer_logs
      where user_id = p_user_id and date = v_check_date;

      v_all_prayed := (
        v_log_record.fajr = true and
        v_log_record.dhuhr = true and
        v_log_record.asr = true and
        v_log_record.maghrib = true and
        v_log_record.isha = true
      );

      exit when not v_all_prayed;

      v_streak := v_streak + 1;
      v_check_date := v_check_date - interval '1 day';

    exception
      when no_data_found then
        exit;
      when others then
        raise notice 'Skipping date % due to error: %', v_check_date, sqlerrm;
        v_check_date := v_check_date - interval '1 day';
    end;
  end loop;

  return v_streak;
end;
$$;
