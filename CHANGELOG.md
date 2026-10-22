# Changelog

Todas as mudanças relevantes do TripQuote (SnowQuote) a partir do fechamento dos marcos M0–M10 (ver [docs/PLAN.md](docs/PLAN.md) para o histórico de construção do produto).

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [Unreleased]

### Adicionado
- Voos: os trechos (companhia aérea, nº do voo, aeroportos com nome da cidade, horários, duração, direção ida/volta) agora são sempre estruturados pela IA — a partir do texto digitado e/ou da imagem de comprovante — em vez de só quando havia imagem anexada. Prompt bump para v6.
- Circuito com múltiplas cidades: novo slide "Valor do pacote" (valor total + tipo de valor/moeda), exibido sempre entre Inclusões e Hotéis quando `general.isCircuit` é `true`. Antes, o valor informado na seção 01 (`packagePriceTotal`) não aparecia em nenhum slide — os cards de hotel no modo circuito escondem o preço por hotel (correto), mas nada o substituía. Padrão de exibição definido com o cliente (BV Group) via feedback de uso real.
- Interface: logo oficial da SNOW (`public/branding/logo-snow.png`) agora aparece por padrão no painel branco do `Hero`, em todas as telas do app (Novo orçamento, Orçamentos, Detalhe do orçamento, Gerando orçamento, Minha conta, Administração) — antes era só um placeholder de texto "LOGO SNOW".
- Orçamentos: consultor só visualiza na listagem os orçamentos que ele mesmo criou (reforçado pela RLS de `quotes`, já existente). Admin ganhou um filtro "Visibilidade" na listagem, com "Apenas as minhas" (padrão) ou "Todas as cotações", para poder ver os orçamentos de outros consultores quando necessário.

### Corrigido
- Orçamentos: corrigido build de produção quebrado (`Next.js encountered uncached or runtime data during prerendering`) causado pela leitura do papel do usuário direto no Server Component de `/orcamentos` — isolada em subcomponente dentro de `<Suspense>`, mesmo padrão já usado nas demais páginas autenticadas.
- Upload de imagem (logo da agência, imagem de voo): erros agora mostram a mensagem real do problema (formato inválido, tamanho excedido, imagem corrompida, falha no Storage) via toast, em vez de sempre "Não foi possível enviar o arquivo. Tente novamente." — o usuário não tinha como saber o motivo real da falha.
- Voos: cards de trecho (ida/volta) agora têm altura dinâmica e cabem sempre numa única página por direção, sem paginar nem duplicar o último trecho quando há várias conexões.
- Hotéis: a foto do hotel não sobrepõe mais o badge/texto da coluna da direita (largura da caixa de foto excedia o início da coluna em 0,216").
- Programação dia a dia: estimativa de altura por dia recalibrada e fonte compacta para descrições muito longas — reduz o número de páginas mantendo a ordem cronológica (ex.: um roteiro real de 8 dias caiu de 6 para 4 páginas).
- Formulário: checkbox "Incluir slide de voos" (e demais campos lidos via `watch()` no corpo do componente) deixavam de refletir o clique até outro evento forçar um re-render — causado por incompatibilidade entre `watch()` do React Hook Form e o React Compiler (ativo por padrão no Next.js 16). Corrigido trocando para `useWatch`.
- Leitura de orçamentos já gerados antes da mudança de voos estruturados (sem o campo novo no `aiOutput`) voltou a funcionar — a listagem quebrava com erro de validação Zod.

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
