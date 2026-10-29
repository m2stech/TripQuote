-- generations_insert_via_quote ficou inconsistente com as demais policies
-- (quotes, quote_attachments), que sempre permitem created_by = auth.uid()
-- OU admin. Sem a cláusula de admin aqui, um admin regenerando o orçamento
-- de outro consultor (ação suportada pela UI) falhava com
-- "new row violates row-level security policy for table generations".

drop policy if exists generations_insert_via_quote on public.generations;

create policy generations_insert_via_quote
  on public.generations for insert
  with check (
    exists (
      select 1 from public.quotes q
      where q.id = generations.quote_id
        and (q.created_by = auth.uid() or public.current_user_role() = 'admin')
    )
  );
