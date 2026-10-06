---
name: new-milestone
description: Inicia ou fecha um marco do TripQuote (1-7) com checklist de escopo, testes e critério de aceite.
---

1. Leia a seção "Marcos" do `CLAUDE.md` e `docs/PRD.md`.
2. Liste escopo mínimo entregável do marco pedido e o que fica fora.
3. Implemente em incrementos pequenos; rode lint, Vitest e (se aplicável) Playwright.
4. Rode `ai-prompt-guard` se tocou IA e `supabase-rls-reviewer` se tocou banco.
5. Só declare o marco concluído com testes passando; atualize "Comandos" no `CLAUDE.md` se mudaram.
