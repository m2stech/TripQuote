-- TripQuote — versão 1 do prompt de geração do produto Cruzeiro (M11).
-- Mesma estrutura de placeholders de `composeCruisePromptInput`
-- (src/features/ai/prompt/compose-cruise-prompt.ts). Linha própria por
-- `product_type = 'cruzeiro'` — não interfere na numeração nem no histórico
-- de versões do terrestre (v1-v6).
--
-- Mesma ressalva da seed v1 do terrestre: só insere se já existir um admin
-- em `profiles` (necessário para `created_by`); em banco novo, reaplicar
-- manualmente depois de criar o primeiro admin.

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
    insert into public.prompt_versions (product_type, version, content, is_active, created_by)
    values (
      'cruzeiro',
      1,
      $prompt$ATUE COMO ESPECIALISTA EM CRUZEIROS E CONSULTOR DE OPERADORA
================================================================
Crie orçamento premium de CRUZEIRO para cliente final em PowerPoint editável (.pptx), widescreen 16:9, em português do Brasil. Use somente os dados abaixo e pesquisas públicas atuais do navio/companhia/portos. Não reutilize elementos de propostas anteriores.

INVENTÁRIO BLOQUEANTE: {{INVENTORY_COUNTS}}. Exibir todos. Se faltar espaço, criar mais slides; não omitir informações.

1. DADOS GERAIS
Agência: {{AGENCY}}
Consultor: {{CONSULTANT}}
Companhia marítima: {{CRUISE_LINE}}
Navio: {{SHIP_NAME}}
Destino/região: {{DESTINATION}}
Embarque: {{EMBARKATION_PORT}}, em {{EMBARKATION_DATE}}
Desembarque: {{DISEMBARKATION_PORT}}, em {{DISEMBARKATION_DATE}}
Perfil da viagem: {{TRIP_PROFILE}}
Ocupação considerada: {{OCCUPANCY}}
Moeda: {{CURRENCY}}

2. ESTRUTURA
Slide 1 capa; slide 2 a viagem em resumo; slide(s) de roteiro dia a dia; slide "Conheça o navio"; slide da experiência a bordo; slides de cabines e tarifas; slide do que está incluído/não incluído/opcional; slide final com pagamento, informações importantes e rodapé. Ampliar slides para manter tudo legível.

3. CAPA
Tagline: {{TAGLINE}}. Se nenhuma tagline foi informada, redija uma frase de efeito original e curta para a viagem (campo `coverTagline` da resposta). Não decida nada sobre logos: a aplicação da logo da agência e da logo institucional é feita de forma determinística pelo sistema, fora da sua resposta.

4. A VIAGEM EM RESUMO
Redija um resumo comercial breve da viagem (navio, companhia, período, destino, perfil) no campo `tripSummary`. Não repita os dados comerciais já listados acima como se fossem novidade; sintetize-os de forma atrativa.

5. ROTEIRO
{{ITINERARY_BLOCK}}
Se um print do roteiro foi fornecido (ver conteúdo de imagem anexo a esta mensagem), extraia dele os dias, portos/destinos, operação (embarque/atracado/ancorado/navegação/desembarque) e horários, cruzando com o texto digitado quando houver. Nunca invente portos, datas ou horários que não estejam nem no texto digitado nem na imagem fornecida. Para cada porto distinto do roteiro (exceto dias de navegação sem escala), produza no campo `ports` da resposta: nome do porto (`name`), breve descrição turística (`shortDescription`) e uma foto REAL do porto/destino (`photo`, mesmo critério de verificação da seção 6).

6. CONHEÇA O NAVIO
Pesquise informações públicas e verificáveis sobre o navio {{SHIP_NAME}} da companhia {{CRUISE_LINE}}: classe/categoria do navio (`shipProfile.shipClass`), capacidade de passageiros (`shipProfile.capacity`) e até 5 diferenciais relevantes (`shipProfile.highlights`). Destaques já informados pela agência: {{SHIP_HIGHLIGHTS}} — incorpore-os se fizerem sentido, sem inventar além do que é verificável.
FOTO DO NAVIO: pesquise na web uma foto REAL do navio (fachada externa characterística), preferindo o site oficial da companhia ou fonte pública confiável. Preencha `shipPhoto.status = "real_photo_found"`, `shipPhoto.url` e `shipPhoto.sourceUrl` quando encontrar uma foto real verificada. Se não for possível confirmar, preencha `shipPhoto.status = "illustration_required"` e `shipPhoto.caption = "Imagem ilustrativa"`. Se não for possível nem isso, use `shipPhoto.status = "not_found"`. Nunca informe uma foto de outro navio nem afirme que uma imagem gerada é foto real.

7. EXPERIÊNCIA A BORDO
Redija um texto breve sobre a experiência a bordo típica do navio/companhia (entretenimento, gastronomia, lazer, espaço infantil, experiências exclusivas), baseado em pesquisa pública verificável, no campo `onboardExperience`.

8. CABINES E TARIFAS
{{CABINS_BLOCK}}
Taxas portuárias e gorjetas: {{PORT_FEES_BLOCK}}
Regras da tarifa: {{FARE_RULES}}
Nunca calcule, altere ou invente valores monetários, categorias de cabine ou ocupação: esses dados já vêm prontos do formulário acima e não aparecem na sua resposta estruturada (não há campo de cabines/tarifas no schema de saída — a transcrição exata é feita de forma determinística pelo sistema).

9. INCLUÍDO, NÃO INCLUÍDO E OPCIONAIS
Incluído:
{{INCLUDED_LIST}}
Não incluído:
{{NOT_INCLUDED_LIST}}
Opcionais:
{{OPTIONAL_LIST}}
Informações importantes: {{IMPORTANT_INFO}}
Esses itens não aparecem na sua resposta estruturada — são transcritos de forma determinística pelo sistema a partir do formulário.

10. SLIDE FINAL — PAGAMENTO (TEXTO FIXO, NÃO ALTERAR PELO SISTEMA)
O texto de condições de pagamento é fixo e já está definido no sistema (não depende da sua resposta); não o redija nem o repita na saída estruturada.

11. VALIDAÇÃO BLOQUEANTE
Antes de finalizar, confira mentalmente que sua resposta cobre: ao menos uma entrada em `ports` quando há roteiro informado (texto digitado e/ou print); `shipProfile` e `shipPhoto` sempre preenchidos; `onboardExperience` sempre preenchido. Não omita nenhum porto do roteiro informado.$prompt$,
      true,
      first_admin_id
    )
    on conflict (product_type, version) do nothing;
  end if;
end $$;
