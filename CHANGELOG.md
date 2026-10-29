# Changelog

Todas as mudanças relevantes do TripQuote (SnowQuote) a partir do fechamento dos marcos M0–M10 (ver [docs/PLAN.md](docs/PLAN.md) para o histórico de construção do produto).

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [Unreleased]

### ⚠️ Pendência (aguardando decisão de negócio)
- Geração falha repetidamente com "A resposta não cobriu todos os hotéis informados no formulário" quando o nome do hotel no formulário é incomum (ex.: "Uyuni no Hotel Hotel Jardines de Uyuni", "Ojo de Perdiz no Hotel Tayka del Desierto" — parecem ter o campo "Cidade" concatenado dentro do nome, em vez de usar o campo `city` dedicado). `hasCompleteHotelCoverage` (`src/features/ai/orchestration/generate-quote-content.ts`) exige nome idêntico (string exata) entre formulário e resposta da IA; a IA provavelmente normaliza o texto ao reescrevê-lo, quebrando o match mesmo com a instrução do prompt de preservar o nome literal. Correção discutida com o usuário (2026-10-29): tornar a comparação tolerante (por posição/contagem, já que o prompt garante mesma ordem, em vez de string exata) é a opção recomendada, mas o usuário quer confirmar antes algumas regras de negócio com o cliente (como o campo "Cidade" deve ser preenchido em hotéis de circuito) antes de decidir a correção. Caso de teste: orçamento "Rangel · Atacama com Salar de Uyuni" (quote id `7c5f2226-787f-4de2-8f57-109551fdd27e`).

### Corrigido
- Regeneração de orçamento por admin: policy de RLS de `INSERT` em `generations` não tinha a cláusula `OR current_user_role() = 'admin'` presente em todas as outras tabelas (quotes, quote_attachments) — um admin tentando regenerar um orçamento criado por outro consultor recebia sempre "Não foi possível gerar o orçamento", com `new row violates row-level security policy for table "generations"` no `audit_log`. Migration `20261029180000_fix_generations_insert_rls_admin.sql`. Reportado pelo usuário ao tentar regenerar um orçamento da consultora Julia.
- Hotéis: "Acomodações e valores" (seção 04) deixou de ser um único campo de texto livre no formato "Tipo | Valor" e passou a ser dois campos separados — Acomodação e Valor (modo circuito mostra só Acomodação, já que o preço nesse modo é o valor único do pacote). Antes, qualquer preenchimento sem o separador "|" exato fazia o valor ser gravado incorretamente no .pptx (ex.: aparecer como tipo de quarto, ou não aparecer). Orçamentos já salvos no formato antigo continuam sendo lidos corretamente (migração automática na leitura). Reportado pelo cliente (BV Group).
- Destino: a largura da coluna de texto (título + descrição) no slide "O destino" ultrapassava a linha divisória vertical em 0,333" — o texto da descrição chegava a sobrepor o divisor e invadir a coluna "Principais atrativos" em descrições mais longas. Causa: a largura da caixa era calculada a partir da margem do slide, não do início real do texto (que tem um recuo adicional). Reportado pelo cliente (BV Group) com uma nova geração de exemplo.
- Tipografia: o .pptx gerado usava 2 fontes (Cambria nos títulos/destaques, Calibri no corpo) — unificado para Calibri em todo o arquivo, por pedido do cliente (BV Group).
- Voos: ida e retorno passaram a aparecer no mesmo slide (antes cada direção tinha seu próprio slide, duplicando os cards de bagagem/assento/serviços). Quando há mais de uma direção, um label "IDA"/"RETORNO" separa os grupos de trechos; com só uma direção, nenhum label aparece. Pedido do cliente (BV Group).
- Destino: o bloco "O destino" (descrição + principais atrativos) deixou de dividir slide com os cards de inclusão — agora é sempre a 2ª página do .pptx, logo após a capa, com título próprio "O destino" (antes aparecia ao final da seção de inclusões, às vezes sozinho, e com pouco espaço vertical entre o texto da descrição e a base do card). Pedido do cliente (BV Group).

### Adicionado
- Pagamento fixo: seção 07 ganhou um seletor de condição de pagamento — "Condições gerais" (padrão, texto já existente) ou "Produtos de Ski e Outros Produtos Especiais" (nova, conforme página oficial da SNOW: 3% de desconto à vista, até 6x sem juros no cartão/boleto com 25% de entrada, pagamento em USD com isenção de IOF). O texto escolhido é fixo (sem edição livre) e é o que aparece no slide final do .pptx.
- Voos: os trechos (companhia aérea, nº do voo, aeroportos com nome da cidade, horários, duração, direção ida/volta) agora são sempre estruturados pela IA — a partir do texto digitado e/ou da imagem de comprovante — em vez de só quando havia imagem anexada. Prompt bump para v6.
- Circuito com múltiplas cidades: novo slide "Valor do pacote" (valor total + tipo de valor/moeda), exibido sempre entre Inclusões e Hotéis quando `general.isCircuit` é `true`. Antes, o valor informado na seção 01 (`packagePriceTotal`) não aparecia em nenhum slide — os cards de hotel no modo circuito escondem o preço por hotel (correto), mas nada o substituía. Padrão de exibição definido com o cliente (BV Group) via feedback de uso real.
- Interface: logo oficial da SNOW (`public/branding/logo-snow.png`) agora aparece por padrão no painel branco do `Hero`, em todas as telas do app (Novo orçamento, Orçamentos, Detalhe do orçamento, Gerando orçamento, Minha conta, Administração) — antes era só um placeholder de texto "LOGO SNOW".
- Orçamentos: consultor só visualiza na listagem os orçamentos que ele mesmo criou (reforçado pela RLS de `quotes`, já existente). Admin ganhou um filtro "Visibilidade" na listagem, com "Apenas as minhas" (padrão) ou "Todas as cotações", para poder ver os orçamentos de outros consultores quando necessário.

### Corrigido
- Inclusões: quando todas as inclusões cabem sozinhas em 1 slide (até 8 itens) mas não sobra espaço para o bloco "O destino" junto, elas deixam de ser divididas entre 2 slides — agora ficam todas juntas em 1 slide, com "O destino" ocupando um slide próprio (mais estético que dividir as inclusões artificialmente). Antes, por exemplo, 4 inclusões ficavam espalhadas em 2 slides (2+2) sem necessidade. Preferência relatada pelo cliente (Primus Turismo).
- Hotéis: card de acomodação cujo texto no formulário foi preenchido só com o valor (ex. "R$ 34.814,20", sem o separador "Tipo | Valor") exibia esse valor no lugar do tipo de quarto e, abaixo, "Consulte valores" sem sentido — o parser agora reconhece que o texto já é, sozinho, um valor monetário e o trata como preço; o card deixou de mostrar o campo "tipo de quarto" vazio nesse caso. Reportado pelo cliente (Primus Turismo).
- Inclusões: corrigida duplicação da última inclusão entre dois slides quando o número de inclusões não cabia inteiro na última página (ex.: 7 inclusões — a 7ª aparecia tanto na página cheia quanto, de novo, na página com o bloco "O destino"). Causa: erro no cálculo de quantas inclusões ficavam reservadas para a última página, que sempre resultava em 1 quando o limite de linhas com o bloco "destino" também era 1. A paginação agora nunca duplica nem omite itens, e continua otimizando para o menor número de slides possível.
- Orçamentos: corrigido build de produção quebrado (`Next.js encountered uncached or runtime data during prerendering`) causado pela leitura do papel do usuário direto no Server Component de `/orcamentos` — isolada em subcomponente dentro de `<Suspense>`, mesmo padrão já usado nas demais páginas autenticadas.
- Upload de imagem (logo da agência, imagem de voo): erros agora mostram a mensagem real do problema (formato inválido, tamanho excedido, imagem corrompida, falha no Storage) via toast, em vez de sempre "Não foi possível enviar o arquivo. Tente novamente." — o usuário não tinha como saber o motivo real da falha.
- Voos: cards de trecho (ida/volta) agora têm altura dinâmica e cabem sempre numa única página por direção, sem paginar nem duplicar o último trecho quando há várias conexões.
- Hotéis: a foto do hotel não sobrepõe mais o badge/texto da coluna da direita (largura da caixa de foto excedia o início da coluna em 0,216").
- Programação dia a dia: estimativa de altura por dia recalibrada e fonte compacta para descrições muito longas — reduz o número de páginas mantendo a ordem cronológica (ex.: um roteiro real de 8 dias caiu de 6 para 4 páginas).
- Formulário: checkbox "Incluir slide de voos" (e demais campos lidos via `watch()` no corpo do componente) deixavam de refletir o clique até outro evento forçar um re-render — causado por incompatibilidade entre `watch()` do React Hook Form e o React Compiler (ativo por padrão no Next.js 16). Corrigido trocando para `useWatch`.
- Leitura de orçamentos já gerados antes da mudança de voos estruturados (sem o campo novo no `aiOutput`) voltou a funcionar — a listagem quebrava com erro de validação Zod.

### Adicionado
- **Produto Cruzeiro (M11)**: segundo tipo de orçamento, ao lado do terrestre existente, reaproveitando toda a infraestrutura pós-M10 (auth, listagem, status, rate limit, auditoria, consumo). Formulário próprio (agência/cruzeiro, capa, roteiro, navio, cabines e tarifas, pagamento, incluído/não incluído/opcionais, rodapé, gerar) e builder PPTX dedicado (capa, resumo da viagem, roteiro dia a dia, galeria de portos de escala, perfil do navio pesquisado pela IA, experiência a bordo, cabines, incluído/não incluído/opcionais, pagamento/rodapé). Prompt próprio versionado (`prompt_versions.product_type`), independente do histórico v1-v6 do terrestre. Seletor de tipo ao criar um novo orçamento, com opção de trocar o tipo antes de preencher dados reais.

### Corrigido
- Cruzeiro: o slide "O que está incluído" (seção 07, opcional) era gerado mesmo sem nenhum item preenchido em incluído/não incluído/opcionais, mostrando "Nenhum item informado." nas três colunas — agora o slide é omitido por completo quando a seção não foi preenchida. Reportado pelo cliente (Primus Turismo) num teste do orçamento Mediterrâneo Ocidental.
- Cruzeiro: upload de foto por cabine (seção 05) adicionado ao formulário — o campo já existia no schema mas nunca era exibido na UI nem lido pelo builder, então o slide "Cabines e tarifas" sempre mostrava o placeholder "Foto da cabine", mesmo quando uma foto fazia sentido ser anexada. Diferente de navio/porto/destino, não há busca automática de foto de cabine (não existe fonte pública de imagens por categoria de cabine) — só o upload manual. Reportado pelo cliente (Primus Turismo) no mesmo teste.
- Build quebrava ao abrir a listagem de orçamentos (`/orcamentos`) logo após login: um módulo `server-only` (`prompt-version.schema.ts`) foi importado por valor em componentes client (listagem, seletor de tipo, autosave) ao adicionar o badge de tipo de produto — os valores compartilhados (enum e rótulos de tipo) foram movidos para um arquivo próprio sem `server-only` (`product-type.schema.ts`).

## [1.0.0] — 2026-10-08

Fechamento dos marcos M0–M10 (ver [docs/PLAN.md](docs/PLAN.md)): produto completo, dos marcos de setup até testes E2E e deploy em produção.

### Adicionado
- Autenticação e papéis (consultor/admin) via Supabase Auth, com convite por e-mail e recuperação de senha.
- Formulário de orçamento completo (seções 01–09), com modo "Circuito com múltiplas cidades".
- Persistência real com Supabase (Postgres + Storage), autosave de rascunho, histórico, duplicação.
- Geração de conteúdo por IA (OpenAI), com prompt versionado e editável só por admin.
- Builder de .pptx determinístico (PptxGenJS), com tema extraído dinamicamente da logo da agência.
- Telas de admin: usuários, versionamento de prompt, identidade visual, consumo de IA (tokens/custo/auditoria).
- Rate limit de geração e registro de auditoria por geração.
- Suíte Playwright cobrindo o fluxo crítico (login → criar → gerar → baixar) e permissões.
