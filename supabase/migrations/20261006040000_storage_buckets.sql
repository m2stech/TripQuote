-- TripQuote — buckets de Storage para anexos de orçamento (M5).
-- Dois buckets privados: logos de agência e imagens de voo, enviados via
-- upload no formulário. Acesso restrito ao dono do orçamento (ou admin),
-- seguindo a mesma regra de `quote_attachments` (ver migration M4).
-- Path esperado dos objetos: `{quote_id}/{attachment_id}-{file_name}`.

insert into storage.buckets (id, name, public)
values
  ('agency-logos', 'agency-logos', false),
  ('flight-images', 'flight-images', false)
on conflict (id) do nothing;

-- Helper: dono ativo (ou admin) do orçamento referenciado pelo primeiro
-- segmento do path do objeto (`quote_id`). Replica a regra de
-- `quotes_select_own_or_admin` (ver `..._enforce_active_profile.sql`): um
-- consultor desativado perde acesso aos próprios anexos, mesmo com sessão
-- válida. Path fora do padrão `{quote_id}/...` (sem "/") faz
-- `storage.foldername` retornar `NULL` no primeiro segmento, e a comparação
-- com `q.id::text` é falsy — negado por padrão (fail-closed), sem necessidade
-- de tratamento extra.
create function public.owns_quote_storage_object(object_name text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.quotes q
    where q.id::text = (storage.foldername(object_name))[1]
      and (
        (q.created_by = auth.uid() and public.current_user_is_active())
        or public.current_user_role() = 'admin'
      )
  );
$$;

-- Não há policy de UPDATE: o código da aplicação nunca faz upsert de um
-- path existente (o `attachment_id` no path é sempre gerado via
-- `crypto.randomUUID()`, nunca reaproveitado).

create policy agency_logos_select_via_quote
  on storage.objects for select
  using (bucket_id = 'agency-logos' and public.owns_quote_storage_object(name));

create policy agency_logos_insert_via_quote
  on storage.objects for insert
  with check (bucket_id = 'agency-logos' and public.owns_quote_storage_object(name));

create policy agency_logos_delete_via_quote
  on storage.objects for delete
  using (bucket_id = 'agency-logos' and public.owns_quote_storage_object(name));

create policy flight_images_select_via_quote
  on storage.objects for select
  using (bucket_id = 'flight-images' and public.owns_quote_storage_object(name));

create policy flight_images_insert_via_quote
  on storage.objects for insert
  with check (bucket_id = 'flight-images' and public.owns_quote_storage_object(name));

create policy flight_images_delete_via_quote
  on storage.objects for delete
  using (bucket_id = 'flight-images' and public.owns_quote_storage_object(name));
