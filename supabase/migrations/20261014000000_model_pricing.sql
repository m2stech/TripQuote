-- TripQuote — tabela de preços por modelo de IA (M9).
-- Até aqui o preço por milhão de tokens era uma constante hardcoded em
-- `src/features/ai/pricing/estimate-cost.ts` (`MODEL_PRICING`). Os preços dos
-- provedores de IA mudam com frequência; esta migration move essa tabela
-- para o banco, editável pelo admin sem deploy, mantendo a mesma unidade
-- (USD por 1 milhão de tokens, separado em entrada/saída).

create table public.model_pricing (
  model text primary key,
  input_per_million_usd numeric(10, 4) not null,
  output_per_million_usd numeric(10, 4) not null,
  updated_by uuid not null references public.profiles (id),
  updated_at timestamptz not null default now()
);

comment on table public.model_pricing is
  'Preço por 1M de tokens (entrada/saída) por modelo de IA, editável pelo admin — fonte usada pelo cálculo de custo estimado em `generations`.';

create trigger model_pricing_set_updated_at
  before update on public.model_pricing
  for each row execute function public.set_updated_at();

alter table public.model_pricing enable row level security;

-- Leitura: qualquer autenticado ativo (o custo estimado de uma geração é
-- exibido ao consultor no detalhe do orçamento). Escrita: apenas admin —
-- mesmo padrão de `prompt_versions`/`branding_settings`.

create policy model_pricing_select_authenticated
  on public.model_pricing for select
  using (auth.uid() is not null and public.current_user_is_active());

create policy model_pricing_admin_write
  on public.model_pricing for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Seed: valores atuais de `MODEL_PRICING` (estimate-cost.ts), associados ao
-- primeiro admin encontrado (mesmo padrão de `..._seed_prompt_version.sql`).
-- Se ainda não houver admin (banco novo), a aplicação deve tratar um modelo
-- sem linha correspondente como custo zero (mesmo comportamento anterior).

do $$
declare
  first_admin_id uuid;
begin
  select id into first_admin_id
  from public.profiles
  where role = 'admin'
  order by created_at asc
  limit 1;

  if first_admin_id is not null then
    insert into public.model_pricing (model, input_per_million_usd, output_per_million_usd, updated_by)
    values
      ('gpt-4.1', 2.0, 8.0, first_admin_id),
      ('gpt-4.1-mini', 0.4, 1.6, first_admin_id),
      ('gpt-4o', 2.5, 10.0, first_admin_id);
  end if;
end $$;
