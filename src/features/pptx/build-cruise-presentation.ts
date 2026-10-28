import "server-only";

import pptxgen from "pptxgenjs";
import type { SupabaseClient } from "@supabase/supabase-js";

import { downloadAgencyLogoBuffer, resolveAgencyLogo } from "@/features/pptx/images/agency-logo";
import { resolveCabinPhoto } from "@/features/pptx/images/cabin-photo";
import { resolveInstitutionalBranding } from "@/features/pptx/images/institutional-logo";
import { resolvePortPhoto } from "@/features/pptx/images/port-photo";
import { resolveShipPhoto } from "@/features/pptx/images/ship-photo";
import { findPortByName } from "@/features/pptx/match-ports";
import { buildCabinsSlide, CABIN_PHOTO_BOX, type CabinWithPhoto } from "@/features/pptx/slides/cabins-slide";
import { buildCruiseCoverSlide } from "@/features/pptx/slides/cruise-cover-slide";
import { buildCruiseInclusionsSlide } from "@/features/pptx/slides/cruise-inclusions-slide";
import { buildCruiseItinerarySlide } from "@/features/pptx/slides/cruise-itinerary-slide";
import { buildCruiseSummarySlide } from "@/features/pptx/slides/cruise-summary-slide";
import { buildFinalSlide } from "@/features/pptx/slides/final-slide";
import { buildOnboardExperienceSlide } from "@/features/pptx/slides/onboard-experience-slide";
import { buildPortPhotosSlide, type PortPhotoEntry } from "@/features/pptx/slides/port-photos-slide";
import { buildShipProfileSlide } from "@/features/pptx/slides/ship-profile-slide";
import { COVER_LOGO_BOX, FOOTER_LOGO_BOX, INNER_LOGO_BOX, SLIDE_HEIGHT_IN, SLIDE_WIDTH_IN } from "@/features/pptx/tokens";
import { DEFAULT_THEME, extractThemeFromLogo } from "@/features/pptx/theme/extract-theme";
import type { CruiseFormValues } from "@/features/quotes/schemas/cruise-form.schema";
import type { CruiseGenerationOutput } from "@/features/quotes/schemas/generation-output.schema";
import type { QuoteRecord } from "@/features/quotes/schemas/quote.schema";
import type { Database } from "@/lib/supabase/types";

/** `QuoteRecord` restrito ao orçamento de cruzeiro (despachado por `generation-orchestrator.ts`). */
export type CruiseQuoteRecord = Omit<QuoteRecord, "form" | "aiOutput"> & {
  form: CruiseFormValues;
  aiOutput?: CruiseGenerationOutput | null;
};

function formatPeriod(startDate: string, endDate: string): string {
  const format = (value: string) => {
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year}`;
  };
  return `${format(startDate)} a ${format(endDate)}`;
}

/**
 * Orquestra a montagem determinística do .pptx de Cruzeiro, mesmo padrão de
 * `buildQuotePresentation` (terrestre): resolve todas as imagens primeiro,
 * depois monta os 8 slides em código — nenhuma decisão de layout é feita
 * pela IA, só os textos/URLs que ela já produziu (`generateCruiseContent`).
 */
export async function buildCruisePresentation(
  supabase: SupabaseClient<Database>,
  quote: CruiseQuoteRecord,
): Promise<Buffer> {
  if (quote.status !== "done" || !quote.aiOutput) {
    throw new Error("Orçamento sem geração concluída.");
  }

  const { form, aiOutput } = quote;

  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";

  const [agencyLogoBuffer, agencyLogoCover, agencyLogoInner, shipPhoto, institutionalBranding] = await Promise.all([
    downloadAgencyLogoBuffer(supabase, form.agencyLogo),
    resolveAgencyLogo(supabase, form.agencyLogo, COVER_LOGO_BOX),
    resolveAgencyLogo(supabase, form.agencyLogo, INNER_LOGO_BOX),
    resolveShipPhoto(form.general.shipName, form.general.cruiseLine, aiOutput.shipPhoto, {
      w: SLIDE_WIDTH_IN,
      h: SLIDE_HEIGHT_IN,
    }),
    resolveInstitutionalBranding(supabase, FOOTER_LOGO_BOX),
  ]);

  const theme = agencyLogoBuffer ? await extractThemeFromLogo(agencyLogoBuffer) : DEFAULT_THEME;

  await buildCruiseCoverSlide(pres, {
    shipName: form.general.shipName,
    cruiseLine: form.general.cruiseLine,
    tagline: form.cover.tagline || aiOutput.coverTagline,
    period: formatPeriod(form.general.embarkationDate, form.general.disembarkationDate),
    occupancy: form.general.occupancy,
    currency: form.general.currency,
    agencyLogo: agencyLogoCover,
    shipPhoto,
    theme,
  });

  buildCruiseSummarySlide(pres, {
    shipName: form.general.shipName,
    cruiseLine: form.general.cruiseLine,
    period: formatPeriod(form.general.embarkationDate, form.general.disembarkationDate),
    destination: form.general.destination,
    embarkationPort: form.general.embarkationPort,
    disembarkationPort: form.general.disembarkationPort,
    tripProfile: form.general.tripProfile,
    occupancy: form.general.occupancy,
    tripSummary: aiOutput.tripSummary,
    agencyLogo: agencyLogoInner,
    theme,
  });

  buildCruiseItinerarySlide(pres, {
    stops: form.itinerary,
    agencyLogo: agencyLogoInner,
    theme,
  });

  // Fotos dos portos (até 6, para não disparar buscas externas demais num
  // roteiro longo): casadas por nome com `aiOutput.ports`, sem bloquear a
  // montagem do slide por falha de uma busca isolada. Dias de navegação sem
  // escala (sem entrada correspondente em `ports`) não geram card.
  const uniquePortNames = [...new Set(form.itinerary.map((stop) => stop.portOrDestination))].slice(0, 6);
  const portPhotoEntries = (
    await Promise.all(
      uniquePortNames.map(async (portName): Promise<PortPhotoEntry | null> => {
        const port = findPortByName(aiOutput.ports, portName);
        if (!port) return null;
        const photo = await resolvePortPhoto(portName, port.photo, { w: 3, h: 2 });
        return { name: port.name, shortDescription: port.shortDescription, photo };
      }),
    )
  ).filter((entry): entry is PortPhotoEntry => entry !== null);

  buildPortPhotosSlide(pres, {
    ports: portPhotoEntries,
    agencyLogo: agencyLogoInner,
    theme,
  });

  await buildShipProfileSlide(pres, {
    shipName: form.general.shipName,
    shipProfile: aiOutput.shipProfile,
    shipPhoto,
    agencyLogo: agencyLogoInner,
    theme,
  });

  buildOnboardExperienceSlide(pres, {
    onboardExperience: aiOutput.onboardExperience,
    agencyLogo: agencyLogoInner,
    theme,
  });

  // Foto de cabine vem só do upload feito no formulário (sem busca externa —
  // não há fonte pública de fotos por categoria de cabine, diferente de
  // navio/porto/destino).
  const cabinsWithPhoto: CabinWithPhoto[] = await Promise.all(
    form.fare.cabins.map(async (cabin) => ({
      cabin,
      photo: await resolveCabinPhoto(supabase, cabin.photo, CABIN_PHOTO_BOX),
    })),
  );

  buildCabinsSlide(pres, {
    cabins: cabinsWithPhoto,
    defaultOccupancy: form.general.occupancy,
    agencyLogo: agencyLogoInner,
    theme,
  });

  buildCruiseInclusionsSlide(pres, {
    inclusions: form.inclusions,
    agencyLogo: agencyLogoInner,
    theme,
  });

  buildFinalSlide(pres, {
    institutionalLogo: institutionalBranding.logo,
    institutionalFooterText: institutionalBranding.footerText,
    paymentTerms: form.paymentTerms,
    theme,
  });

  return (await pres.write({ outputType: "nodebuffer" })) as Buffer;
}
