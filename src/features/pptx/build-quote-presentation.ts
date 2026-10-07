import "server-only";

import pptxgen from "pptxgenjs";
import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveAgencyLogo } from "@/features/pptx/images/agency-logo";
import { resolveDestinationPhoto } from "@/features/pptx/images/destination-photo";
import { resolveHotelPhoto } from "@/features/pptx/images/hotel-photo";
import { resolveInstitutionalLogo } from "@/features/pptx/images/institutional-logo";
import { matchHotelsByName } from "@/features/pptx/match-hotels";
import { buildCoverSlide } from "@/features/pptx/slides/cover-slide";
import { buildFinalSlide } from "@/features/pptx/slides/final-slide";
import { buildFlightsSlide } from "@/features/pptx/slides/flights-slide";
import { buildHotelSlides } from "@/features/pptx/slides/hotel-slide";
import { buildInclusionsSlide } from "@/features/pptx/slides/inclusions-slide";
import { buildItinerarySlide } from "@/features/pptx/slides/itinerary-slide";
import { COVER_LOGO_BOX, FOOTER_LOGO_BOX, HOTEL_PHOTO_BOX, INNER_LOGO_BOX, SLIDE_HEIGHT_IN, SLIDE_WIDTH_IN } from "@/features/pptx/tokens";
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

  const [agencyLogoCover, agencyLogoInner, destinationPhoto, institutionalLogo] = await Promise.all([
    resolveAgencyLogo(supabase, form.agencyLogo, COVER_LOGO_BOX),
    resolveAgencyLogo(supabase, form.agencyLogo, INNER_LOGO_BOX),
    resolveDestinationPhoto(form.general.destination, aiOutput.destinationPhoto, {
      w: SLIDE_WIDTH_IN,
      h: SLIDE_HEIGHT_IN,
    }),
    resolveInstitutionalLogo(FOOTER_LOGO_BOX),
  ]);

  await buildCoverSlide(pres, {
    destination: form.general.destination,
    consultant: form.general.consultant,
    tagline: form.cover.tagline || aiOutput.coverTagline,
    period: formatPeriod(form.general.startDate, form.general.endDate),
    travelers: form.general.travelers || "Não informada",
    priceInfo: `${form.general.priceType}, em ${form.general.currency}`,
    agencyLogo: agencyLogoCover,
    destinationPhoto,
  });

  buildInclusionsSlide(pres, {
    inclusions: form.inclusions,
    destinationTitle: form.general.destination,
    destinationDescription: aiOutput.destinationDescription,
    destinationAttractions: aiOutput.destinationAttractions,
    agencyLogo: agencyLogoInner,
  });

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
    });
  }

  if (form.flights.enabled) {
    buildFlightsSlide(pres, {
      legs: form.flights.legs,
      baggage: form.flights.baggage,
      seat: form.flights.seat,
      services: form.flights.services,
      agencyLogo: agencyLogoInner,
    });
  }

  if (form.itinerary.enabled) {
    buildItinerarySlide(pres, {
      days: form.itinerary.days,
      agencyLogo: agencyLogoInner,
    });
  }

  buildFinalSlide(pres, { institutionalLogo });

  return (await pres.write({ outputType: "nodebuffer" })) as Buffer;
}
