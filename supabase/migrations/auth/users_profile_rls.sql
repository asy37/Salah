-- Row Level Security for users_profile (login ve profil erişimi için gerekli)

alter table public.users_profile enable row level security;

-- Kullanıcı sadece kendi profilini okuyabilir (auth.uid() = id)
create policy "Users can view own users_profile"
  on public.users_profile
  for select
  using (auth.uid() = id);

-- Kullanıcı sadece kendi profilini güncelleyebilir
create policy "Users can update own users_profile"
  on public.users_profile
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- INSERT: handle_new_user (SECURITY DEFINER) tarafından yapılıyor; ek policy yok.
-- DELETE: auth.users ON DELETE CASCADE ile; uygulama users_profile DELETE yapmıyor.
