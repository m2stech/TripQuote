-- TripQuote — status comercial (M12).
-- Status comercial (Pendente/Efetivado/Cancelado), desacoplado do status
-- técnico de geração (`quote_status`), com histórico de auditoria por
-- orçamento. Quem altera: consultor dono do orçamento ou admin — mesmo
-- padrão owner-or-admin já usado em `quotes` (ver docs/PLAN.md M12).
--
-- Rollback manual (Supabase CLI não gera down-migration):
--   drop policy if exists quote_commercial_status_history_insert on public.quote_commercial_status_history;
--   drop policy if exists quote_commercial_status_history_select on public.quote_commercial_status_history;
--   drop table if exists public.quote_commercial_status_history;
--   drop index if exists public.quotes_commercial_status_idx;
--   alter table public.quotes
--     drop column if exists commercial_status,
--     drop column if exists commercial_reference,
--     drop column if exists commercial_reason,
--     drop column if exists commercial_status_updated_at,
--     drop column if exists commercial_status_updated_by;
--   drop type if exists public.commercial_status;

create type public.commercial_status as enum ('pending', 'won', 'lost');

alter table public.quotes
  add column commercial_status public.commercial_status not null default 'pending',
  add column commercial_reference text,
  add column commercial_reason text,
  add column commercial_status_updated_at timestamptz,
  add column commercial_status_updated_by uuid references public.profiles (id);

comment on column public.quotes.commercial_status is 'Status comercial (Pendente/Efetivado/Cancelado), independente do status técnico de geração.';
comment on column public.quotes.commercial_reference is 'Localizador/referência da venda — obrigatório quando commercial_status = won (validado na aplicação, não no banco).';
comment on column public.quotes.commercial_reason is 'Justificativa de cancelamento — obrigatória quando commercial_status = lost (validado na aplicação, não no banco).';

create index quotes_commercial_status_idx on public.quotes (commercial_status);

-- quote_commercial_status_history ------------------------------------------
-- Histórico append-only de alterações de status comercial. Tabela própria
-- (não reaproveita `audit_log`) para permitir consulta tipada e indexada por
-- orçamento — ver docs/PLAN.md M12 para a justificativa completa.

create table public.quote_commercial_status_history (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  previous_status public.commercial_status,
  new_status public.commercial_status not null,
  reference text,
  reason text,
  changed_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

comment on table public.quote_commercial_status_history is 'Histórico de alterações de status comercial por orçamento (auditoria, append-only).';

create index quote_commercial_status_history_quote_id_idx
  on public.quote_commercial_status_history (quote_id);

alter table public.quote_commercial_status_history enable row level security;

-- Leitura: segue a visibilidade do orçamento pai (dono ou admin), mesmo
-- padrão de `quote_attachments`/`generations`.
create policy quote_commercial_status_history_select
  on public.quote_commercial_status_history for select
  using (
    exists (
      select 1 from public.quotes q
      where q.id = quote_commercial_status_history.quote_id
        and (q.created_by = auth.uid() or public.current_user_role() = 'admin')
    )
  );

-- Gravação via Server Action com o client do usuário autenticado (não
-- service role, para reaproveitar a mesma sessão já usada pela UPDATE em
-- `quotes`) — diferente do padrão "service-role-only" de `generations`/
-- `audit_log`, esta tabela precisa de uma policy de INSERT própria.
create policy quote_commercial_status_history_insert
  on public.quote_commercial_status_history for insert
  with check (
    changed_by = auth.uid()
    and exists (
      select 1 from public.quotes q
      where q.id = quote_commercial_status_history.quote_id
        and (q.created_by = auth.uid() or public.current_user_role() = 'admin')
    )
  );
