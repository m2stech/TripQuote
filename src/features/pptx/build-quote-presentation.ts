import "server-only";

import pptxgen from "pptxgenjs";
import type { SupabaseClient } from "@supabase/supabase-js";

import { downloadAgencyLogoBuffer, resolveAgencyLogo } from "@/features/pptx/images/agency-logo";
import { resolveDestinationPhoto } from "@/features/pptx/images/destination-photo";
import { resolveHotelPhoto } from "@/features/pptx/images/hotel-photo";
import { resolveInstitutionalBranding } from "@/features/pptx/images/institutional-logo";
import { matchHotelsByName } from "@/features/pptx/match-hotels";
import { resolveFlightItinerary } from "@/features/pptx/resolve-flight-itinerary";
import { buildCoverSlide } from "@/features/pptx/slides/cover-slide";
import { buildDestinationSlide } from "@/features/pptx/slides/destination-slide";
import { buildFinalSlide } from "@/features/pptx/slides/final-slide";
import { buildFlightsSlide } from "@/features/pptx/slides/flights-slide";
import { buildHotelSlides } from "@/features/pptx/slides/hotel-slide";
import { buildInclusionsSlide } from "@/features/pptx/slides/inclusions-slide";
import { buildItinerarySlide } from "@/features/pptx/slides/itinerary-slide";
import { buildPackagePriceSlide } from "@/features/pptx/slides/package-price-slide";
import { COVER_LOGO_BOX, FOOTER_LOGO_BOX, HOTEL_PHOTO_BOX, INNER_LOGO_BOX, SLIDE_HEIGHT_IN, SLIDE_WIDTH_IN } from "@/features/pptx/tokens";
import { DEFAULT_THEME, extractThemeFromLogo } from "@/features/pptx/theme/extract-theme";
import type { QuoteRecord } from "@/features/quotes/schemas/quote.schema";
import type { Database } from "@/lib/supabase/types";

function formatPeriod(startDate: string, endDate: string): string {
  const format = (value: string) => {
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year}`;
  };
  return `${format(startDate)} a ${format(endDate)}`;
}

/**
 * Orquestra a montagem determinística do .pptx a partir de um `QuoteRecord`
 * com geração concluída (`status: "done"` e `aiOutput` presente). Resolve
 * todas as imagens primeiro (logo, foto de destino, fotos de hotel,
 * instituição), depois monta os slides em código — nenhuma decisão de
 * layout é feita pela IA, só os textos/URLs que ela já produziu no M6.
 */
export async function buildQuotePresentation(
  supabase: SupabaseClient<Database>,
  quote: QuoteRecord,
): Promise<Buffer> {
  if (quote.status !== "done" || !quote.aiOutput) {
    throw new Error("Orçamento sem geração concluída.");
  }

  const { form, aiOutput } = quote;

  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";

  const [agencyLogoBuffer, agencyLogoCover, agencyLogoInner, destinationPhoto, institutionalBranding] =
    await Promise.all([
      downloadAgencyLogoBuffer(supabase, form.agencyLogo),
      resolveAgencyLogo(supabase, form.agencyLogo, COVER_LOGO_BOX),
      resolveAgencyLogo(supabase, form.agencyLogo, INNER_LOGO_BOX),
      resolveDestinationPhoto(form.general.destination, aiOutput.destinationPhoto, {
        w: SLIDE_WIDTH_IN,
        h: SLIDE_HEIGHT_IN,
      }),
      resolveInstitutionalBranding(supabase, FOOTER_LOGO_BOX),
    ]);

  const theme = agencyLogoBuffer ? await extractThemeFromLogo(agencyLogoBuffer) : DEFAULT_THEME;

  await buildCoverSlide(pres, {
    destination: form.general.destination,
    consultant: form.general.consultant,
    tagline: form.cover.tagline || aiOutput.coverTagline,
    period: formatPeriod(form.general.startDate, form.general.endDate),
    travelers: form.general.travelers || "Não informada",
    priceInfo: `${form.general.priceType}, em ${form.general.currency}`,
    agencyLogo: agencyLogoCover,
    destinationPhoto,
    theme,
  });

  buildDestinationSlide(pres, {
    destinationTitle: form.general.destination,
    destinationDescription: aiOutput.destinationDescription,
    destinationAttractions: aiOutput.destinationAttractions,
    agencyLogo: agencyLogoInner,
    theme,
  });

  buildInclusionsSlide(pres, {
    inclusions: form.inclusions,
    agencyLogo: agencyLogoInner,
    theme,
  });

  if (form.general.isCircuit) {
    buildPackagePriceSlide(pres, {
      packagePriceTotal: form.general.packagePriceTotal,
      priceType: form.general.priceType,
      currency: form.general.currency,
      agencyLogo: agencyLogoInner,
      theme,
    });
  }

  const matchedHotels = matchHotelsByName(form.hotels, aiOutput.hotels);
  for (const [index, matched] of matchedHotels.entries()) {
    const photo = await resolveHotelPhoto(
      matched.form.name,
      matched.ai?.location ?? null,
      matched.ai?.photo ?? null,
      HOTEL_PHOTO_BOX,
    );
    buildHotelSlides(pres, {
      optionNumber: index + 1,
      name: matched.form.name,
      city: matched.form.city || null,
      mealPlan: matched.form.mealPlan,
      rooms: matched.form.rooms,
      shortDescription: matched.ai?.shortDescription ?? null,
      location: matched.ai?.location ?? null,
      category: matched.ai?.category ?? null,
      tripadvisorRating: matched.ai?.tripadvisorRating ?? null,
      priceContext: `${form.general.priceType}, em ${form.general.currency}`,
      photo,
      photoSourceUrl: matched.ai?.photo.sourceUrl ?? null,
      agencyLogo: agencyLogoInner,
      isCircuit: form.general.isCircuit,
      theme,
    });
  }

  if (form.flights.enabled) {
    const flightItinerary = resolveFlightItinerary(form.flights.legs, aiOutput.flightItinerary);
    buildFlightsSlide(pres, {
      legs: flightItinerary.legs,
      rawLines: flightItinerary.rawLines,
      baggage: form.flights.baggage,
      seat: form.flights.seat,
      services: form.flights.services,
      agencyLogo: agencyLogoInner,
      theme,
    });
  }

  if (form.itinerary.enabled) {
    buildItinerarySlide(pres, {
      days: form.itinerary.days,
      agencyLogo: agencyLogoInner,
      theme,
    });
  }

  buildFinalSlide(pres, {
    institutionalLogo: institutionalBranding.logo,
    institutionalFooterText: institutionalBranding.footerText,
    paymentTerms: form.paymentTerms,
    theme,
  });

  return (await pres.write({ outputType: "nodebuffer" })) as Buffer;
}
