"use client";

import {
  AppShell,
  ButtonLink,
  FeatureCard,
  SectionHeader,
} from "@/components/WebUI";

import { useTheme, colors } from "@/public/fonts/useTheme";

export default function Home() {
  const { theme } = useTheme();
  const c = colors[theme];

  return (
    <AppShell>
      <main
        className={`max-w-[1120px] mx-auto px-4 py-16 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center transition-colors duration-300 ${c.text}`}
      >

        <section className="space-y-8">

        <SectionHeader
          chip="Welcome"
          title="Cook, post, and find meals faster."
          subtitle="
            GoMeal is a food-first app for recipes, cooking videos, meal photos, and practical discovery.
            I built GoMeal because I love cooking and believe food is an essential part of everyday life.
            People always asked me how I made the meals I posted — now you can see, cook, and share them too.
            Have fun, and stay tuned for what’s coming next.
          "
        />

        <SectionHeader
          title="Mission"
          subtitle="
            Most social platforms mix food content with everything else, making it harder to actually cook.
            GoMeal removes that noise and keeps the experience centered around food — recipes, ingredients,
            cooking steps, and real meals people actually make every day.
          "
        />

          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/how-to-use">
              How to use GoMeal
            </ButtonLink>
            <ButtonLink href="/privacy" secondary>
              Privacy policy
            </ButtonLink>
            <ButtonLink href="/contact">
              Contact
            </ButtonLink>
            <ButtonLink href="/newsletter" secondary>
              Newsletter
            </ButtonLink>
          </div>
        </section>

      </main>

      <footer className={`text-center text-sm py-10 ${c.muted}`}>
        &copy; {new Date().getFullYear()} goMeal. All rights reserved.
      </footer>
    </AppShell>
  );
}