-- TripQuote — coluna para a saída estruturada da IA (M6).
-- `quotes.form` é o payload digitado pelo usuário (QuoteDraftValues); a saída
-- da IA (textos redigidos, fotos de hotel pesquisadas, extração da imagem de
-- voo) é um dado derivado, gerado no backend, e não deve se misturar com o
-- que o usuário preencheu. Guardada em coluna própria para o builder PPTX
-- (M7) consumir sem ambiguidade entre "o que o usuário digitou" e "o que a
-- IA gerou".

alter table public.quotes add column ai_output jsonb;

comment on column public.quotes.ai_output is
  'Saída estruturada da geração via IA (GenerationOutput, ver features/ai). '
  'Nunca confundir com `form`, que é o payload digitado pelo usuário.';
