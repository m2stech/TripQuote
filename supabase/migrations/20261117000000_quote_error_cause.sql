-- Classificação da última falha de geração (ver `classify-generation-failure.ts`):
-- `user_input` quando o problema está nos dados do formulário (ex.: hotel não
-- reconhecido pela IA, anexo corrompido) e o consultor pode corrigir e tentar
-- de novo; `system` quando é falha de infraestrutura/IA fora do controle do
-- usuário. Nulo em orçamentos sem erro ou gerados antes desta coluna existir
-- (a UI cai no texto genérico nesse caso).
create type public.quote_error_cause as enum ('user_input', 'system');

alter table public.quotes
  add column error_cause public.quote_error_cause;
