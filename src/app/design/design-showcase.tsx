"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Hero } from "@/components/hero";
import { InfoBox } from "@/components/info-box";
import { SectionCard } from "@/components/section-card";
import { TwoColumnGrid } from "@/components/two-column-grid";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/**
 * Página de QA visual do design system SNOW: lista todos os componentes
 * base lado a lado para comparação com o protótipo de referência.
 * Disponível apenas em desenvolvimento (ver `page.tsx`).
 */
export function DesignShowcase() {
  const [checked, setChecked] = useState(false);

  return (
    <main className="bg-background min-h-full pb-16">
      <div className="snow-container flex flex-col gap-8 px-4 pt-6 sm:px-6">
        <Hero
          title="TripQuote"
          subtitle="Design system SNOW — página de comparação visual (apenas dev)"
          logoSlot={<span className="text-snow-navy text-sm font-semibold">LOGO SNOW</span>}
        />

        <InfoBox>
          Esta página existe apenas para validar a implementação dos tokens e componentes SNOW. Ela
          não fica disponível em produção.
        </InfoBox>

        {/* 01 — Cores */}
        <SectionCard
          number={1}
          title="Paleta de cores"
          description="Tokens de identidade visual SNOW."
        >
          <div className="snow-grid-2">
            <ColorSwatch name="navy" varName="--snow-navy" hex="#122b45" textOn="light" />
            <ColorSwatch
              name="blue (primário)"
              varName="--snow-blue"
              hex="#008fbd"
              textOn="light"
            />
            <ColorSwatch name="orange (CTA)" varName="--snow-orange" hex="#f26522" textOn="light" />
            <ColorSwatch name="bg" varName="--snow-bg" hex="#f3f7fa" textOn="dark" />
            <ColorSwatch name="line" varName="--snow-line" hex="#d9e4eb" textOn="dark" />
            <ColorSwatch name="muted" varName="--snow-muted" hex="#5c7180" textOn="light" />
          </div>
        </SectionCard>

        {/* 02 — Botões */}
        <SectionCard
          number={2}
          title="Botões"
          description="Variantes primário, secundário, remover e gerar."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="default">Primário</Button>
            <Button variant="snow-secondary">Secundário</Button>
            <Button variant="snow-remove">Remover</Button>
            <Button variant="snow-generate" size="generate">
              Gerar orçamento
            </Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="default" disabled>
              Desabilitado
            </Button>
          </div>
        </SectionCard>

        {/* 03 — Formulário */}
        <SectionCard
          number={3}
          title="Campos de formulário"
          description="Input, Textarea, Select, Checkbox e Label com raio de 9px."
        >
          <TwoColumnGrid>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="design-input-destino">Destino</Label>
              <Input id="design-input-destino" placeholder="Ex.: Buenos Aires" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="design-select-moeda">Moeda</Label>
              <Select defaultValue="BRL">
                <SelectTrigger id="design-select-moeda" className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">Real (BRL)</SelectItem>
                  <SelectItem value="USD">Dólar (USD)</SelectItem>
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="design-textarea-obs">Observações</Label>
              <Textarea
                id="design-textarea-obs"
                placeholder="Inclusões, condições e demais observações do orçamento..."
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Checkbox id="design-checkbox-cafe" checked={checked} onCheckedChange={setChecked} />
              <Label htmlFor="design-checkbox-cafe">Inclui café da manhã</Label>
            </div>
          </TwoColumnGrid>
        </SectionCard>

        {/* 04 — Badges e estados */}
        <SectionCard
          number={4}
          title="Badges de status"
          description="Rascunho, Processando, Concluído e Erro."
        >
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Rascunho</Badge>
            <Badge className="bg-snow-blue text-white">Processando</Badge>
            <Badge className="bg-emerald-600 text-white">Concluído</Badge>
            <Badge variant="destructive">Erro</Badge>
          </div>
        </SectionCard>

        {/* 05 — Alertas e informativos */}
        <SectionCard
          number={5}
          title="Avisos e blocos informativos"
          description="Alert de aviso (laranja claro) e InfoBox fixo (azul claro)."
        >
          <div className="flex flex-col gap-4">
            <Alert variant="warning">
              <AlertTitle>Atenção</AlertTitle>
              <AlertDescription>
                Confira as datas da viagem antes de gerar o orçamento final.
              </AlertDescription>
            </Alert>
            <InfoBox>
              Bloco informativo fixo: use para instruções e contexto persistente dentro de uma
              seção.
            </InfoBox>
            <Alert variant="destructive">
              <AlertTitle>Erro na geração</AlertTitle>
              <AlertDescription>
                Não foi possível concluir a geração do orçamento. Tente novamente.
              </AlertDescription>
            </Alert>
          </div>
        </SectionCard>

        {/* 06 — Cards */}
        <SectionCard
          number={6}
          title="Card padrão shadcn"
          description="Raio 15px, borda e sombra SNOW."
        >
          <Card className="max-w-sm">
            <CardHeader>
              <CardTitle>Hotel Example Resort</CardTitle>
              <CardDescription>4 noites · all inclusive</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Conteúdo de exemplo para validar raio, borda e sombra do card no padrão SNOW.
              </p>
            </CardContent>
          </Card>
        </SectionCard>

        {/* 07 — Dialog e Toast */}
        <SectionCard
          number={7}
          title="Diálogo e notificações"
          description="Dialog modal e Toast (sonner) para feedback de ações."
        >
          <div className="flex flex-wrap gap-3">
            <Dialog>
              <DialogTrigger render={<Button variant="outline">Abrir diálogo</Button>} />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar exclusão</DialogTitle>
                  <DialogDescription>
                    Esta ação remove o item do orçamento. Deseja continuar?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant="snow-secondary">Cancelar</Button>} />
                  <DialogClose render={<Button variant="snow-remove">Remover</Button>} />
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={() => toast.success("Orçamento salvo com sucesso.")}>
              Disparar toast de sucesso
            </Button>
            <Button variant="outline" onClick={() => toast.error("Falha ao gerar o orçamento.")}>
              Disparar toast de erro
            </Button>
          </div>
        </SectionCard>

        {/* 08 — Estados de geração */}
        <SectionCard
          number={8}
          title="Estados de geração"
          description="Carregamento e erro para a geração do .pptx."
        >
          <div className="snow-grid-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="border-snow-blue size-4 animate-spin rounded-full border-2 border-t-transparent"
                  />
                  Gerando orçamento…
                </CardTitle>
                <CardDescription>Isso pode levar alguns minutos.</CardDescription>
              </CardHeader>
            </Card>
            <Alert variant="destructive">
              <AlertTitle>Erro ao gerar</AlertTitle>
              <AlertDescription>
                A IA não retornou um conteúdo válido. Tente gerar novamente.
              </AlertDescription>
            </Alert>
          </div>
        </SectionCard>

        {/* 09 — Layout responsivo */}
        <SectionCard
          number={9}
          title="Grid responsivo"
          description="2 colunas acima de 650px, 1 coluna em telas menores."
        >
          <TwoColumnGrid>
            <div className="rounded-snow-input border-snow-input-border text-muted-foreground border border-dashed p-4 text-center text-sm">
              Coluna A
            </div>
            <div className="rounded-snow-input border-snow-input-border text-muted-foreground border border-dashed p-4 text-center text-sm">
              Coluna B
            </div>
          </TwoColumnGrid>
        </SectionCard>
      </div>
    </main>
  );
}

function ColorSwatch({
  name,
  varName,
  hex,
  textOn,
}: {
  name: string;
  varName: string;
  hex: string;
  textOn: "light" | "dark";
}) {
  return (
    <div className="rounded-snow-input border-border flex items-center gap-3 border p-3">
      <span
        aria-hidden="true"
        className={
          "flex size-12 shrink-0 items-center justify-center rounded-[9px] text-[10px] font-medium " +
          (textOn === "light" ? "text-white" : "text-snow-navy")
        }
        style={{ backgroundColor: `var(${varName})` }}
      />
      <div className="flex flex-col text-sm">
        <span className="text-foreground font-medium">{name}</span>
        <span className="text-muted-foreground text-xs">{hex}</span>
      </div>
    </div>
  );
}
