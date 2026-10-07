-- TripQuote — bucket de Storage para o .pptx gerado (M7).
-- Bucket privado único, path fixo por orçamento: `{quote_id}/orcamento.pptx`.
-- Diferente dos buckets de attachment (M5), aqui a regeneração sobrescreve
-- o mesmo path (upload com `upsert: true` no código da aplicação) — por
-- isso este bucket também precisa de policy de UPDATE, que os buckets de
-- attachment não têm (eles nunca reaproveitam um path existente).
-- Reusa `owns_quote_storage_object(name)`, já existente desde a migration
-- de Storage do M5 — resolve o dono pelo primeiro segmento do path
-- (`quote_id`), que aqui também é o padrão usado.

insert into storage.buckets (id, name, public)
values ('generated-pptx', 'generated-pptx', false)
on conflict (id) do nothing;

create policy generated_pptx_select_via_quote
  on storage.objects for select
  using (bucket_id = 'generated-pptx' and public.owns_quote_storage_object(name));

create policy generated_pptx_insert_via_quote
  on storage.objects for insert
  with check (bucket_id = 'generated-pptx' and public.owns_quote_storage_object(name));

create policy generated_pptx_update_via_quote
  on storage.objects for update
  using (bucket_id = 'generated-pptx' and public.owns_quote_storage_object(name));
