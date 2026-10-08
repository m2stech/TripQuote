import type { Metadata } from "next";

import { Hero } from "@/components/hero";
import { MyAccountScreen } from "@/features/auth/components/MyAccountScreen";

export const metadata: Metadata = {
  title: "Minha conta — TripQuote",
};

export default function MyAccountPage() {
  return (
    <main className="bg-background min-h-full pb-16">
      <div className="snow-container flex flex-col gap-8 px-4 pt-6 sm:px-6">
        <Hero title="Minha conta" subtitle="Gerencie as configurações da sua conta." />
        <MyAccountScreen />
      </div>
    </main>
  );
}
