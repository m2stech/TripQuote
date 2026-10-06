-- TripQuote — schema inicial (M4)
-- Papéis, orçamentos, anexos, versionamento de prompt, geração e auditoria.
-- RLS: consultor acessa só os próprios registros; admin gerencia tudo;
-- prompt_versions é restrito a admin (ver CLAUDE.md e docs/PLAN.md M4).

-- Extensão para geração de UUID
create extension if not exists "pgcrypto";

-- Tipos -----------------------------------------------------------------

create type public.user_role as enum ('consultant', 'admin');

create type public.quote_status as enum ('draft', 'processing', 'done', 'error');

create type public.attachment_kind as enum ('agency_logo', 'flight_image', 'institutional_logo');

-- profiles ----------------------------------------------------------------
-- Espelha auth.users com o papel da aplicação (consultor/admin).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role public.user_role not null default 'consultant',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Papel e status de cada usuário autenticado (consultor vs admin).';

-- prompt_versions -----------------------------------------------------------
-- Versionamento do prompt usado na geração via IA (M6). Editável só por admin.

create table public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  version integer not null,
  content text not null,
  is_active boolean not null default false,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

comment on table public.prompt_versions is 'Versões do prompt de geração; apenas uma ativa por vez.';

create unique index prompt_versions_version_key on public.prompt_versions (version);

-- Garante uma única versão ativa por vez.
create unique index prompt_versions_single_active
  on public.prompt_versions (is_active)
  where is_active;

-- quotes --------------------------------------------------------------------
-- Um registro por orçamento gerado. `form` guarda o payload completo do
-- formulário (QuoteFormValues) como JSONB, validado pelo Zod na aplicação.

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  status public.quote_status not null default 'draft',
  created_by uuid not null references public.profiles (id),
  agency text not null,
  consultant text not null default '',
  destination text not null,
  start_date date,
  end_date date,
  form jsonb not null,
  error_message text,
  pptx_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.quotes is 'Orçamentos criados pelos consultores; form guarda o payload completo do formulário.';

create index quotes_created_by_idx on public.quotes (created_by);
create index quotes_status_idx on public.quotes (status);
create index quotes_destination_idx on public.quotes (destination);
create index quotes_start_date_idx on public.quotes (start_date);

-- quote_attachments -----------------------------------------------------------
-- Metadados de arquivos enviados (logo da agência, imagem de voo). O upload
-- real para o Storage é implementado no M5; a tabela já existe desde o M4.

create table public.quote_attachments (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  kind public.attachment_kind not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null,
  created_at timestamptz not null default now()
);

comment on table public.quote_attachments is 'Anexos de um orçamento (logo da agência, imagem de voo).';

create index quote_attachments_quote_id_idx on public.quote_attachments (quote_id);

-- generations -----------------------------------------------------------------
-- Auditoria de cada chamada à IA: modelo, tokens, custo estimado e versão do
-- prompt usada (M6/M9).

create table public.generations (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  prompt_version_id uuid not null references public.prompt_versions (id),
  requested_by uuid not null references public.profiles (id),
  model text not null,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  estimated_cost_usd numeric(10, 4) not null default 0,
  status public.quote_status not null default 'processing',
  error_message text,
  created_at timestamptz not null default now()
);

comment on table public.generations is 'Registro de cada execução de geração via IA (auditoria de custo e versão de prompt).';

create index generations_quote_id_idx on public.generations (quote_id);
create index generations_requested_by_idx on public.generations (requested_by);

-- audit_log ---------------------------------------------------------------
-- Trilha de auditoria genérica (ações administrativas e sobre orçamentos).

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_log is 'Trilha de auditoria de ações administrativas e sobre orçamentos.';

create index audit_log_actor_id_idx on public.audit_log (actor_id);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);

-- updated_at triggers -------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger quotes_set_updated_at
  before update on public.quotes
  for each row execute function public.set_updated_at();

-- Helper: papel do usuário autenticado -------------------------------------

create function public.current_user_role()
returns public.user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Novo usuário cria profile automaticamente ---------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS -----------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.prompt_versions enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_attachments enable row level security;
alter table public.generations enable row level security;
alter table public.audit_log enable row level security;

-- profiles: usuário vê e atualiza o próprio perfil; admin vê e gerencia todos.

create policy profiles_select_own_or_admin
  on public.profiles for select
  using (id = auth.uid() or public.current_user_role() = 'admin');

create policy profiles_update_own_or_admin
  on public.profiles for update
  using (id = auth.uid() or public.current_user_role() = 'admin');

create policy profiles_insert_admin
  on public.profiles for insert
  with check (public.current_user_role() = 'admin');

create policy profiles_delete_admin
  on public.profiles for delete
  using (public.current_user_role() = 'admin');

-- prompt_versions: leitura pelo admin apenas; escrita pelo admin apenas.
-- Consultores não leem prompts (regra de negócio: prompt nunca chega à UI).

create policy prompt_versions_admin_all
  on public.prompt_versions for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- quotes: consultor vê e gerencia só os próprios; admin vê e gerencia todos.

create policy quotes_select_own_or_admin
  on public.quotes for select
  using (created_by = auth.uid() or public.current_user_role() = 'admin');

create policy quotes_insert_own
  on public.quotes for insert
  with check (created_by = auth.uid());

create policy quotes_update_own_or_admin
  on public.quotes for update
  using (created_by = auth.uid() or public.current_user_role() = 'admin');

create policy quotes_delete_own_or_admin
  on public.quotes for delete
  using (created_by = auth.uid() or public.current_user_role() = 'admin');

-- quote_attachments: segue a visibilidade do orçamento pai.

create policy quote_attachments_select_via_quote
  on public.quote_attachments for select
  using (
    exists (
      select 1 from public.quotes q
      where q.id = quote_attachments.quote_id
        and (q.created_by = auth.uid() or public.current_user_role() = 'admin')
    )
  );

create policy quote_attachments_insert_via_quote
  on public.quote_attachments for insert
  with check (
    exists (
      select 1 from public.quotes q
      where q.id = quote_attachments.quote_id
        and (q.created_by = auth.uid() or public.current_user_role() = 'admin')
    )
  );

create policy quote_attachments_delete_via_quote
  on public.quote_attachments for delete
  using (
    exists (
      select 1 from public.quotes q
      where q.id = quote_attachments.quote_id
        and (q.created_by = auth.uid() or public.current_user_role() = 'admin')
    )
  );

-- generations: segue a visibilidade do orçamento pai (auditoria por dono + admin).

create policy generations_select_via_quote
  on public.generations for select
  using (
    exists (
      select 1 from public.quotes q
      where q.id = generations.quote_id
        and (q.created_by = auth.uid() or public.current_user_role() = 'admin')
    )
  );

create policy generations_insert_via_quote
  on public.generations for insert
  with check (
    exists (
      select 1 from public.quotes q
      where q.id = generations.quote_id
        and q.created_by = auth.uid()
    )
  );

-- audit_log: só admin lê; sistema grava via service role (bypassa RLS).

create policy audit_log_select_admin
  on public.audit_log for select
  using (public.current_user_role() = 'admin');
