# TripQuote — Plano de execução

Baseado em [CLAUDE.md](../CLAUDE.md) e [PRD.md](PRD.md). Ordem: **setup → interface (com dados mockados) → backend → IA → PPTX → admin → qualidade → deploy**.

## Regras de execução

- Um milestone = uma branch a partir de `main`, mergeada só após os testes do milestone passarem (PRD §7).
- Commits em inglês (Conventional Commits). O **commit final** de cada milestone é o listado abaixo; commits intermediários são livres.
- Marque os checkboxes `[x]` conforme as entregas forem concluídas.
- Até o M5 a UI usa dados mockados atrás de uma camada de acesso (`features/quotes/repository`), trocada por Supabase no M5 sem reescrever telas.
- Agentes úteis: `ui-snow` (M1–M3), `supabase-rls-reviewer` (M4, M5, M8), `ai-prompt-guard` (M6, M9), `pptx-builder` (M7).

## Visão geral

| # | Milestone | Branch | Foco |
|---|---|---|---|
| M0 | Setup do projeto | `chore/m0-setup` | Repo, Next, tooling, CI |
| M1 | Design system SNOW | `feat/m1-design-system` | Tema, shadcn, layout base |
| M2 | Formulário de orçamento (UI) | `feat/m2-quote-form-ui` | Seções 01–09, Zod, rascunho local |
| M3 | Telas de gestão (UI) | `feat/m3-quote-screens-ui` | Lista, detalhe, status, login, admin (mock) |
| M4 | Supabase: auth e banco | `feat/m4-supabase-auth-db` | Auth, schema, RLS, papéis |
| M5 | Persistência e uploads | `feat/m5-persistence-uploads` | CRUD real, histórico, duplicar, Storage, Sharp |
| M6 | Geração por IA | `feat/m6-ai-generation` | Prompt no backend, OpenAI, status |
| M7 | Builder PPTX | `feat/m7-pptx-builder` | PptxGenJS, download |
| M8 | Admin | `feat/m8-admin` | Usuários, prompts versionados, branding |
| M9 | Consumo, auditoria e observabilidade | `feat/m9-usage-audit-sentry` | Tokens/custo, auditoria, Sentry |
| M10 | Testes E2E e deploy | `feat/m10-e2e-deploy` | Playwright, Vercel, produção |

---

## M0 — Setup do projeto

**Branch:** `chore/m0-setup`
**Objetivo:** repositório e tooling prontos para desenvolver.

- [x] `git init`, branch `main`, `.gitignore` (inclui `.env*`, `node_modules`, `.next`)
- [x] Mover o protótipo `Prompt_orcamento_SNOW.html` para `docs/reference/` (referência visual)
- [x] Criar app Next.js (App Router) + TypeScript strict + Tailwind
- [x] Estrutura de pastas conforme CLAUDE.md (`src/features`, `src/lib`, `tests/`)
- [x] ESLint + Prettier + script `typecheck`
- [x] Vitest configurado com um teste de fumaça
- [x] `.env.example` com as variáveis do CLAUDE.md (sem valores)
- [x] Preencher a seção "Comandos" do CLAUDE.md
- [x] GitHub Actions: lint, typecheck, test em PR

**Aceite:** `dev`, `build`, `lint`, `typecheck`, `test` rodam limpos.
**Commit final:** `chore: bootstrap Next.js project with tooling and CI`

## M1 — Design system SNOW

**Branch:** `feat/m1-design-system`
**Objetivo:** identidade visual do protótipo reproduzida em Tailwind + shadcn.

- [x] Inicializar shadcn/ui
- [x] Tokens SNOW (navy, azul, laranja, bg, line, muted) como variáveis CSS do tema; fonte system-ui, base 15px
- [x] Raios (9px inputs, 15px cards), sombra de card, container 1050px
- [x] Componentes base: Button (primário, secundário, remover, gerar/laranja), Input, Textarea, Select, Checkbox, Label, Card, Badge, Alert/aviso, Dialog, Toast
- [x] Componente `SectionCard` com número laranja ("01 Título")
- [x] Hero com logo SNOW e gradiente `#102b43 → #175171`
- [x] Layout base responsivo (grid 2 colunas → 1 em ≤650px)
- [x] Página `/design` (apenas dev) listando os componentes

**Aceite:** comparação visual lado a lado com o protótipo; responsivo em 375px e desktop.
**Commit final:** `feat(ui): add SNOW design system on Tailwind and shadcn`

## M2 — Formulário de orçamento (UI)

**Branch:** `feat/m2-quote-form-ui`
**Objetivo:** todas as seções do protótipo funcionando no front, sem backend.

- [x] Schemas Zod em `features/quotes` (fonte dos tipos)
- [x] 01 Dados gerais (agência, consultor, destino, datas, base, moeda, tipo de valor, acomodação)
- [x] 02 Capa
- [x] 03 Inclusões
- [x] 04 Hotéis (lista dinâmica: adicionar/remover)
- [x] 05 Voos e serviços, com área de upload da imagem de voo (UI apenas)
- [x] 06 Programação dia a dia (opcional)
- [x] 07 Pagamento fixo
- [x] 08 Rodapé institucional
- [x] 09 Gerar: resumo, validação e botão "Gerar orçamento" (sem ação real; **sem exibir prompt**)
- [x] Upload de logo da agência (UI com pré-visualização)
- [x] Validação inline com mensagens em pt-BR
- [x] Rascunho em `localStorage` (provisório, removido no M5)
- [x] Testes Vitest dos schemas
- [x] Merge em `main`

**Aceite:** formulário completo, validado e responsivo; nenhum texto de prompt no front.
**Commit final:** `feat(quotes): add quote form UI with Zod validation`

## M3 — Telas de gestão (UI)

**Branch:** `feat/m3-quote-screens-ui`
**Objetivo:** demais telas navegáveis com dados mockados.

- [x] Camada `features/quotes/repository` com implementação mock
- [x] Login (UI) e layout autenticado com navegação
- [x] Lista de orçamentos com busca e filtros (status, destino, período)
- [x] Detalhe do orçamento, com ações Duplicar, Editar e Regenerar
- [x] Badges de status: Rascunho, Processando, Concluído, Erro
- [x] Tela de progresso da geração (estados loading/erro/sucesso)
- [x] Esqueleto das telas admin: usuários, prompts, identidade visual, consumo
- [x] Estados vazios e de erro em todas as telas

**Aceite:** fluxo completo navegável com mocks, em desktop e mobile.
**Commit final:** `feat(ui): add quote management and admin screens with mock data`

## M4 — Supabase: autenticação e banco

**Branch:** `feat/m4-supabase-auth-db`
**Objetivo:** auth real, schema e RLS.

- [x] Projeto Supabase e CLI local; `supabase/migrations/`
- [x] Supabase Auth (e-mail/senha) com `@supabase/ssr`; middleware protegendo `(app)` e `admin`
- [x] Login/logout reais; login conectado à UI do M3
- [x] Tabelas: `profiles` (papel consultor/admin), `quotes`, `quote_attachments`, `prompt_versions`, `generations`, `audit_log`
- [x] Políticas RLS: consultor acessa só os próprios registros; admin gerencia tudo; `prompt_versions` apenas admin
- [x] Seed de usuários de teste
- [x] Tipos do banco gerados
- [x] Revisão com `supabase-rls-reviewer`

**Aceite:** usuário A não lê dados do usuário B; rota admin bloqueada para consultor.
**Commit final:** `feat(db): add Supabase auth, schema and RLS policies`

## M5 — Persistência e uploads

**Branch:** `feat/m5-persistence-uploads`
**Objetivo:** trocar o mock por dados reais.

- [x] Repository Supabase substituindo o mock (mesma interface)
- [x] Server Actions: criar, atualizar, excluir e duplicar orçamento, validadas com Zod
- [x] Histórico, busca e filtros no servidor
- [x] Buckets privados no Storage (logos, anexos de voo) com políticas por dono
- [x] Upload com validação de tipo e tamanho; normalização com Sharp preservando proporção
- [x] Remover rascunho em `localStorage`; autosave de rascunho no banco
- [x] Testes Vitest da lógica de repositório e das actions
- [x] Revisão com `supabase-rls-reviewer`
- [x] Merge em `main`

**Aceite:** criar, editar, duplicar e listar orçamentos reais, com anexos persistidos e isolados por usuário.
**Commit final:** `feat(quotes): persist quotes and attachments with Supabase`

## M6 — Geração por IA

**Branch:** `feat/m6-ai-generation`
**Objetivo:** orquestração com a OpenAI inteiramente no backend.

- [x] Módulos `server-only` em `features/ai` e `features/prompts`
- [x] Prompt migrado do protótipo para `prompt_versions` (nunca no client; seed via migration)
- [x] Composição do prompt a partir dos dados do orçamento
- [x] Interpretação da imagem de voo (visão) → dados estruturados
- [x] Schema Zod da resposta da IA com `safeParse`, com retry e tratamento de falha
- [x] Rota/Server Action de geração: status `draft → processing → done | error`
- [x] Execução síncrona na Server Action, com `maxDuration` alto (sem polling/Realtime neste marco — decisão registrada no plano do M6)
- [x] Gravar em `generations`: modelo, tokens, custo estimado, versão do prompt; auditoria em `audit_log`
- [x] Nova coluna `quotes.ai_output` (saída estruturada da IA, separada do `form` do usuário)
- [x] Testes Vitest com OpenAI mockada
- [x] Revisão com `ai-prompt-guard` (achado crítico de bundling client corrigido: schema do output da IA movido para fora de `features/ai`)
- [x] Merge em `main`

**Aceite:** gerar produz conteúdo estruturado válido; prompt e chave ausentes do bundle do client e de qualquer resposta de API.
**Commit final:** `feat(ai): add server-side OpenAI generation with status tracking`

## M7 — Builder PPTX

**Branch:** `feat/m7-pptx-builder`
**Objetivo:** gerar o .pptx editável de forma determinística.

- [x] `features/pptx`: templates e layout 16:9 (`LAYOUT_WIDE`) com tokens SNOW
- [x] Slides: capa, destino, hotéis, voos, serviços/inclusões, programação (opcional), pagamento, rodapé institucional
- [x] Logos da agência e institucional com proporção preservada (Sharp)
- [x] Textos, imagens e formas nativos e editáveis (sem texto rasterizado)
- [x] Salvar arquivo no Storage e registrar em `quotes`; rota de download autenticada
- [x] Integração com o fluxo do M6: `done` disponibiliza o download
- [x] Fontes determinísticas de foto real (Wikipedia para destino, Google Places para hotéis), com fallback para a URL citada pela IA, retry e placeholder
- [x] Testes Vitest (nº de slides, textos presentes, quebra de conteúdo longo) e abertura manual no PowerPoint
- [x] Revisão com `pptx-builder`

**Aceite:** orçamento ponta a ponta gera um .pptx que abre e edita sem erros no PowerPoint.
**Commit final:** `feat(pptx): add deterministic PptxGenJS builder and download`

## M8 — Admin

**Branch:** `feat/m8-admin`
**Objetivo:** governança da operadora.

- [x] Gestão de usuários: convidar, ativar/desativar, alterar papel
- [x] Editor de prompt com versionamento: nova versão, ativar, histórico e restauração
- [x] Gestão de identidade visual: logos institucionais e ativos
- [x] Configurações da empresa
- [x] Todas as rotas e actions admin com checagem de papel no servidor
- [x] Testes de autorização (consultor recebe 403)
- [x] Revisão com `supabase-rls-reviewer` e `ai-prompt-guard`
- [x] Fluxo de primeiro acesso: página `/convite` (callback do link de convite do Supabase) onde o usuário define a própria senha — sem senha temporária em texto claro no e-mail
- [x] Recuperação de senha: link "Esqueci minha senha" no login, página de solicitação e página de redefinição (callback do Supabase)
- [x] Menu "Minha conta": troca de senha pelo próprio usuário autenticado
- [x] Templates de e-mail do Supabase (convite, recuperação de senha) com identidade SNOW, aplicados via Management API

**Aceite:** admin altera o prompt e a próxima geração usa a nova versão; consultor não acessa nada de admin; usuário convidado define a própria senha pelo link do e-mail e consegue trocá-la depois de logado; "esqueci minha senha" funciona ponta a ponta.
**Commit final:** `feat(admin): add user, prompt versioning and branding management`

## M9 — Consumo e auditoria

**Branch:** `feat/m9-usage-audit`
**Objetivo:** controle de custo e rastreabilidade.

- [x] Tabela `model_pricing` (preço por 1M tokens, por modelo), editável pelo admin, substituindo a tabela hardcoded de `estimate-cost.ts`
- [x] Painel de consumo (por usuário, período, orçamento) com exportação CSV
- [x] Tela de auditoria para admin, com filtros (lendo `audit_log`, já alimentada desde M4–M8)
- [x] Rate limit por usuário na geração (janela de tempo simples sobre `generations`, limite configurável)
- [x] Testes Vitest do cálculo de custo e do rate limit
- [x] Revisão com `ai-prompt-guard`

**Fora de escopo por decisão (não essencial ao funcionamento do produto; revisitar depois se necessário):** Sentry, limite de upload diferenciado por tipo de anexo (mantém 5 MB único já existente).

**Aceite:** cada geração aparece no painel com modelo, tokens e custo; admin ajusta preços sem deploy; auditoria consultável com filtros; geração acima do limite por hora é bloqueada com mensagem clara.
**Commit final:** `feat(usage): add AI usage tracking, pricing management and audit view`

## M10 — Testes E2E e deploy

**Branch:** `feat/m10-e2e-deploy`
**Objetivo:** validar o fluxo crítico e publicar.

- [ ] Playwright: login → criar orçamento → anexar → gerar (OpenAI mockada) → baixar
- [ ] Playwright: permissões (consultor × admin) e duplicar orçamento
- [ ] Revisão de segurança (`security-review`) e checagem de RLS
- [ ] Projeto Vercel vinculado; variáveis de ambiente por ambiente
- [ ] Projeto Supabase de produção e migrations aplicadas
- [ ] Deploy de preview e verificação; depois produção
- [ ] Domínio e Sentry de produção
- [ ] README com setup e runbook básico
- [ ] Smoke test em produção com geração real

**Aceite:** E2E verde no CI; geração real em produção gera um .pptx válido.
**Commit final:** `chore: add Playwright e2e suite and production deployment config`
