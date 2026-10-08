"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import type {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { InfoBox } from "@/components/info-box";
import { LoadingState } from "@/components/loading-state";
import { SectionCard } from "@/components/section-card";
import { TwoColumnGrid } from "@/components/two-column-grid";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { getQuoteAction, updateQuoteAction } from "@/features/quotes/actions/quote-actions";
import { getAttachmentPreviewUrlAction } from "@/features/quotes/actions/attachment-actions";
import { getInstitutionalFooterAction } from "@/features/branding/actions/branding-actions";
import { FormFieldError } from "@/features/quotes/components/FormFieldError";
import { ImageUpload } from "@/features/quotes/components/ImageUpload";
import { useQuoteAutosave } from "@/features/quotes/hooks/useQuoteAutosave";
import {
  baggageOptions,
  FIXED_INSTITUTIONAL_FOOTER,
  FIXED_PAYMENT_TERMS,
  INSTITUTIONAL_LOGO_URL,
  mealPlanOptions,
  priceTypeOptions,
  quoteFormDefaultValues,
  quoteFormSchema,
  seatOptions,
  type QuoteDraftInput,
} from "@/features/quotes/schemas/quote-form.schema";

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Tipo de entrada do schema (antes da aplicação dos `.default()`). É o tipo
 * usado pelo `useForm`/`zodResolver`, pois alguns campos opcionais com
 * default têm tipo de entrada diferente do tipo de saída (`QuoteFormValues`).
 */
type QuoteFormInput = z.input<typeof quoteFormSchema>;

interface QuoteFormProps {
  /**
   * Id inicial de um orçamento a carregar, vindo de `?id=<id>` (rascunho em
   * andamento, escrito na URL por este componente) ou `?duplicar=<id>`
   * (editar um orçamento existente). Em ambos os casos o formulário carrega
   * esse registro e continua salvando nele.
   */
  quoteId?: string;
}

/**
 * Formulário completo de criação de orçamento. Coleta e valida os dados no
 * client; a geração de fato (chamada à IA e montagem do .pptx) acontece no
 * backend em marcos futuros (M6/M7). Nenhum texto de prompt ou lógica de IA
 * é exposto aqui.
 *
 * O rascunho é persistido no banco (M5) com autosave (`useQuoteAutosave`),
 * substituindo o rascunho em `localStorage` do M2 — mas a linha em `quotes`
 * só é criada quando há algo de fato para salvar (primeiro autosave real ou
 * primeiro upload de anexo), nunca só por visitar a página: o `quoteId` é
 * gerado no client (`crypto.randomUUID()`) sem bater no banco, e só é
 * gravado na URL (`?id=<id>`) depois que o primeiro save é confirmado.
 */
export function QuoteForm({ quoteId: initialQuoteId }: QuoteFormProps) {
  const router = useRouter();
  // Sem `initialQuoteId` (criação nova), o id é gerado localmente — nenhuma
  // chamada ao banco acontece até o usuário de fato salvar algo.
  const [newDraftId] = useState(() => crypto.randomUUID());
  const [quoteId, setQuoteId] = useState<string | null>(initialQuoteId ?? newDraftId);
  const [isDraftPersisted, setIsDraftPersisted] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(Boolean(initialQuoteId));
  const [agencyLogoPreview, setAgencyLogoPreview] = useState<string | null>(null);
  const [flightImagePreview, setFlightImagePreview] = useState<string | null>(null);
  const [institutionalFooter, setInstitutionalFooter] = useState({
    logoUrl: INSTITUTIONAL_LOGO_URL,
    footerText: FIXED_INSTITUTIONAL_FOOTER,
  });

  // Logo e texto institucionais configurados pelo admin (M8); cai nos
  // valores fixos históricos se a chamada falhar ou nada tiver sido
  // configurado ainda.
  useEffect(() => {
    getInstitutionalFooterAction()
      .then((footer) => setInstitutionalFooter(footer))
      .catch(() => {});
  }, []);

  const form = useForm<QuoteFormInput>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: quoteFormDefaultValues,
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

  // Carrega um orçamento já existente: `?id=<id>` (rascunho salvo em uma
  // visita anterior) ou `?duplicar=<id>` (editar/duplicar). Sem
  // `initialQuoteId`, não há nada para carregar — o formulário começa vazio.
  useEffect(() => {
    if (!initialQuoteId) return;

    let isActive = true;

    setIsLoadingDraft(true);
    getQuoteAction(initialQuoteId)
      .then(async (record) => {
        if (!isActive) return;
        if (!record) {
          toast.error("Orçamento não encontrado. Iniciando um novo rascunho.");
          return;
        }
        setQuoteId(record.id);
        setIsDraftPersisted(true);
        reset(record.form);

        const [agencyPreview, flightPreview] = await Promise.all([
          record.form.agencyLogo
            ? getAttachmentPreviewUrlAction("agency_logo", record.form.agencyLogo.storagePath)
            : Promise.resolve(null),
          record.form.flightImage
            ? getAttachmentPreviewUrlAction("flight_image", record.form.flightImage.storagePath)
            : Promise.resolve(null),
        ]);
        if (!isActive) return;
        setAgencyLogoPreview(agencyPreview);
        setFlightImagePreview(flightPreview);
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

  // Grava o id do rascunho na URL assim que o primeiro save (autosave ou
  // upload) é confirmado — a partir daí um F5 na página reaproveita o mesmo
  // registro em vez de começar um rascunho novo.
  function handleDraftPersisted() {
    if (isDraftPersisted || !quoteId) return;
    setIsDraftPersisted(true);
    router.replace(`/orcamentos/novo?id=${quoteId}`, { scroll: false });
  }

  useQuoteAutosave(quoteId, watch, handleDraftPersisted);

  const inclusionsArray = useFieldArray({ control, name: "inclusions" });
  const hotelsArray = useFieldArray({ control, name: "hotels" });
  // `itinerary` é uma união discriminada; o campo `days` só existe quando
  // `enabled` é `true`. O cast é necessário porque o tipo do `control` não
  // expressa essa condicional, mas o array só é de fato usado/renderizado
  // quando `itineraryEnabled` é verdadeiro.
  type ItineraryEnabled = Extract<QuoteFormInput["itinerary"], { enabled: true }>;
  const itineraryDaysArray = useFieldArray({
    control: control as unknown as Control<{ itinerary: ItineraryEnabled }>,
    name: "itinerary.days",
  });

  const flightsEnabled = watch("flights.enabled");
  const itineraryEnabled = watch("itinerary.enabled");
  const agencyLogo = watch("agencyLogo") ?? null;
  const flightImage = watch("flightImage") ?? null;
  const inclusionsCount = watch("inclusions")?.length ?? 0;
  const hotelsCount = watch("hotels")?.length ?? 0;

  // Erros tipados como `FieldErrors` dos ramos "habilitado" das uniões
  // discriminadas de voos e roteiro, só usados quando o respectivo `enabled`
  // é `true` (ver `flightsEnabled`/`itineraryEnabled` acima).
  const flightErrors = errors.flights as FieldErrors<{
    legs: string;
    baggage: string;
    seat: string;
    services: string;
  }>;
  const itineraryErrors = errors.itinerary as FieldErrors<{
    days: { label: string; description: string }[];
  }>;

  async function onSubmit(values: QuoteFormInput) {
    if (!quoteId) return;
    try {
      await updateQuoteAction(quoteId, values as QuoteDraftInput);
      handleDraftPersisted();
      router.push(`/orcamentos/${quoteId}/gerar`);
    } catch {
      toast.error("Não foi possível salvar o orçamento. Tente novamente.");
    }
  }

  function onInvalid() {
    toast.error("Há campos pendentes. Revise as mensagens de erro no formulário.");
  }

  function handleToggleFlights(checked: boolean) {
    if (checked) {
      setValue("flights", {
        enabled: true,
        legs: "",
        baggage: baggageOptions[0],
        seat: seatOptions[0],
        services: "",
      });
    } else {
      setValue("flights", { enabled: false });
    }
  }

  function handleToggleItinerary(checked: boolean) {
    if (checked) {
      setValue("itinerary", {
        enabled: true,
        days: [{ id: createId(), label: "", description: "" }],
      });
    } else {
      setValue("itinerary", { enabled: false });
    }
  }

  if (isLoadingDraft) {
    return <LoadingState label="Preparando o rascunho do orçamento…" />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex flex-col gap-6" noValidate>
      {/* 01 — Dados gerais */}
      <SectionCard number={1} title="Dados gerais">
        <TwoColumnGrid>
          <Field label="Agência" htmlFor="general.agency" error={errors.general?.agency?.message}>
            <Input id="general.agency" {...register("general.agency")} />
          </Field>

          <Field
            label="Consultor"
            htmlFor="general.consultant"
            error={errors.general?.consultant?.message}
          >
            <Input id="general.consultant" {...register("general.consultant")} />
          </Field>

          <Field
            label="Destino"
            htmlFor="general.destination"
            error={errors.general?.destination?.message}
          >
            <Input id="general.destination" {...register("general.destination")} />
          </Field>

          <Field
            label="Viajantes"
            htmlFor="general.travelers"
            error={errors.general?.travelers?.message}
          >
            <Input
              id="general.travelers"
              placeholder="Ex.: 2 adultos + 2 crianças"
              {...register("general.travelers")}
            />
          </Field>

          <Field
            label="Data de início"
            htmlFor="general.startDate"
            error={errors.general?.startDate?.message}
          >
            <Input id="general.startDate" type="date" {...register("general.startDate")} />
          </Field>

          <Field
            label="Data de fim"
            htmlFor="general.endDate"
            error={errors.general?.endDate?.message}
          >
            <Input id="general.endDate" type="date" {...register("general.endDate")} />
          </Field>

          <Field label="Moeda" htmlFor="general.currency" error={errors.general?.currency?.message}>
            <Input id="general.currency" {...register("general.currency")} />
          </Field>

          <Field
            label="Tipo de valor"
            htmlFor="general.priceType"
            error={errors.general?.priceType?.message}
          >
            <Select
              value={watch("general.priceType")}
              onValueChange={(value) =>
                setValue("general.priceType", value as QuoteFormInput["general"]["priceType"])
              }
            >
              <SelectTrigger id="general.priceType" className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {priceTypeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Base de acomodação"
            htmlFor="general.occupancy"
            error={errors.general?.occupancy?.message}
          >
            <Input
              id="general.occupancy"
              placeholder="Ex.: Duplo, Triplo, Quádruplo"
              {...register("general.occupancy")}
            />
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

      {/* 03 — Inclusões */}
      <SectionCard number={3} title="Inclusões">
        <div className="flex flex-col gap-3">
          {inclusionsArray.fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-2">
              <div className="flex-1">
                <Input
                  aria-label={`Inclusão ${index + 1}`}
                  placeholder="Ex.: Traslado IN/OUT"
                  {...register(`inclusions.${index}.text`)}
                />
                <FormFieldError message={errors.inclusions?.[index]?.text?.message} />
              </div>
              <Button
                type="button"
                variant="snow-remove"
                onClick={() => inclusionsArray.remove(index)}
              >
                Remover
              </Button>
            </div>
          ))}

          {typeof errors.inclusions?.message === "string" ? (
            <FormFieldError message={errors.inclusions.message} />
          ) : null}

          <Button
            type="button"
            variant="snow-secondary"
            className="self-start"
            onClick={() => inclusionsArray.append({ id: createId(), text: "" })}
          >
            + Adicionar inclusão
          </Button>
        </div>
      </SectionCard>

      {/* 04 — Hotéis */}
      <SectionCard
        number={4}
        title="Hotéis"
        description="Informe os hotéis e preços. A IA pesquisará uma fotografia real e exclusiva para cada hotel."
      >
        <div className="flex flex-col gap-5">
          {hotelsArray.fields.map((hotelField, hotelIndex) => (
            <HotelBlock
              key={hotelField.id}
              hotelIndex={hotelIndex}
              onRemove={() => hotelsArray.remove(hotelIndex)}
              register={register}
              control={control}
              watch={watch}
              setValue={setValue}
              errors={errors}
            />
          ))}

          {typeof errors.hotels?.message === "string" ? (
            <FormFieldError message={errors.hotels.message} />
          ) : null}

          <Button
            type="button"
            variant="snow-secondary"
            className="self-start"
            onClick={() =>
              hotelsArray.append({
                id: createId(),
                name: "",
                mealPlan: mealPlanOptions[0],
                rooms: [{ id: createId(), text: "" }],
              })
            }
          >
            + Adicionar hotel
          </Button>
        </div>
      </SectionCard>

      {/* 05 — Voos e serviços */}
      <SectionCard number={5} title="Voos e serviços">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="flights.enabled"
              checked={flightsEnabled}
              onCheckedChange={(checked) => handleToggleFlights(checked === true)}
            />
            <Label htmlFor="flights.enabled">Incluir slide de voos</Label>
          </div>

          {flightsEnabled ? (
            <TwoColumnGrid>
              <Field
                label="Trechos e horários (opcional com imagem anexada)"
                htmlFor="flights.legs"
                error={flightErrors?.legs?.message}
                className="sm:col-span-2"
                helperText="Um trecho por linha. Se anexar uma imagem de comprovante abaixo, a IA extrai os trechos automaticamente e este campo pode ficar em branco."
              >
                <Textarea id="flights.legs" rows={4} {...register("flights.legs")} />
              </Field>

              <Field
                label="Franquia de bagagem"
                htmlFor="flights.baggage"
                error={flightErrors?.baggage?.message}
              >
                <Select
                  value={flightsEnabled ? watch("flights.baggage") : undefined}
                  onValueChange={(value) =>
                    setValue("flights.baggage", value as (typeof baggageOptions)[number])
                  }
                >
                  <SelectTrigger id="flights.baggage" className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {baggageOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field
                label="Marcação de assento"
                htmlFor="flights.seat"
                error={flightErrors?.seat?.message}
              >
                <Select
                  value={flightsEnabled ? watch("flights.seat") : undefined}
                  onValueChange={(value) =>
                    setValue("flights.seat", value as (typeof seatOptions)[number])
                  }
                >
                  <SelectTrigger id="flights.seat" className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {seatOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field
                label="Outros serviços (opcional)"
                htmlFor="flights.services"
                error={flightErrors?.services?.message}
                className="sm:col-span-2"
              >
                <Textarea id="flights.services" rows={3} {...register("flights.services")} />
              </Field>

              <ImageUpload
                label="Imagem de voo"
                helperText="PNG, JPG ou WEBP, até 5 MB."
                value={flightImage}
                previewUrl={flightImagePreview}
                onChange={(value, preview) => {
                  setValue("flightImage", value);
                  setFlightImagePreview(preview);
                  if (value) handleDraftPersisted();
                }}
                quoteId={quoteId}
                kind="flight_image"
                className="sm:col-span-2"
              />
            </TwoColumnGrid>
          ) : null}
        </div>
      </SectionCard>

      {/* 06 — Programação dia a dia */}
      <SectionCard number={6} title="Programação dia a dia (opcional)">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="itinerary.enabled"
              checked={itineraryEnabled}
              onCheckedChange={(checked) => handleToggleItinerary(checked === true)}
            />
            <Label htmlFor="itinerary.enabled">Incluir roteiro detalhado</Label>
          </div>

          {itineraryEnabled ? (
            <div className="flex flex-col gap-4">
              {itineraryDaysArray.fields.map((dayField, dayIndex) => (
                <div
                  key={dayField.id}
                  className="border-snow-input-border flex flex-col gap-3 rounded-[12px] border p-3"
                >
                  <TwoColumnGrid>
                    <Field
                      label="Dia / data"
                      htmlFor={`itinerary.days.${dayIndex}.label`}
                      error={itineraryErrors?.days?.[dayIndex]?.label?.message}
                    >
                      <Input
                        id={`itinerary.days.${dayIndex}.label`}
                        {...register(
                          `itinerary.days.${dayIndex}.label` as `itinerary.days.${number}.label`,
                        )}
                      />
                    </Field>

                    <Field
                      label="Programação"
                      htmlFor={`itinerary.days.${dayIndex}.description`}
                      error={itineraryErrors?.days?.[dayIndex]?.description?.message}
                    >
                      <Textarea
                        id={`itinerary.days.${dayIndex}.description`}
                        rows={2}
                        {...register(
                          `itinerary.days.${dayIndex}.description` as `itinerary.days.${number}.description`,
                        )}
                      />
                    </Field>
                  </TwoColumnGrid>

                  <Button
                    type="button"
                    variant="snow-remove"
                    className="self-start"
                    onClick={() => itineraryDaysArray.remove(dayIndex)}
                  >
                    Remover dia
                  </Button>
                </div>
              ))}

              {typeof itineraryErrors?.days?.message === "string" ? (
                <FormFieldError message={itineraryErrors.days.message} />
              ) : null}

              <Button
                type="button"
                variant="snow-secondary"
                className="self-start"
                onClick={() =>
                  itineraryDaysArray.append({ id: createId(), label: "", description: "" })
                }
              >
                + Adicionar dia
              </Button>
            </div>
          ) : null}
        </div>
      </SectionCard>

      {/* 07 — Pagamento fixo */}
      <SectionCard
        number={7}
        title="Pagamento fixo"
        description="Condições institucionais fixas, aplicadas a todos os orçamentos."
      >
        <InfoBox>
          <p className="whitespace-pre-line">{FIXED_PAYMENT_TERMS}</p>
        </InfoBox>
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
            <li>{inclusionsCount} inclusão(ões) adicionada(s)</li>
            <li>{hotelsCount} hotel(éis) adicionado(s)</li>
            {flightsEnabled ? <li>Slide de voos incluído</li> : null}
            {itineraryEnabled ? (
              <li>{itineraryDaysArray.fields.length} dia(s) de roteiro</li>
            ) : null}
          </ul>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              variant="snow-generate"
              size="generate"
              disabled={isSubmitting || !quoteId}
            >
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

// --- Hotel block (seção 04) --------------------------------------------

interface HotelBlockProps {
  hotelIndex: number;
  onRemove: () => void;
  register: UseFormRegister<QuoteFormInput>;
  control: Control<QuoteFormInput>;
  watch: UseFormWatch<QuoteFormInput>;
  setValue: UseFormSetValue<QuoteFormInput>;
  errors: FieldErrors<QuoteFormInput>;
}

function HotelBlock({
  hotelIndex,
  onRemove,
  register,
  control,
  watch,
  setValue,
  errors,
}: HotelBlockProps) {
  const roomsArray = useFieldArray({ control, name: `hotels.${hotelIndex}.rooms` });
  const hotelErrors = errors.hotels?.[hotelIndex];

  return (
    <div className="border-snow-input-border flex flex-col gap-3 rounded-[12px] border p-4">
      <TwoColumnGrid>
        <Field
          label="Nome do hotel"
          htmlFor={`hotels.${hotelIndex}.name`}
          error={hotelErrors?.name?.message}
        >
          <Input id={`hotels.${hotelIndex}.name`} {...register(`hotels.${hotelIndex}.name`)} />
        </Field>

        <Field
          label="Plano alimentar"
          htmlFor={`hotels.${hotelIndex}.mealPlan`}
          error={hotelErrors?.mealPlan?.message}
        >
          <Select
            value={watch(`hotels.${hotelIndex}.mealPlan`)}
            onValueChange={(value) =>
              setValue(`hotels.${hotelIndex}.mealPlan`, value as (typeof mealPlanOptions)[number])
            }
          >
            <SelectTrigger id={`hotels.${hotelIndex}.mealPlan`} className="w-full">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {mealPlanOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </TwoColumnGrid>

      <div className="flex flex-col gap-2">
        <Label>Acomodações e valores</Label>
        {roomsArray.fields.map((roomField, roomIndex) => (
          <div key={roomField.id} className="flex items-start gap-2">
            <div className="flex-1">
              <Input
                aria-label={`Acomodação ${roomIndex + 1}`}
                placeholder="Ex.: Standard | R$ 10.000,00"
                {...register(`hotels.${hotelIndex}.rooms.${roomIndex}.text`)}
              />
              <FormFieldError message={hotelErrors?.rooms?.[roomIndex]?.text?.message} />
            </div>
            <Button
              type="button"
              variant="snow-remove"
              onClick={() => roomsArray.remove(roomIndex)}
            >
              Remover
            </Button>
          </div>
        ))}

        {typeof hotelErrors?.rooms?.message === "string" ? (
          <FormFieldError message={hotelErrors.rooms.message} />
        ) : null}

        <Button
          type="button"
          variant="snow-secondary"
          className="self-start"
          onClick={() => roomsArray.append({ id: createId(), text: "" })}
        >
          + Adicionar acomodação
        </Button>
      </div>

      <Button type="button" variant="snow-remove" className="self-start" onClick={onRemove}>
        Remover hotel
      </Button>
    </div>
  );
}
