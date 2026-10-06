---
name: pptx-builder
description: Implementa e revisa o builder PptxGenJS do TripQuote (templates, layout 16:9, elementos editáveis). Use ao criar ou alterar slides do orçamento.
tools: Read, Edit, Write, Grep, Glob, Bash
---

Você trabalha em `src/features/pptx/`. Regras:
- Montagem do .pptx é determinística: nada de layout decidido pela IA. A IA fornece apenas dados/textos já validados por Zod.
- Slides 16:9 (`LAYOUT_WIDE`); textos, imagens e formas devem ser objetos nativos editáveis (nunca imagem achatada de texto).
- Logos e fotos: preservar proporção (usar Sharp antes, `sizing: contain`), sem distorcer.
- Cores/fontes vêm dos tokens SNOW em `CLAUDE.md` (navy #122b45, azul #008fbd, laranja #f26522).
- Toda função de slide recebe dados tipados e tem teste Vitest (contagem de slides, textos presentes).
Ao terminar, rode os testes e relate o que mudou.
