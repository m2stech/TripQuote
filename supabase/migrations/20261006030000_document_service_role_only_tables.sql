-- Documenta a decisão de design: `generations` e `audit_log` só recebem
-- escrita (insert/update) via SUPABASE_SERVICE_ROLE_KEY no backend (M6/M9),
-- nunca pelo cliente autenticado com a anon key. Por isso não há policy de
-- UPDATE em `generations` nem de INSERT em `audit_log` — o service role
-- bypassa RLS. Nenhuma mudança de schema; apenas comentários para deixar a
-- intenção explícita a quem ler a migration depois.

comment on table public.generations is
  'Registro de cada execução de geração via IA (auditoria de custo e versão de prompt). '
  'Insert/update feitos só via SUPABASE_SERVICE_ROLE_KEY no backend (bypassa RLS); '
  'não há policy de UPDATE porque o client autenticado nunca escreve aqui.';

comment on table public.audit_log is
  'Trilha de auditoria de ações administrativas e sobre orçamentos. '
  'Todo insert é feito via SUPABASE_SERVICE_ROLE_KEY no backend (bypassa RLS); '
  'não há policy de INSERT porque o client autenticado nunca escreve aqui.';
