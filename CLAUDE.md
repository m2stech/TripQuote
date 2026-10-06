# TripQuote — briefing do projeto

Aplicação web autenticada que gera orçamentos de turismo (B2B, operadora SNOW → agências) em **.pptx editável 16:9** usando IA. Evolui o protótipo `Prompt_orcamento_SNOW.html`, eliminando a necessidade de o usuário ver/copiar o prompt. PRD completo: [docs/PRD.md](docs/PRD.md).

Fluxo: login → preenche formulário → anexa arquivos (logos, imagem de voo) → solicita geração → backend chama OpenAI → PptxGenJS monta o .pptx → download.

Personas: **Consultor** (usuário principal, cria orçamentos), **Admin** (usuários, permissões, prompt versionado, identidade visual, consumo de IA). A agência só recebe o arquivo.

## Stack

Next.js (App Router) · React · TypeScript (strict) · Node.js · Tailwind CSS · shadcn/ui · Supabase (Auth, Postgres, Storage) · OpenAI SDK · PptxGenJS · Zod · Sharp · Sentry · Vitest · Playwright · deploy Vercel.

## Regras de arquitetura (não negociáveis)

- **Prompt e chamadas à OpenAI só no backend** (Route Handlers / Server Actions, módulos com `server-only`). Nunca enviar o prompt, regras internas ou chaves ao client.
- **IA interpreta e redige; não monta o arquivo.** O .pptx é gerado de forma determinística com PptxGenJS (templates e layout em código). Textos, imagens e formas devem permanecer editáveis.
- **Zod em toda fronteira**: formulário, APIs, e resposta estruturada da IA (nunca confiar em JSON cru do modelo). Tipos derivados dos schemas.
- **Supabase RLS** por usuário e papel (consultor vs admin). `SUPABASE_SERVICE_ROLE_KEY` apenas server-side.
- **Status da geração** explícito: `draft` (Rascunho) → `processing` → `done` (Concluído) | `error`. UI deve refletir progresso; geração é assíncrona/lenta.
- **Por geração, registrar**: modelo, tokens, custo estimado, versão do prompt, usuário e data (auditoria).
- **Prompts versionados em tabela**, editáveis só por admin; cada orçamento guarda a versão usada.
- Imagens/logos: preservar integridade visual (Sharp para normalizar, sem distorcer proporção).
- PDF é futuro; não implementar agora.

## Estrutura de pastas (proposta)

```
src/
  app/
    (auth)/login/
    (app)/orcamentos/         # lista, novo, [id], histórico, duplicar
    admin/                    # usuários, prompts, identidade visual, consumo
    api/                      # generate, uploads, download
  components/ui/              # shadcn
  components/                 # componentes de domínio compartilhados
  features/
    quotes/                   # formulário, schemas, ações
    ai/                       # cliente OpenAI, orquestração, parsing de anexos
    pptx/                     # builder PptxGenJS, templates, layout
    prompts/                  # leitura/versionamento (server-only)
    branding/                 # logos e ativos SNOW
    usage/                    # tokens/custo/auditoria
  lib/{supabase,openai,validation,utils}/
supabase/migrations/          # SQL + políticas RLS
tests/{unit,e2e}/
docs/PRD.md
```

## Convenções

- Código, nomes e commits em **inglês**; textos de UI, mensagens e erros em **pt-BR**.
- TS strict, sem `any`; Server Components por padrão, `"use client"` só quando necessário.
- Sem segredos no repo: `.env.local` (`OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SENTRY_DSN`); manter `.env.example`.
- Vitest para builder PPTX, schemas e lógica de custo; Playwright para o fluxo crítico (login → criar → gerar → baixar).
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

## Seções do formulário a preservar

01 Dados gerais (agência, consultor, destino, datas, base do orçamento, moeda, tipo de valor, base de acomodação) · 02 Capa · 03 Inclusões · 04 Hotéis · 05 Voos e serviços · 06 Programação dia a dia (opcional) · 07 Pagamento fixo · 08 Rodapé institucional · 09 Gerar. A logo da agência e a imagem de voo passam a ser **uploads** (no protótipo eram anexadas manualmente na IA).

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
| `npm run e2e` | Playwright — a configurar no M10 |

Requer Node >= 22. Copie `.env.example` para `.env.local` e preencha as variáveis.
