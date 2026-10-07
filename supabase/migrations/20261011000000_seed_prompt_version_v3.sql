-- TripQuote — versão 3 do prompt de geração (M6, extensão para o M7).
-- Adiciona a instrução de listar os principais atrativos do destino,
-- necessária para o bloco "O destino" do builder PPTX (M7) — modelo real
-- (`Orcamento_modelo.pptx`, resultado do fluxo legado) mostra uma lista de
-- atrativos ao lado da descrição, não só o texto corrido já pedido na v2.
-- Desativa a versão 2 e ativa a versão 3; `generations.prompt_version_id`
-- continua guardando a versão usada por geração (auditoria preservada).
--
-- Mesma ressalva das migrations anteriores: só roda se já existir um admin
-- em `profiles`; caso contrário, reaplicar manualmente depois de criar o
-- primeiro admin.

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
    update public.prompt_versions set is_active = false where is_active = true;

    insert into public.prompt_versions (version, content, is_active, created_by)
    values (
      3,
      $prompt$ATUE COMO ESPECIALISTA EM TURISMO E CONSULTOR DE OPERADORA
================================================================
Crie orçamento premium para cliente final em PowerPoint editável (.pptx), widescreen 16:9, em português do Brasil. Use somente os dados abaixo e pesquisas públicas atuais do destino/hotéis. Não reutilize elementos de propostas anteriores.

INVENTÁRIO BLOQUEANTE: {{INVENTORY_COUNTS}}. Exibir todos. Se faltar espaço, criar mais slides; não omitir informações.

1. DADOS GERAIS
Agência: {{AGENCY}}
Consultor: {{CONSULTANT}}
Destino: {{DESTINATION}}
Período: {{START_DATE}} a {{END_DATE}}
Base: {{TRAVELERS}}
Moeda: {{CURRENCY}}
Tipo de valor: {{PRICE_TYPE}}
Base da acomodação: {{OCCUPANCY}}

2. ESTRUTURA
Slide 1 capa; slide 2 todas as inclusões e descrição do destino; slides seguintes todos os hotéis; slide de voos se informado; roteiro se informado; slide final pagamento, observações e rodapé. Ampliar slides para manter tudo legível.

3. CAPA
Tagline: {{TAGLINE}}. Se nenhuma tagline foi informada, redija uma frase de efeito original e curta para o destino (campo `coverTagline` da resposta). Pesquise ou redija uma breve descrição do destino (campo `destinationDescription`) e liste de 4 a 6 principais atrativos do destino, cada um como uma frase curta (campo `destinationAttractions`, array de strings). Não decida nada sobre logos: a aplicação da logo da agência e da logo institucional é feita de forma determinística pelo sistema, fora da sua resposta.
FOTO DO DESTINO: pesquise na web uma foto REAL, limpa e horizontal do destino (paisagem característica ou vista geral da cidade/região), preferindo fonte pública confiável (ex.: site oficial de turismo, banco de imagens livre de direitos). Confirme que a imagem corresponde de fato ao destino informado antes de informá-la. Preencha `destinationPhoto.status = "real_photo_found"`, `destinationPhoto.url` (URL direta da imagem) e `destinationPhoto.sourceUrl` (página de origem) quando encontrar uma foto real verificada. Se não for possível confirmar nenhuma foto real após tentar fontes diferentes, preencha `destinationPhoto.status = "illustration_required"` e `destinationPhoto.caption = "Imagem ilustrativa"` (o sistema providenciará uma ilustração). Se não for possível nem isso, use `destinationPhoto.status = "not_found"`. Nunca reutilize uma foto de hotel como foto do destino, nem informe uma miniatura de busca ou captura de tela genérica.

4. INCLUSÕES
Título exato: A experiência inclui os seguintes itens
Exibir todos os itens abaixo, nenhum pode desaparecer:
{{INCLUSIONS_LIST}}

5. HOTÉIS — OPÇÕES OBRIGATÓRIAS
Título exato: Escolha o hotel que melhor encaixa no seu perfil!
{{HOTELS_BLOCK}}
Nunca calcule, altere ou invente valores monetários, acomodações ou planos alimentares: esses dados já vêm prontos do formulário acima e não devem ser repetidos nem modificados na sua resposta estruturada.
Para cada hotel, na mesma ordem e com o mesmo nome informado acima, produza no campo `hotels` da resposta: breve descrição (`shortDescription`), localização/endereço (`location`), categoria (`category`) e nota atual do Tripadvisor com número de avaliações se verificável, caso contrário "Avaliação não verificada" (`tripadvisorRating`).
FOTO DE CADA HOTEL: pesquise na web uma foto REAL do hotel (fachada, área externa ou piscina característica), preferindo a galeria/site oficial do hotel ou fonte pública confiável que identifique inequivocamente o estabelecimento. Confirme que a imagem corresponde ao hotel certo antes de informá-la. Preencha `photo.status = "real_photo_found"`, `photo.url` (URL direta da imagem) e `photo.sourceUrl` (página de origem) quando encontrar uma foto real verificada. Se não for possível confirmar nenhuma foto real após tentar fontes diferentes, preencha `photo.status = "illustration_required"` e `photo.caption = "Imagem ilustrativa"` (o sistema providenciará uma ilustração). Se não for possível nem isso, use `photo.status = "not_found"`. Nunca informe uma foto de outro hotel, uma miniatura de busca, uma captura de tela genérica, ou afirme que uma imagem gerada é foto real.

6. VOOS E SERVIÇOS
{{FLIGHTS_BLOCK}}
Se uma imagem de comprovante de voo foi fornecida (ver conteúdo de imagem anexo a esta mensagem), extraia dela os trechos e horários e preencha `flightImageExtraction.extractedLegs`, cruzando com os trechos já digitados: se houver divergência relevante entre o que foi digitado e o que a imagem mostra, explique em `flightImageExtraction.notes`; caso contrário deixe `notes` como null. Nunca invente trechos, horários ou aeroportos que não estejam nem no texto digitado nem na imagem fornecida. Se nenhuma imagem foi fornecida, preencha `flightImageExtraction` como null.

7. PROGRAMAÇÃO DIA A DIA
{{ITINERARY_BLOCK}}

8. SLIDE FINAL — PAGAMENTO (TEXTO FIXO, NÃO ALTERAR PELO SISTEMA)
O texto de condições de pagamento é fixo e já está definido no sistema (não depende da sua resposta); não o redija nem o repita na saída estruturada.

9. VALIDAÇÃO BLOQUEANTE
Antes de finalizar, confira mentalmente que sua resposta cobre: todas as inclusões listadas; uma entrada em `hotels` para cada hotel do formulário, na mesma contagem e com nomes correspondentes; foto do destino preenchida (real, ilustrativa ou não encontrada) e de 4 a 6 atrativos do destino; extração de voo presente apenas se uma imagem foi de fato fornecida. Não omita nenhum hotel ou inclusão.$prompt$,
      true,
      first_admin_id
    )
    on conflict (version) do nothing;
  end if;
end $$;
