"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { FormFieldError } from "@/features/quotes/components/FormFieldError";
import { ImageUpload } from "@/features/quotes/components/ImageUpload";
import { useQuoteDraft, readQuoteDraft } from "@/features/quotes/hooks/useQuoteDraft";
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

/**
 * Formulário completo de criação de orçamento (M2). Coleta e valida os
 * dados no client; a geração de fato (chamada à IA e montagem do .pptx)
 * acontece no backend em marcos futuros (M6/M7). Nenhum texto de prompt ou
 * lógica de IA é exposto aqui.
 */
export function QuoteForm() {
  const savedDraft = readQuoteDraft();

  const form = useForm<QuoteFormInput>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: savedDraft ?? quoteFormDefaultValues,
    mode: "onBlur",
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  const { clearDraft } = useQuoteDraft(watch);

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

  function onSubmit() {
    toast.success("Formulário válido. Pronto para gerar.");
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
            onChange={(value) => setValue("agencyLogo", value)}
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
                label="Trechos e horários"
                htmlFor="flights.legs"
                error={flightErrors?.legs?.message}
                className="sm:col-span-2"
                helperText="Um trecho por linha."
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
                onChange={(value) => setValue("flightImage", value)}
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
          {/* eslint-disable-next-line @next/next/no-img-element -- logo institucional fixa, servida de URL externa */}
          <img
            src={INSTITUTIONAL_LOGO_URL}
            alt="Logo institucional SNOW"
            className="h-8 w-auto shrink-0"
          />
          <span>{FIXED_INSTITUTIONAL_FOOTER}</span>
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
            <Button type="submit" variant="snow-generate" size="generate" disabled={isSubmitting}>
              Gerar orçamento
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                clearDraft();
                toast.info("Rascunho local removido.");
              }}
            >
              Limpar rascunho salvo
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
