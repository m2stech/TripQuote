# TripQuote — briefing do projeto

Aplicação web autenticada que gera orçamentos de turismo (B2B, operadora SNOW → agências) em **.pptx editável 16:9** usando IA. Evolui o protótipo `Prompt_orcamento_SNOW.html`, eliminando a necessidade de o usuário ver/copiar o prompt. PRD completo: [docs/PRD.md](docs/PRD.md).

Fluxo: login → preenche formulário → anexa arquivos (logos, imagem de voo) → solicita geração → backend chama OpenAI → PptxGenJS monta o .pptx → download.

Personas: **Consultor** (usuário principal, cria orçamentos), **Admin** (usuários, permissões, prompt versionado, identidade visual, consumo de IA). A agência só recebe o arquivo.

Telas de admin implementadas em `src/app/admin/`: usuários, prompts (versionamento), identidade-visual (branding), consumo (uso de IA + preço por modelo). Acesso via convite (`/convite`) criado pelo admin; usuário define senha e pode recuperá-la depois (`/recuperar-senha` → e-mail → `/redefinir-senha`), fluxo em `src/features/auth/`.

## Stack

Next.js (App Router) · React · TypeScript (strict) · Node.js · Tailwind CSS · shadcn/ui · React Hook Form + Zod resolver · Supabase (Auth, Postgres, Storage) · OpenAI SDK · PptxGenJS · node-vibrant (extração de cor da logo) · Zod · Sharp · Vitest · Playwright · deploy Vercel.

Sentry está no PRD e planejado para o M9, mas **ainda não implementado** (sem dependência no `package.json`, sem uso em `src/`) — não tratar como já ativo.

## Regras de arquitetura (não negociáveis)

- **Prompt e chamadas à OpenAI só no backend** (Route Handlers / Server Actions, módulos com `server-only`). Nunca enviar o prompt, regras internas ou chaves ao client.
- **IA interpreta e redige; não monta o arquivo.** O .pptx é gerado de forma determinística com PptxGenJS (templates e layout em código). Textos, imagens e formas devem permanecer editáveis.
- **Zod em toda fronteira**: formulário, APIs, e resposta estruturada da IA (nunca confiar em JSON cru do modelo). Tipos derivados dos schemas.
- **Supabase RLS** por usuário e papel (consultor vs admin). `SUPABASE_SERVICE_ROLE_KEY` apenas server-side.
- **Status da geração** explícito: `draft` (Rascunho) → `processing` → `done` (Concluído) | `error`. UI deve refletir progresso; geração é assíncrona/lenta.
- **Por geração, registrar**: modelo, tokens, custo estimado, versão do prompt, usuário e data (auditoria).
- **Prompts versionados em tabela** (`prompt_versions`), editáveis só por admin; cada orçamento guarda a versão usada. Versionar = nova migration que desativa a versão anterior e insere a nova (condicionado a existir um admin) — nunca `UPDATE` numa versão já usada por orçamentos existentes. Hoje em v6 (histórico: v1 base → v2 foto do destino → v3 atrativos do destino → v4 fallback de voo via imagem → v5 modo Circuito → v6 voos sempre estruturados pela IA, texto digitado e/ou imagem). Ao adicionar campo novo à resposta da IA (`generationOutputSchema`), migrar registros antigos no `aiOutput` na leitura (`quote.schema.ts`), já que orçamentos já gerados não têm o campo novo.
- **Preços de modelo de IA também versionados em tabela** (`model_pricing`, migration `20261014000000`), mesmo padrão: RLS leitura para todos, escrita só admin — não mais constante hardcoded.
- **Rate limit de geração**: 20 gerações/hora por usuário (`src/features/usage/rate-limit/generation-rate-limit.ts`), contabilizado pela tabela `generations`.
- **Buckets de Storage separados por tipo de arquivo**, cada um com RLS fail-closed via função `owns_quote_storage_object`: `agency-logos`, `flight-images` (M5) e `generated-pptx` (M7 — único com policy de `UPDATE`, pois sobrescreve o mesmo path a cada geração).
- Imagens/logos: preservar integridade visual (Sharp para normalizar, sem distorcer proporção).
- PDF é futuro; não implementar agora.

## Estrutura de pastas

```
src/
  app/
    (auth)/login|convite|recuperar-senha|redefinir-senha/
    auth/confirm/              # callback de confirmação de e-mail (Supabase)
    (app)/orcamentos/          # lista, novo, [id], gerar, duplicar
    (app)/minha-conta/
    admin/                     # usuarios, prompts, identidade-visual, consumo
    api/quotes/[id]/pptx/      # download do .pptx gerado
    design/                    # showcase interno do design system
  components/ui/               # shadcn
  components/                  # componentes de domínio compartilhados
  features/                    # cada módulo com subpastas por camada:
                                # actions|components|repository|schemas (+ specifics abaixo)
    auth/                       # login, logout, reset/convite de senha
    quotes/                     # formulário, attachments, hooks (autosave), repository
    ai/                         # client, orchestration, pricing, vision (extração de imagem de voo)
    pptx/                       # build-quote-presentation, slides/, images/, theme/ (tema por logo)
    prompts/                    # leitura/versionamento (server-only)
    branding/                   # logos e ativos da agência, storage
    usage/                      # tokens/custo/auditoria, rate-limit/, model-pricing
    users/                      # gestão de usuários (admin)
  lib/{supabase,auth,validation,utils}/
supabase/migrations/            # SQL + políticas RLS
scripts/seed-users.ts           # seed de usuários de teste/dev via Admin API do Supabase
tests/{unit,e2e}/
docs/PRD.md
```

## Convenções

- Código, nomes e commits em **inglês**; textos de UI, mensagens e erros em **pt-BR**.
- TS strict, sem `any`; Server Components por padrão, `"use client"` só quando necessário.
- Sem segredos no repo: `.env.local` (`OPENAI_API_KEY`, `OPENAI_BASE_URL` opcional/só e2e — aponta o SDK a um mock local em vez da API real, `GOOGLE_PLACES_API_KEY` opcional, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` — base do link nos e-mails de convite/recuperação de senha); manter `.env.example`.
- Vitest para builder PPTX, schemas e lógica de custo (1 arquivo de teste por módulo de feature); Playwright para o fluxo crítico (login → criar → gerar → baixar), com mock local da API da OpenAI (`tests/e2e/mock-ai-server.ts`, via `OPENAI_BASE_URL`) para rodar e2e sem custo/chamadas reais.
- Validar cada marco antes de iniciar o próximo.

## Identidade visual (extraída de `Prompt_orcamento_SNOW.html`)

Referência de cores, organização e experiência — **não** copiar o HTML literalmente; reimplementar com Tailwind + shadcn mapeando os tokens para variáveis CSS do tema.

| Token | Valor | Uso |
|---|---|---|
| navy | `#122b45` | texto, títulos |
| blue | `#008fbd` | ação primária |
| orange | `#f26522` | CTA "Gerar", números de seção |
| bg | `#f3f7fa` | fundo da página |
| line | `#d9e4eb` | bordas de card |
| hero | `#102b43 → #175171` (115°) | cabeçalho com logo SNOW sobre fundo branco, raio 10px |
| muted | `#5c7180` | texto de apoio |

- Fonte: `system-ui, Arial, sans-serif`, base 15px/1.5.
- Cards brancos, raio 15px, borda `line`, sombra `0 7px 24px #102b4310`. Inputs raio 9px, borda `#c7d8e2`.
- Seções numeradas ("**01** Dados gerais") com número em laranja.
- Botões: primário azul; secundário `#e4f3f8`/`#075775`; remover `#fff0e9`/`#a8491c`; gerar laranja 16px. Avisos `#fff5e9` com borda `#f6d8b9`. Blocos fixos/informativos: fundo `#f0f7fa` + borda esquerda 4px azul.
- Layout: container máx. 1050px; grid de 2 colunas → 1 coluna em ≤650px.

A tabela acima é a identidade visual **da interface do app** (fixa, SNOW). O **.pptx gerado** é diferente: o tema (títulos, cards de destaque) é extraído dinamicamente da logo da agência enviada (ver `src/features/pptx/theme/extract-theme.ts`); se a cor extraída não tiver contraste suficiente para leitura, cai no fallback azul/branco (`DEFAULT_THEME`).

## Seções do formulário a preservar

01 Dados gerais (agência, consultor, destino, datas, base do orçamento, moeda, tipo de valor, base de acomodação, modo "Circuito com múltiplas cidades" + valor total do pacote quando ativo) · 02 Capa · 03 Inclusões (opcional) · 04 Hotéis (campo "Cidade" por hotel quando circuito ativo — hotéis passam a representar etapas sequenciais do roteiro, não opções alternativas) · 05 Voos e serviços (opcional) · 06 Programação dia a dia (opcional) · 07 Pagamento fixo · 08 Rodapé institucional · 09 Gerar. A logo da agência e a imagem de voo passam a ser **uploads** (no protótipo eram anexadas manualmente na IA). Apenas 01 Dados gerais e 04 Hotéis são obrigatórios para gerar.

## Marcos

Plano detalhado (branches, entregas e commits) em [docs/PLAN.md](docs/PLAN.md). Ordem: M0 setup → M1–M3 interface (mock) → M4–M5 Supabase e persistência → M6 IA → M7 PPTX → M8 admin → M9 consumo/auditoria/Sentry → M10 e2e e deploy.

## Comandos

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (Next.js) |
| `npm run build` | Build de produção |
| `npm run start` | Serve o build de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest (execução única); `npm run test:watch` para modo watch |
| `npm run format` / `format:check` | Prettier (escrever / verificar) |
| `npm run e2e` | Playwright |
| `npm run db:seed` | Cria usuários de teste (consultor/admin) via Admin API do Supabase (`scripts/seed-users.ts`) |
| `npm run db:types` | Gera os types TS do schema Supabase (`src/lib/supabase/types.ts`) |

Requer Node >= 22. Copie `.env.example` para `.env.local` e preencha as variáveis.
