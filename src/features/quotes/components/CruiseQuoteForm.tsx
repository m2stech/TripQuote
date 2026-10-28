"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import type { Control, FieldErrors, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { InfoBox } from "@/components/info-box";
import { LoadingState } from "@/components/loading-state";
import { SectionCard } from "@/components/section-card";
import { TwoColumnGrid } from "@/components/two-column-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getQuoteAction, updateQuoteAction, type QuoteDraftActionInput } from "@/features/quotes/actions/quote-actions";
import { getAttachmentPreviewUrlAction } from "@/features/quotes/actions/attachment-actions";
import { getInstitutionalFooterAction } from "@/features/branding/actions/branding-actions";
import { FormFieldError } from "@/features/quotes/components/FormFieldError";
import { ImageUpload } from "@/features/quotes/components/ImageUpload";
import { useQuoteAutosave } from "@/features/quotes/hooks/useQuoteAutosave";
import {
  cabinTypeOptions,
  cruiseFormDefaultValues,
  cruiseFormSchema,
  PORT_FEES_LABELS,
  portFeesOptions,
  portOperationOptions,
} from "@/features/quotes/schemas/cruise-form.schema";
import { FIXED_INSTITUTIONAL_FOOTER, INSTITUTIONAL_LOGO_URL } from "@/features/quotes/schemas/quote-form.schema";

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type CruiseFormInput = z.input<typeof cruiseFormSchema>;

interface CruiseQuoteFormProps {
  /** Mesmo papel do `quoteId` de `QuoteForm` — ver seu comentário. */
  quoteId?: string;
}

/**
 * Formulário completo de criação de orçamento de Cruzeiro (M11), ao lado de
 * `QuoteForm` (terrestre) — componente próprio, sem JSX compartilhado:
 * seções e campos são estruturalmente diferentes (roteiro de portos em vez
 * de hotéis, cabines em vez de quartos). Mesmo padrão de autosave,
 * validação e navegação do terrestre.
 */
export function CruiseQuoteForm({ quoteId: initialQuoteId }: CruiseQuoteFormProps) {
  const router = useRouter();
  const [newDraftId] = useState(() => crypto.randomUUID());
  const [quoteId, setQuoteId] = useState<string | null>(initialQuoteId ?? newDraftId);
  const [, setIsDraftPersisted] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(Boolean(initialQuoteId));
  const [agencyLogoPreview, setAgencyLogoPreview] = useState<string | null>(null);
  const [itineraryImagePreview, setItineraryImagePreview] = useState<string | null>(null);
  const [institutionalFooter, setInstitutionalFooter] = useState({
    logoUrl: INSTITUTIONAL_LOGO_URL,
    footerText: FIXED_INSTITUTIONAL_FOOTER,
  });

  useEffect(() => {
    getInstitutionalFooterAction()
      .then((footer) => setInstitutionalFooter(footer))
      .catch(() => {});
  }, []);

  const form = useForm<CruiseFormInput>({
    resolver: zodResolver(cruiseFormSchema),
    defaultValues: cruiseFormDefaultValues,
    mode: "onBlur",
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  useEffect(() => {
    if (!initialQuoteId) return;

    let isActive = true;

    getQuoteAction(initialQuoteId)
      .then(async (record) => {
        if (!isActive) return;
        if (!record) {
          toast.error("Orçamento não encontrado. Iniciando um novo rascunho.");
          return;
        }
        if (record.form.productType !== "cruzeiro") {
          toast.error("Este orçamento é de outro tipo de produto e não pode ser aberto aqui.");
          return;
        }
        setQuoteId(record.id);
        setIsDraftPersisted(true);
        reset(record.form);

        const [agencyPreview, itineraryPreview] = await Promise.all([
          record.form.agencyLogo
            ? getAttachmentPreviewUrlAction("agency_logo", record.form.agencyLogo.storagePath)
            : Promise.resolve(null),
          record.form.itineraryImage
            ? getAttachmentPreviewUrlAction("cruise_itinerary_image", record.form.itineraryImage.storagePath)
            : Promise.resolve(null),
        ]);
        if (!isActive) return;
        setAgencyLogoPreview(agencyPreview);
        setItineraryImagePreview(itineraryPreview);
      })
      .catch(() => {
        if (isActive) toast.error("Não foi possível carregar o orçamento.");
      })
      .finally(() => {
        if (isActive) setIsLoadingDraft(false);
      });

    return () => {
      isActive = false;
    };
  }, [initialQuoteId, reset]);

  function handleDraftPersisted() {
    setIsDraftPersisted((wasPersisted) => {
      if (wasPersisted || !quoteId) return wasPersisted;
      router.replace(`/orcamentos/novo?id=${quoteId}`, { scroll: false });
      return true;
    });
  }

  useQuoteAutosave(quoteId, "cruzeiro", watch, handleDraftPersisted);

  const itineraryArray = useFieldArray({ control, name: "itinerary" });
  const cabinsArray = useFieldArray({ control, name: "fare.cabins" });

  const agencyLogo = useWatch({ control, name: "agencyLogo" }) ?? null;
  const itineraryImage = useWatch({ control, name: "itineraryImage" }) ?? null;
  const itineraryCount = useWatch({ control, name: "itinerary" })?.length ?? 0;
  const cabinsCount = useWatch({ control, name: "fare.cabins" })?.length ?? 0;
  const portFeesOption = useWatch({ control, name: "fare.portFeesOption" }) ?? "not_informed";

  const fareErrors = errors.fare;

  async function onSubmit(values: CruiseFormInput) {
    if (!quoteId) return;
    try {
      await updateQuoteAction(quoteId, {
        ...values,
        productType: "cruzeiro",
      } as unknown as QuoteDraftActionInput);
      handleDraftPersisted();
      router.push(`/orcamentos/${quoteId}/gerar`);
    } catch {
      toast.error("Não foi possível salvar o orçamento. Tente novamente.");
    }
  }

  function onInvalid() {
    toast.error("Há campos pendentes. Revise as mensagens de erro no formulário.");
  }

  if (isLoadingDraft) {
    return <LoadingState label="Preparando o rascunho do orçamento…" />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex flex-col gap-6" noValidate>
      {/* 01 — Agência e cruzeiro */}
      <SectionCard number={1} title="Agência e cruzeiro">
        <TwoColumnGrid>
          <Field label="Agência" htmlFor="general.agency" error={errors.general?.agency?.message}>
            <Input id="general.agency" {...register("general.agency")} />
          </Field>

          <Field label="Consultor" htmlFor="general.consultant" error={errors.general?.consultant?.message}>
            <Input id="general.consultant" {...register("general.consultant")} />
          </Field>

          <Field
            label="Companhia marítima"
            htmlFor="general.cruiseLine"
            error={errors.general?.cruiseLine?.message}
          >
            <Input id="general.cruiseLine" placeholder="Ex.: MSC Cruzeiros" {...register("general.cruiseLine")} />
          </Field>

          <Field label="Navio" htmlFor="general.shipName" error={errors.general?.shipName?.message}>
            <Input id="general.shipName" placeholder="Ex.: MSC Seaside" {...register("general.shipName")} />
          </Field>

          <Field
            label="Destino/região"
            htmlFor="general.destination"
            error={errors.general?.destination?.message}
          >
            <Input id="general.destination" {...register("general.destination")} />
          </Field>

          <Field
            label="Porto de embarque"
            htmlFor="general.embarkationPort"
            error={errors.general?.embarkationPort?.message}
          >
            <Input id="general.embarkationPort" {...register("general.embarkationPort")} />
          </Field>

          <Field
            label="Porto de desembarque (opcional)"
            htmlFor="general.disembarkationPort"
            error={errors.general?.disembarkationPort?.message}
            helperText="Se vazio, assume o mesmo porto de embarque."
          >
            <Input id="general.disembarkationPort" {...register("general.disembarkationPort")} />
          </Field>

          <Field
            label="Data de embarque"
            htmlFor="general.embarkationDate"
            error={errors.general?.embarkationDate?.message}
          >
            <Input id="general.embarkationDate" type="date" {...register("general.embarkationDate")} />
          </Field>

          <Field
            label="Data de desembarque"
            htmlFor="general.disembarkationDate"
            error={errors.general?.disembarkationDate?.message}
          >
            <Input id="general.disembarkationDate" type="date" {...register("general.disembarkationDate")} />
          </Field>

          <Field
            label="Perfil da viagem (opcional)"
            htmlFor="general.tripProfile"
            error={errors.general?.tripProfile?.message}
            helperText="Ex.: Famílias, casais, melhor idade."
          >
            <Input id="general.tripProfile" {...register("general.tripProfile")} />
          </Field>

          <Field
            label="Ocupação considerada"
            htmlFor="general.occupancy"
            error={errors.general?.occupancy?.message}
          >
            <Input id="general.occupancy" placeholder="Ex.: 2 adultos" {...register("general.occupancy")} />
          </Field>

          <Field label="Moeda" htmlFor="general.currency" error={errors.general?.currency?.message}>
            <Input id="general.currency" {...register("general.currency")} />
          </Field>

          <ImageUpload
            label="Logo da agência"
            helperText="PNG, JPG ou WEBP, até 5 MB."
            value={agencyLogo}
            previewUrl={agencyLogoPreview}
            onChange={(value, preview) => {
              setValue("agencyLogo", value);
              setAgencyLogoPreview(preview);
              if (value) handleDraftPersisted();
            }}
            quoteId={quoteId}
            kind="agency_logo"
            className="sm:col-span-2"
          />
        </TwoColumnGrid>
      </SectionCard>

      {/* 02 — Capa */}
      <SectionCard number={2} title="Capa">
        <Field
          label="Frase de efeito (opcional)"
          htmlFor="cover.tagline"
          error={errors.cover?.tagline?.message}
          helperText="Se deixar vazio, a IA criará a frase de efeito."
        >
          <Input id="cover.tagline" {...register("cover.tagline")} />
        </Field>
      </SectionCard>

      {/* 03 — Roteiro */}
      <SectionCard
        number={3}
        title="Roteiro"
        description="Informe o roteiro dia a dia e/ou anexe um print do roteiro — a IA extrai os dados da imagem quando necessário."
      >
        <div className="flex flex-col gap-4">
          {itineraryArray.fields.map((stopField, stopIndex) => (
            <div key={stopField.id} className="border-snow-input-border flex flex-col gap-3 rounded-[12px] border p-3">
              <TwoColumnGrid>
                <Field
                  label="Data"
                  htmlFor={`itinerary.${stopIndex}.date`}
                  error={errors.itinerary?.[stopIndex]?.date?.message}
                >
                  <Input
                    id={`itinerary.${stopIndex}.date`}
                    type="date"
                    {...register(`itinerary.${stopIndex}.date`)}
                  />
                </Field>

                <Field
                  label="Porto/destino"
                  htmlFor={`itinerary.${stopIndex}.portOrDestination`}
                  error={errors.itinerary?.[stopIndex]?.portOrDestination?.message}
                >
                  <Input
                    id={`itinerary.${stopIndex}.portOrDestination`}
                    {...register(`itinerary.${stopIndex}.portOrDestination`)}
                  />
                </Field>

                <StopOperationSelect control={control} setValue={setValue} stopIndex={stopIndex} />

                <Field
                  label="Chegada (opcional)"
                  htmlFor={`itinerary.${stopIndex}.arrival`}
                  error={errors.itinerary?.[stopIndex]?.arrival?.message}
                >
                  <Input
                    id={`itinerary.${stopIndex}.arrival`}
                    placeholder="Ex.: 08:00"
                    {...register(`itinerary.${stopIndex}.arrival`)}
                  />
                </Field>

                <Field
                  label="Saída (opcional)"
                  htmlFor={`itinerary.${stopIndex}.departure`}
                  error={errors.itinerary?.[stopIndex]?.departure?.message}
                >
                  <Input
                    id={`itinerary.${stopIndex}.departure`}
                    placeholder="Ex.: 18:00"
                    {...register(`itinerary.${stopIndex}.departure`)}
                  />
                </Field>
              </TwoColumnGrid>

              <Button
                type="button"
                variant="snow-remove"
                className="self-start"
                onClick={() => itineraryArray.remove(stopIndex)}
              >
                Remover dia
              </Button>
            </div>
          ))}

          {typeof errors.itinerary?.message === "string" ? (
            <FormFieldError message={errors.itinerary.message} />
          ) : null}

          <Button
            type="button"
            variant="snow-secondary"
            className="self-start"
            onClick={() =>
              itineraryArray.append({
                id: createId(),
                date: "",
                portOrDestination: "",
                operation: portOperationOptions[0],
                arrival: "",
                departure: "",
              })
            }
          >
            + Adicionar dia
          </Button>

          <ImageUpload
            label="Print do roteiro (opcional)"
            helperText="PNG, JPG ou WEBP, até 5 MB."
            value={itineraryImage}
            previewUrl={itineraryImagePreview}
            onChange={(value, preview) => {
              setValue("itineraryImage", value);
              setItineraryImagePreview(preview);
              if (value) handleDraftPersisted();
            }}
            quoteId={quoteId}
            kind="cruise_itinerary_image"
          />
        </div>
      </SectionCard>

      {/* 04 — Navio e experiência a bordo */}
      <SectionCard number={4} title="Navio e experiência a bordo">
        <Field
          label="Destaques que a equipe quer citar (opcional)"
          htmlFor="ship.highlights"
          error={errors.ship?.highlights?.message}
          helperText="A IA pesquisa dados públicos do navio e incorpora esses destaques quando fizer sentido."
        >
          <Textarea id="ship.highlights" rows={3} {...register("ship.highlights")} />
        </Field>
      </SectionCard>

      {/* 05 — Cabines e tarifas */}
      <SectionCard number={5} title="Cabines e tarifas">
        <div className="flex flex-col gap-5">
          {cabinsArray.fields.map((cabinField, cabinIndex) => (
            <CabinBlock
              key={cabinField.id}
              cabinIndex={cabinIndex}
              onRemove={() => cabinsArray.remove(cabinIndex)}
              register={register}
              control={control}
              setValue={setValue}
              errors={errors}
              quoteId={quoteId}
            />
          ))}

          {typeof errors.fare?.cabins?.message === "string" ? (
            <FormFieldError message={errors.fare.cabins.message} />
          ) : null}

          <Button
            type="button"
            variant="snow-secondary"
            className="self-start"
            onClick={() =>
              cabinsArray.append({
                id: createId(),
                category: "",
                type: cabinTypeOptions[0],
                occupancy: "",
                price: "",
                photo: null,
              })
            }
          >
            + Adicionar cabine
          </Button>

          <TwoColumnGrid>
            <Field
              label="Taxas portuárias e gorjetas"
              htmlFor="fare.portFeesOption"
              error={fareErrors?.portFeesOption?.message}
            >
              <Select
                value={portFeesOption}
                onValueChange={(value) =>
                  setValue("fare.portFeesOption", value as (typeof portFeesOptions)[number])
                }
              >
                <SelectTrigger id="fare.portFeesOption" className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {portFeesOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {PORT_FEES_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {portFeesOption === "not_included" ? (
              <Field
                label="Valor das taxas"
                htmlFor="fare.portFeesValue"
                error={fareErrors?.portFeesValue?.message}
              >
                <Input
                  id="fare.portFeesValue"
                  placeholder="Ex.: US$ 120 por pessoa"
                  {...register("fare.portFeesValue")}
                />
              </Field>
            ) : null}
          </TwoColumnGrid>

          <Field
            label="Regras da tarifa (opcional)"
            htmlFor="fare.fareRules"
            error={fareErrors?.fareRules?.message}
          >
            <Textarea id="fare.fareRules" rows={3} {...register("fare.fareRules")} />
          </Field>
        </div>
      </SectionCard>

      {/* 06 — Forma de pagamento */}
      <SectionCard
        number={6}
        title="Forma de pagamento"
        description="Condições institucionais fixas, aplicadas conforme o tipo de produto."
      >
        <InfoBox>
          <p className="whitespace-pre-line">
            Pagamento à vista: 5% de desconto para pagamento à vista via Dinheiro, PIX ou Depósito Bancário.
            {"\n"}Cartão de Crédito: até 10x sem juros, sem entrada.
            {"\n"}Boleto Bancário: até 10x sem juros, sendo 25% de entrada + 9 parcelas iguais.
            {"\n"}Observação importante: valor mínimo por parcela: R$ 500,00.
          </p>
        </InfoBox>
      </SectionCard>

      {/* 07 — Incluído, não incluído e opcionais */}
      <SectionCard number={7} title="Incluído, não incluído e opcionais">
        <div className="flex flex-col gap-5">
          <StringListField
            label="Incluído"
            fieldName="inclusions.included"
            control={control}
            setValue={setValue}
            placeholder="Ex.: Pensão completa"
          />
          <StringListField
            label="Não incluído"
            fieldName="inclusions.notIncluded"
            control={control}
            setValue={setValue}
            placeholder="Ex.: Bebidas alcoólicas"
          />
          <StringListField
            label="Opcionais"
            fieldName="inclusions.optional"
            control={control}
            setValue={setValue}
            placeholder="Ex.: Pacote de bebidas"
          />

          <Field
            label="Informações importantes (opcional)"
            htmlFor="inclusions.importantInfo"
            error={errors.inclusions?.importantInfo?.message}
          >
            <Textarea id="inclusions.importantInfo" rows={3} {...register("inclusions.importantInfo")} />
          </Field>
        </div>
      </SectionCard>

      {/* 08 — Rodapé institucional */}
      <SectionCard
        number={8}
        title="Rodapé institucional"
        description="Texto e logo institucional fixos, definidos pelo sistema."
      >
        <InfoBox className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- logo institucional, servida de URL assinada ou externa fixa */}
          <img
            src={institutionalFooter.logoUrl}
            alt="Logo institucional SNOW"
            className="h-8 w-auto shrink-0"
          />
          <span>{institutionalFooter.footerText}</span>
        </InfoBox>
      </SectionCard>

      {/* 09 — Gerar */}
      <SectionCard number={9} title="Gerar">
        <div className="flex flex-col gap-4">
          <ul className="text-muted-foreground flex flex-col gap-1 text-sm">
            <li>{itineraryCount} dia(s) de roteiro</li>
            <li>{cabinsCount} cabine(s) adicionada(s)</li>
          </ul>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="snow-generate" size="generate" disabled={isSubmitting || !quoteId}>
              Gerar orçamento
            </Button>
          </div>
        </div>
      </SectionCard>
    </form>
  );
}

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  helperText?: string;
  className?: string;
  children: React.ReactNode;
}

function Field({ label, htmlFor, error, helperText, className, children }: FieldProps) {
  return (
    <div className={className ? `flex flex-col gap-1.5 ${className}` : "flex flex-col gap-1.5"}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {helperText && !error ? <p className="text-muted-foreground text-xs">{helperText}</p> : null}
      <FormFieldError message={error} />
    </div>
  );
}

// --- Seletor de operação do dia (seção 03) ---------------------------------

interface StopOperationSelectProps {
  control: Control<CruiseFormInput>;
  setValue: UseFormSetValue<CruiseFormInput>;
  stopIndex: number;
}

function StopOperationSelect({ control, setValue, stopIndex }: StopOperationSelectProps) {
  const operation = useWatch({ control, name: `itinerary.${stopIndex}.operation` });

  return (
    <Field label="Operação" htmlFor={`itinerary.${stopIndex}.operation`}>
      <Select
        value={operation}
        onValueChange={(value) =>
          setValue(`itinerary.${stopIndex}.operation`, value as (typeof portOperationOptions)[number])
        }
      >
        <SelectTrigger id={`itinerary.${stopIndex}.operation`} className="w-full">
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          {portOperationOptions.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

// --- Cabine (seção 05) ------------------------------------------------------

interface CabinBlockProps {
  cabinIndex: number;
  onRemove: () => void;
  register: UseFormRegister<CruiseFormInput>;
  control: Control<CruiseFormInput>;
  setValue: UseFormSetValue<CruiseFormInput>;
  errors: FieldErrors<CruiseFormInput>;
  quoteId: string | null;
}

function CabinBlock({ cabinIndex, onRemove, register, control, setValue, errors, quoteId }: CabinBlockProps) {
  const type = useWatch({ control, name: `fare.cabins.${cabinIndex}.type` });
  const photo = useWatch({ control, name: `fare.cabins.${cabinIndex}.photo` }) ?? null;
  const cabinErrors = errors.fare?.cabins?.[cabinIndex];
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    if (!photo) {
      Promise.resolve().then(() => {
        if (isActive) setPhotoPreview(null);
      });
      return () => {
        isActive = false;
      };
    }

    getAttachmentPreviewUrlAction("cruise_photo", photo.storagePath)
      .then((url) => {
        if (isActive) setPhotoPreview(url);
      })
      .catch(() => {});
    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só precisa reagir à troca de storagePath, não à identidade do objeto `photo`
  }, [photo?.storagePath]);

  return (
    <div className="border-snow-input-border flex flex-col gap-3 rounded-[12px] border p-4">
      <TwoColumnGrid>
        <Field
          label="Categoria"
          htmlFor={`fare.cabins.${cabinIndex}.category`}
          error={cabinErrors?.category?.message}
        >
          <Input
            id={`fare.cabins.${cabinIndex}.category`}
            placeholder="Ex.: Varanda"
            {...register(`fare.cabins.${cabinIndex}.category`)}
          />
        </Field>

        <Field label="Tipo" htmlFor={`fare.cabins.${cabinIndex}.type`} error={cabinErrors?.type?.message}>
          <Select
            value={type}
            onValueChange={(value) =>
              setValue(`fare.cabins.${cabinIndex}.type`, value as (typeof cabinTypeOptions)[number])
            }
          >
            <SelectTrigger id={`fare.cabins.${cabinIndex}.type`} className="w-full">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {cabinTypeOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Ocupação específica (opcional)"
          htmlFor={`fare.cabins.${cabinIndex}.occupancy`}
          error={cabinErrors?.occupancy?.message}
          helperText="Se vazio, usa a ocupação geral informada na seção 01."
        >
          <Input id={`fare.cabins.${cabinIndex}.occupancy`} {...register(`fare.cabins.${cabinIndex}.occupancy`)} />
        </Field>

        <Field
          label="Valor total"
          htmlFor={`fare.cabins.${cabinIndex}.price`}
          error={cabinErrors?.price?.message}
        >
          <Input
            id={`fare.cabins.${cabinIndex}.price`}
            placeholder="Ex.: R$ 4.500,00"
            {...register(`fare.cabins.${cabinIndex}.price`)}
          />
        </Field>
      </TwoColumnGrid>

      <ImageUpload
        label="Foto da cabine (opcional)"
        helperText="PNG, JPG ou WEBP, até 5 MB."
        value={photo}
        previewUrl={photoPreview}
        onChange={(value, preview) => {
          setValue(`fare.cabins.${cabinIndex}.photo`, value);
          setPhotoPreview(preview);
        }}
        quoteId={quoteId}
        kind="cruise_photo"
      />

      <Button type="button" variant="snow-remove" className="self-start" onClick={onRemove}>
        Remover cabine
      </Button>
    </div>
  );
}

// --- Lista de strings (seção 07: incluído/não incluído/opcionais) ---------

interface StringListFieldProps {
  label: string;
  fieldName: "inclusions.included" | "inclusions.notIncluded" | "inclusions.optional";
  control: Control<CruiseFormInput>;
  setValue: UseFormSetValue<CruiseFormInput>;
  placeholder: string;
}

/**
 * Lista de strings simples (sem `id` próprio), diferente das demais seções
 * (roteiro, cabines), que são arrays de objeto com `id` e usam
 * `useFieldArray`. `useFieldArray` exige um array de objetos — manipulação
 * manual via `setValue` em vez disso, com a posição no array como key
 * (aceitável aqui: a lista não é reordenada, só itens removidos do fim ou
 * do meio, sem drag-and-drop).
 */
function StringListField({ label, fieldName, control, setValue, placeholder }: StringListFieldProps) {
  const items = useWatch({ control, name: fieldName }) ?? [];

  function updateItem(index: number, value: string) {
    const next = [...items];
    next[index] = value;
    setValue(fieldName, next);
  }

  function removeItem(index: number) {
    setValue(fieldName, items.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {items.map((item, index) => (
        <div key={index} className="flex items-start gap-2">
          <div className="flex-1">
            <Input
              aria-label={`${label} ${index + 1}`}
              placeholder={placeholder}
              value={item}
              onChange={(event) => updateItem(index, event.target.value)}
            />
          </div>
          <Button type="button" variant="snow-remove" onClick={() => removeItem(index)}>
            Remover
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="snow-secondary"
        className="self-start"
        onClick={() => setValue(fieldName, [...items, ""])}
      >
        + Adicionar item
      </Button>
    </div>
  );
}
