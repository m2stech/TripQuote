-- TripQuote — produto Cruzeiro (M11).
-- Adiciona `product_type` a `quotes` e `prompt_versions`: cruzeiro passa a
-- ser um segundo tipo de orçamento, reaproveitando toda a infraestrutura
-- existente (auth, listagem, status, rate limit, generations, audit_log) em
-- vez de duplicá-la em tabelas/produtos separados (ver docs/PLAN.md M11).

create type public.product_type as enum ('terrestre', 'cruzeiro');

-- attachment_kind ----------------------------------------------------------
-- Novos tipos de anexo do formulário de cruzeiro: print do roteiro (extraído
-- por visão, mesmo padrão da imagem de voo) e foto de navio/cabine (galeria
-- da seção "Navio e experiência a bordo" / "Cabines e tarifas").

alter type public.attachment_kind add value 'cruise_itinerary_image';
alter type public.attachment_kind add value 'cruise_photo';

-- quotes ----------------------------------------------------------------

alter table public.quotes
  add column product_type public.product_type not null default 'terrestre';

create index quotes_product_type_idx on public.quotes (product_type);

-- prompt_versions ---------------------------------------------------------
-- A versão ativa passa a ser única por tipo de produto, não globalmente —
-- cruzeiro começa sua própria linha de versões (v1) sem tocar no histórico
-- v1-v6 do terrestre.

alter table public.prompt_versions
  add column product_type public.product_type not null default 'terrestre';

drop index public.prompt_versions_single_active;
drop index public.prompt_versions_version_key;

create unique index prompt_versions_single_active
  on public.prompt_versions (product_type)
  where is_active;

create unique index prompt_versions_version_key
  on public.prompt_versions (product_type, version);

-- cruise-photos bucket ----------------------------------------------------
-- Fotos de navio, cabine e porto, enviadas no formulário de cruzeiro. Mesmo
-- padrão RLS fail-closed dos demais buckets (agency-logos, flight-images).

insert into storage.buckets (id, name, public)
values ('cruise-photos', 'cruise-photos', false)
on conflict (id) do nothing;

create policy cruise_photos_select_via_quote
  on storage.objects for select
  using (bucket_id = 'cruise-photos' and public.owns_quote_storage_object(name));

create policy cruise_photos_insert_via_quote
  on storage.objects for insert
  with check (bucket_id = 'cruise-photos' and public.owns_quote_storage_object(name));

create policy cruise_photos_delete_via_quote
  on storage.objects for delete
  using (bucket_id = 'cruise-photos' and public.owns_quote_storage_object(name));
