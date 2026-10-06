-- Reforça no banco que usuários desativados (`profiles.active = false`)
-- perdem acesso, mesmo com uma sessão válida (defesa em profundidade: não
-- depende só do middleware, que pode ser contornado por chamadas diretas
-- à API Supabase).

create function public.current_user_is_active()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select active from public.profiles where id = auth.uid()), false);
$$;

-- profiles: leitura/escrita do próprio perfil exige estar ativo (admin
-- sempre mantém acesso, inclusive para reativar outros usuários).

drop policy profiles_select_own_or_admin on public.profiles;

create policy profiles_select_own_or_admin
  on public.profiles for select
  using (
    (id = auth.uid() and public.current_user_is_active())
    or public.current_user_role() = 'admin'
  );

drop policy profiles_update_own on public.profiles;

create policy profiles_update_own
  on public.profiles for update
  using (id = auth.uid() and public.current_user_is_active())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and active = (select p.active from public.profiles p where p.id = auth.uid())
  );

-- quotes: consultor desativado perde acesso aos próprios registros.

drop policy quotes_select_own_or_admin on public.quotes;

create policy quotes_select_own_or_admin
  on public.quotes for select
  using (
    (created_by = auth.uid() and public.current_user_is_active())
    or public.current_user_role() = 'admin'
  );

drop policy quotes_insert_own on public.quotes;

create policy quotes_insert_own
  on public.quotes for insert
  with check (created_by = auth.uid() and public.current_user_is_active());

drop policy quotes_update_own_or_admin on public.quotes;

create policy quotes_update_own_or_admin
  on public.quotes for update
  using (
    (created_by = auth.uid() and public.current_user_is_active())
    or public.current_user_role() = 'admin'
  );

drop policy quotes_delete_own_or_admin on public.quotes;

create policy quotes_delete_own_or_admin
  on public.quotes for delete
  using (
    (created_by = auth.uid() and public.current_user_is_active())
    or public.current_user_role() = 'admin'
  );
