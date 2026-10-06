# PROJECT ARCHITECTURE: TripQuote

## 1. CONTEXT & PROBLEM

Atualmente, o processo de criação de orçamentos da SNOW utiliza o arquivo `Prompt_orcamento_SNOW.html` como interface para coleta das informações e geração de um prompt estruturado. Esse prompt ainda precisa ser copiado manualmente pelo usuário e executado em uma ferramenta externa de IA.

Esse fluxo apresenta os seguintes problemas:
- exposição do prompt e das regras internas de geração ao usuário;
- possibilidade de alteração, cópia ou reutilização indevida desse conteúdo;
- dependência de etapas manuais entre preenchimento, geração do prompt e execução na IA;
- maior risco de inconsistência na geração dos orçamentos;
- dificuldade no tratamento de arquivos como logos e imagens com integridade visual;
- necessidade de maior controle e padronização do resultado final.

O TripQuote deverá evoluir o protótipo existente, mantendo a lógica de entrada de dados já presente no `Prompt_orcamento_SNOW.html`, mas eliminando a necessidade de o usuário acessar ou manipular o prompt. A aplicação deverá centralizar o preenchimento das informações e a geração do orçamento por meio de integração com IA, tornando o processo mais seguro, simples e padronizado.

## 2. PROPOSED SOLUTION

Desenvolver o TripQuote como uma aplicação web autenticada para criação automatizada de orçamentos de turismo com IA, evoluindo o fluxo existente no arquivo `Prompt_orcamento_SNOW.html`.

A solução deverá:
- manter uma interface estruturada para preenchimento dos dados do orçamento;
- permitir upload de arquivos, como logos e imagens com informações de voos;
- armazenar e executar o prompt no backend, sem expô-lo ao usuário;
- integrar diretamente com a API da OpenAI para processamento das informações;
- gerar o orçamento final sem necessidade de copiar prompts ou acessar ferramentas externas de IA;
- preservar regras de identidade visual, conteúdo obrigatório e estrutura definida pela SNOW;
- reduzir erros manuais e garantir maior padronização entre os orçamentos produzidos.

O fluxo esperado passa a ser:

Usuário autenticado → Preenche os dados → Anexa arquivos necessários → Solicita geração → TripQuote processa com IA → Orçamento final é disponibilizado ao usuário.

A OpenAI será responsável por interpretar anexos, pesquisar/estruturar conteúdo e gerar textos. A montagem do arquivo PowerPoint será realizada programaticamente pela aplicação utilizando PptxGenJS, seguindo templates e regras determinísticas de layout.

Geração de documento: gerar orçamento final em PowerPoint editável (.pptx), widescreen 16:9, mantendo textos, imagens, formas e demais elementos editáveis. PDF poderá ser incorporado posteriormente como formato adicional.

## 3. FUNCTIONAL REQUIREMENTS

- Login e Autenticação
- Multi usuário
- Upload de Arquivos
- Integrações (API)
- Relatórios e Exportação
- Permissões por usuário
- Busca e Filtros

**Gestão de Orçamentos:** criar, visualizar, consultar histórico, duplicar e eventualmente regenerar um orçamento.

**Geração por IA:** envio estruturado dos dados para a OpenAI, composição automática do prompt e geração do documento sem exposição das instruções internas.

**Gestão do Prompt:** prompt armazenado exclusivamente no backend, com possibilidade de manutenção pelo administrador e, idealmente, versionamento.

**Gestão de Identidade Visual:** logos institucionais, padrões de apresentação e demais ativos necessários para geração dos documentos.

**Processamento de anexos:** permitir que uma imagem contendo informações de voo seja interpretada pela IA e transformada em dados utilizáveis no orçamento.

**Status da geração:** por exemplo, Rascunho, Processando, Concluído e Erro. Geração com IA não é instantânea e fingir que é costuma resultar naquele elegante botão que parece ter travado.

**Registro de consumo da IA:** armazenar modelo utilizado, tokens e custo estimado por geração. Isso será particularmente importante porque o TripQuote utilizará API paga.

**Auditoria básica:** registrar usuário, data, orçamento criado e versão do prompt utilizada.

## 4. USER PERSONAS

### 1. Consultor de Viagens da Operadora
Usuário principal do TripQuote.

Profissional responsável por montar e enviar propostas comerciais para agências de viagem parceiras, dentro de uma operação B2B.

Seu objetivo é transformar informações de viagem, como destino, período, hotéis, voos, serviços e valores, em um orçamento premium, padronizado e visualmente profissional, sem precisar dominar ferramentas de IA ou manipular prompts.

O modelo atual de proposta (exemplo: Orçamento Balneário Camboriú) reúne justamente esses elementos, incluindo apresentação do destino, opções de hospedagem, voos, serviços, condições comerciais e identificação do consultor.

Principais necessidades:
- criar orçamentos com rapidez;
- preencher apenas os dados comerciais necessários;
- anexar logos e informações complementares;
- gerar propostas sem acessar ou alterar o prompt interno;
- manter padrão visual e comercial definido pela operadora;
- baixar e encaminhar o orçamento final à agência.

### 2. Administrador / Gestor da Operadora
Responsável pela administração do TripQuote e pela governança do processo.

Deverá controlar usuários, permissões, configurações da empresa, identidade visual e regras utilizadas na geração dos orçamentos.

Também poderá acompanhar o histórico de propostas, consumo da IA e versões das instruções utilizadas pelo sistema.

### Usuário indireto: Agência de Viagem
A agência não utiliza o TripQuote diretamente, mas é a destinatária do orçamento produzido pela operadora.

O documento entregue deve apresentar a viagem de forma comercial, clara e premium, reunindo produto, hospedagem, transporte e condições de pagamento em uma única proposta.

## 5. TECHNICAL STACK

- Next.js
- React
- Tailwind CSS
- Supabase
- Claude Code
- Node.js
- PostgreSQL
- shadcn/ui
- TypeScript

OpenAI API, OpenAI SDK, PptxGenJS, Supabase Auth, Supabase Storage, Zod, Sharp, Sentry, Vitest e Playwright.

**Application Stack**
- Next.js
- React
- TypeScript
- Node.js
- Tailwind CSS
- shadcn/ui
- Supabase
- PostgreSQL
- OpenAI API / SDK
- PptxGenJS
- Zod
- Sharp
- Sentry
- Vitest
- Playwright
- Vercel

**Development Tooling**
- Claude Code

## 6. DESIGN LANGUAGE

Utilizar o arquivo `Prompt_orcamento_SNOW.html`, presente no framework de desenvolvimento, como referência inicial para identidade visual, organização dos formulários, componentes, cores e experiência de preenchimento.

A nova interface deverá evoluir esse protótipo para uma aplicação responsiva e consistente utilizando Tailwind CSS + shadcn/ui, preservando a identidade visual da SNOW sem necessidade de reproduzir literalmente a implementação HTML existente.

## 7. PROCESS

- Break app build into logical milestones (steps)
- Each milestone should be a deliverable increment
- Prioritize core functionality first, then iterate
- Test each milestone before moving to the next
