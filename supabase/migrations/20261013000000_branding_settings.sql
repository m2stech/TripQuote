-- TripQuote — identidade visual e configurações da empresa (M8).
-- Até aqui a logo institucional era uma URL fixa hardcoded no código
-- (`INSTITUTIONAL_LOGO_URL`); esta migration cria a tabela que passa a
-- guardar esse asset (e o nome institucional) como dado gerenciável pelo
-- admin, substituindo a constante. Linha única (singleton), mesma ideia de
-- `prompt_versions_single_active`: sempre no máximo uma config ativa.

create table public.branding_settings (
  id uuid primary key default gen_random_uuid(),
  company_name text not null default 'SNOW Operadora',
  institutional_footer text not null default
    'Produto desenvolvido e criado com a qualidade e segurança SNOW Operadora.',
  institutional_logo_storage_path text,
  updated_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.branding_settings is
  'Configuração institucional única (nome, rodapé e logo institucional) gerenciada pelo admin.';

-- Trava a tabela em uma única linha: todo insert/update deve alvejar esse id
-- fixo, evitando múltiplas configs "ativas" como já é feito para endpoints
-- singleton em outras partes do app.
create unique index branding_settings_singleton on public.branding_settings ((true));

create trigger branding_settings_set_updated_at
  before update on public.branding_settings
  for each row execute function public.set_updated_at();

alter table public.branding_settings enable row level security;

-- Leitura: qualquer usuário autenticado e ativo (a logo institucional é
-- usada no formulário do consultor, seção 08 — ver `quote-form.schema.ts`).
-- `current_user_is_active()` replica a mesma regra já aplicada ao resto do
-- schema (`..._enforce_active_profile.sql`): um usuário desativado perde
-- acesso de imediato, mesmo com JWT ainda válido. Escrita: apenas admin.

create policy branding_settings_select_authenticated
  on public.branding_settings for select
  using (auth.uid() is not null and public.current_user_is_active());

create policy branding_settings_admin_write
  on public.branding_settings for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Storage: bucket privado para a logo institucional. Leitura por qualquer
-- usuário autenticado e ativo (consultor precisa dela no formulário/preview;
-- mesma regra de `current_user_is_active()` de `branding_settings` acima);
-- escrita restrita a admin.

insert into storage.buckets (id, name, public)
values ('branding-assets', 'branding-assets', false)
on conflict (id) do nothing;

create policy branding_assets_select_authenticated
  on storage.objects for select
  using (
    bucket_id = 'branding-assets'
    and auth.uid() is not null
    and public.current_user_is_active()
  );

create policy branding_assets_admin_insert
  on storage.objects for insert
  with check (bucket_id = 'branding-assets' and public.current_user_role() = 'admin');

create policy branding_assets_admin_update
  on storage.objects for update
  using (bucket_id = 'branding-assets' and public.current_user_role() = 'admin');

create policy branding_assets_admin_delete
  on storage.objects for delete
  using (bucket_id = 'branding-assets' and public.current_user_role() = 'admin');

-- Seed: garante que sempre exista a linha singleton, associada ao primeiro
-- admin encontrado (mesmo padrão de `..._seed_prompt_version.sql`). Se ainda
-- não houver admin (banco novo), a aplicação cria a linha no primeiro
-- acesso à tela de identidade visual.

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
    insert into public.branding_settings (company_name, institutional_footer, updated_by)
    values (
      'SNOW Operadora',
      'Produto desenvolvido e criado com a qualidade e segurança SNOW Operadora.',
      first_admin_id
    );
  end if;
end $$;
