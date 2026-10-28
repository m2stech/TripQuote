-- TripQuote — endurecimento de RLS em `profiles` (aplicada diretamente no
-- banco em 2026-10-20; arquivo reconstruído aqui a partir do schema real
-- para manter o histórico de migrations do CLI consistente — ver policies
-- vigentes em `pg_policies` no momento da reconstrução).
--
-- A policy original `profiles_update_own_or_admin` (migration
-- `20261006000000_init_schema.sql`) permitia que o próprio usuário
-- atualizasse qualquer coluna do seu perfil, incluindo `role` e `active` —
-- um consultor podia se auto-promover a admin via update direto na tabela.
-- Substituída por duas policies: admin continua podendo atualizar qualquer
-- perfil (incluindo papel/status de terceiros); o próprio usuário só pode
-- atualizar seu perfil mantendo `role`/`active` inalterados.

drop policy if exists profiles_update_own_or_admin on public.profiles;

create policy profiles_update_admin
  on public.profiles for update
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy profiles_update_own
  on public.profiles for update
  using (id = auth.uid() and public.current_user_is_active())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and active = (select p.active from public.profiles p where p.id = auth.uid())
  );
