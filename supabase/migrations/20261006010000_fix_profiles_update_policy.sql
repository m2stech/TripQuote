-- Corrige escalação de privilégio: a policy profiles_update_own_or_admin
-- não tinha `with check`, permitindo que o próprio usuário alterasse seu
-- `role`/`active` via UPDATE (ex.: promover-se a admin). Separa em duas
-- policies: o próprio usuário só edita campos não sensíveis; admin mantém
-- controle total.

drop policy profiles_update_own_or_admin on public.profiles;

create policy profiles_update_own
  on public.profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and active = (select p.active from public.profiles p where p.id = auth.uid())
  );

create policy profiles_update_admin
  on public.profiles for update
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
