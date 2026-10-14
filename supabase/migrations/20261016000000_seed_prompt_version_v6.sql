-- TripQuote — versão 6 do prompt de geração (M7, melhoria estética pós-teste
-- com usuário real). A seção de voos era uma tabela genérica (Voo/Saída/
-- Chegada/Origem/Destino) bem mais pobre visualmente que o fluxo legado
-- (`Prompt_orcamento_SNOW.html`), que tinha cards por trecho com companhia
-- aérea, duração e nome de cidade, e slides de ida/retorno separados.
-- Agora a IA estrutura os trechos SEMPRE (texto digitado e/ou imagem de
-- comprovante), não só quando há imagem — novo campo `flightItinerary.legs`
-- (substitui `flightImageExtraction.extractedLegs`), consumido pelo builder
-- em `flights-slide.ts` para montar os mesmos cards do fluxo legado.
-- Desativa a versão 5 e ativa a versão 6; `generations.prompt_version_id`
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
      6,
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
{{CIRCUIT_BLOCK}}

2. ESTRUTURA
Slide 1 capa; slide 2 todas as inclusões e descrição do destino; slides seguintes todos os hotéis; slide(s) de voos se informado (ida e retorno em slides separados); roteiro se informado; slide final pagamento, observações e rodapé. Ampliar slides para manter tudo legível.

3. CAPA
Tagline: {{TAGLINE}}. Se nenhuma tagline foi informada, redija uma frase de efeito original e curta para o destino (campo `coverTagline` da resposta). Pesquise ou redija uma breve descrição do destino (campo `destinationDescription`) e liste de 4 a 6 principais atrativos do destino, cada um como uma frase curta (campo `destinationAttractions`, array de strings). Não decida nada sobre logos: a aplicação da logo da agência e da logo institucional é feita de forma determinística pelo sistema, fora da sua resposta.
FOTO DO DESTINO: pesquise na web uma foto REAL, limpa e horizontal do destino (paisagem característica ou vista geral da cidade/região), preferindo fonte pública confiável (ex.: site oficial de turismo, banco de imagens livre de direitos). Confirme que a imagem corresponde de fato ao destino informado antes de informá-la. Preencha `destinationPhoto.status = "real_photo_found"`, `destinationPhoto.url` (URL direta da imagem) e `destinationPhoto.sourceUrl` (página de origem) quando encontrar uma foto real verificada. Se não for possível confirmar nenhuma foto real após tentar fontes diferentes, preencha `destinationPhoto.status = "illustration_required"` e `destinationPhoto.caption = "Imagem ilustrativa"` (o sistema providenciará uma ilustração). Se não for possível nem isso, use `destinationPhoto.status = "not_found"`. Nunca reutilize uma foto de hotel como foto do destino, nem informe uma miniatura de busca ou captura de tela genérica.

4. INCLUSÕES
Título exato: A experiência inclui os seguintes itens
Exibir todos os itens abaixo, nenhum pode desaparecer:
{{INCLUSIONS_LIST}}

5. HOTÉIS
Se este orçamento NÃO é um circuito (ver seção 1): título exato "Escolha o hotel que melhor encaixa no seu perfil!" — cada hotel abaixo é uma OPÇÃO alternativa de hospedagem, com preço próprio, para o cliente escolher uma entre elas.
Se este orçamento É um circuito (ver seção 1): título exato "Hospedagem ao longo do roteiro" — os hotéis abaixo são etapas sequenciais de um mesmo roteiro por cidades diferentes, não alternativas; nunca mencione preço por hotel, pois o valor é único para todo o pacote (já informado na seção 1).
{{HOTELS_BLOCK}}
Nunca calcule, altere ou invente valores monetários, acomodações ou planos alimentares: esses dados já vêm prontos do formulário acima e não devem ser repetidos nem modificados na sua resposta estruturada.
Para cada hotel, na mesma ordem e com o mesmo nome informado acima, produza no campo `hotels` da resposta: breve descrição (`shortDescription`), localização/endereço (`location`), categoria (`category`) e nota atual do Tripadvisor com número de avaliações se verificável, caso contrário "Avaliação não verificada" (`tripadvisorRating`).
FOTO DE CADA HOTEL: pesquise na web uma foto REAL do hotel (fachada, área externa ou piscina característica), preferindo a galeria/site oficial do hotel ou fonte pública confiável que identifique inequivocamente o estabelecimento. Confirme que a imagem corresponde ao hotel certo antes de informá-la. Preencha `photo.status = "real_photo_found"`, `photo.url` (URL direta da imagem) e `photo.sourceUrl` (página de origem) quando encontrar uma foto real verificada. Se não for possível confirmar nenhuma foto real após tentar fontes diferentes, preencha `photo.status = "illustration_required"` e `photo.caption = "Imagem ilustrativa"` (o sistema providenciará uma ilustração). Se não for possível nem isso, use `photo.status = "not_found"`. Nunca informe uma foto de outro hotel, uma miniatura de busca, uma captura de tela genérica, ou afirme que uma imagem gerada é foto real.

6. VOOS E SERVIÇOS
{{FLIGHTS_BLOCK}}
Estruture cada trecho de voo (do texto digitado e/ou da imagem de comprovante anexa a esta mensagem, se houver) como um item em `flightItinerary.legs`, com os campos: `direction` ("outbound" para a viagem de ida, "return" para a de volta — identifique pela ordem/datas; se não houver volta, inclua só "outbound"), `airline` (nome da companhia aérea), `flightNumber` (ex.: "LA 3555"), `originCode`/`destinationCode` (código IATA do aeroporto, ex.: "GRU"), `originCity`/`destinationCity` (cidade do aeroporto, ex.: "São Paulo" — pesquise se não estiver explícito), `departureTime`/`arrivalTime` (horário local, incluindo "(+1 dia)" se a chegada for no dia seguinte) e `duration` (ex.: "2h40"). Se companhia, número do voo ou duração não estiverem no texto digitado nem na imagem, pesquise pelo trecho e horário para preenchê-los; se não for possível confirmar algum campo, use uma string vazia, nunca invente. Preencha `flightItinerary.notes` com qualquer divergência relevante entre texto digitado e imagem (quando ambos existirem) ou deixe null. Se nenhum voo foi solicitado, preencha `flightItinerary` como null. Nunca invente trechos, horários ou aeroportos que não estejam no texto digitado nem na imagem fornecida — apenas enriqueça com companhia/número/duração/cidade quando pesquisável.

7. PROGRAMAÇÃO DIA A DIA
{{ITINERARY_BLOCK}}

8. SLIDE FINAL — PAGAMENTO (TEXTO FIXO, NÃO ALTERAR PELO SISTEMA)
O texto de condições de pagamento é fixo e já está definido no sistema (não depende da sua resposta); não o redija nem o repita na saída estruturada.

9. VALIDAÇÃO BLOQUEANTE
Antes de finalizar, confira mentalmente que sua resposta cobre: todas as inclusões listadas; uma entrada em `hotels` para cada hotel do formulário, na mesma contagem e com nomes correspondentes; foto do destino preenchida (real, ilustrativa ou não encontrada) e de 4 a 6 atrativos do destino; `flightItinerary.legs` com uma entrada para cada trecho digitado ou extraído da imagem, sempre que voos foram solicitados. Não omita nenhum hotel, inclusão ou trecho de voo.$prompt$,
      true,
      first_admin_id
    )
    on conflict (version) do nothing;
  end if;
end $$;
