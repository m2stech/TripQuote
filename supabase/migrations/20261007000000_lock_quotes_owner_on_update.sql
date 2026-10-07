-- Defesa em profundidade: a policy de UPDATE em `quotes` só tinha `using`
-- (quem pode visar a linha), não `with check` (o que a linha pode se tornar
-- após o UPDATE). Hoje o código da aplicação nunca envia `created_by` num
-- update/upsert (ver `formToColumns` em `supabase-quote-repository.ts`), mas
-- sem `with check` a policy, isolada, permitiria a um consultor dono da
-- linha reatribuir `created_by` via chamada direta à API Supabase (anon key)
-- fora do código da aplicação. Mesmo padrão já aplicado a `profiles_update_own`
-- em 20261006010000_fix_profiles_update_policy.sql.

drop policy quotes_update_own_or_admin on public.quotes;

create policy quotes_update_own_or_admin
  on public.quotes for update
  using (
    (created_by = auth.uid() and public.current_user_is_active())
    or public.current_user_role() = 'admin'
  )
  with check (
    created_by = (select q.created_by from public.quotes q where q.id = quotes.id)
    or public.current_user_role() = 'admin'
  );
