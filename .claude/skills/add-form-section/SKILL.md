---
name: add-form-section
description: Adiciona ou altera uma seção do formulário de orçamento (schema Zod, UI, persistência, mapeamento para o builder).
---

1. Defina/atualize o schema Zod em `src/features/quotes/` (fonte dos tipos).
2. Crie o componente da seção (shadcn, numeração "NN Título" em laranja) reutilizando campos existentes.
3. Persista via Server Action validando com o schema; atualize migration se houver nova coluna (use skill `db-migration`).
4. Exponha o dado ao orquestrador de IA e ao builder PPTX apenas via tipos validados.
5. Adicione teste do schema (Vitest).
Seções de referência: 01 Dados gerais, 02 Capa, 03 Inclusões, 04 Hotéis, 05 Voos e serviços, 06 Programação, 07 Pagamento, 08 Rodapé.
