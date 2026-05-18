"use client";

import {
  AppShell,
  ButtonLink,
  SectionHeader,
  StepCard,
} from "@/components/WebUI";

import Image from "next/image";
import { useState } from "react";
import { useTheme, colors } from "@/public/fonts/useTheme";
import { Home } from "lucide-react";

const steps = [
  {
    index: "01",
    title: "Create your profile",
    body:
      "Start by filling out some basic information like your name, age, and birthday — then move on to the fun part: creating your avatar.",
  },
  {
    index: "02",
    title: "Browse the feed",
    body:
      "Browse the specially curated feed to discover some new recipes"
  },
  {
    index: "03",
    title: "Post a dish",
    body:
      "Add media, ingredients, nutrition notes, dietary tags, and steps. Keep the post practical enough for someone else to cook.",
  },
  {
    index: "04",
    title: "Cook with steps",
    body:
      "Open a recipe in cook mode to follow each step, check ingredients, and keep timers close while you are in the kitchen.",
  },
  {
    index: "05",
    title: "Tune settings",
    body:
      "Adjust food, feed, notification, and privacy settings whenever your preferences change.",
  },
  {
    index: "06",
    title: "Save what works",
    body:
      "Like, repost, and most importantly cook meals so GoMeal can keep your recommendations useful over time.",
  },
];

const postSteps = [
  {
    index: "01",
    title: "Start with some info",
    body: "Enter basic details like your name, age, and birthday, then create your avatar to personalize your profile.",
    src: "/steps/step1.PNG",
  },
  {
    index: "02",
    title: "List ingredients used",
    body: "Add all the ingredients used in your recipe so others know exactly what they need.",
    src: "/steps/step2.PNG",
  },
  {
    index: "03",
    title: "Write the steps taken",
    body: "Explain each cooking step clearly so others can easily follow and recreate the meal.",
    src: "/steps/step4.PNG",
  },
  {
    index: "04",
    title: "Set the dietary info",
    body: "Add dietary info, and any other useful recipe info before posting.",
    src: "/steps/step5.PNG",
  },
];

export default function HowToUsePage() {
  const { theme } = useTheme();
  const c = colors[theme];

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <AppShell>
      <main
        className={`max-w-[1120px] mx-auto px-4 py-16 space-y-20 transition-colors duration-300 ${c.bg} ${c.text}`}
      >

        <section className="space-y-8">
          <SectionHeader
            chip="Guide"
            title="How to use GoMeal"
            subtitle="A simple walkthrough for getting from profile setup to posting and cooking recipes."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {steps.map((step) => (
              <div
                key={step.index}
                className={`p-4 rounded-[20px] border ${c.border} ${c.card}`}
              >
                <StepCard {...step} />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-8">
          <SectionHeader
            chip="Posting"
            title="How to post on GoMeal"
            subtitle="A short guide for creating a food post that looks clean and is easy to follow."
          />

          <div className="space-y-4">
            {postSteps.map((step) => (
              <div
                key={step.index}
                className={`flex items-center justify-between gap-4 p-4 rounded-[20px] border ${c.border} ${c.card}`}
              >
                {/* TEXT */}
                <div className="flex-1 min-w-0">
                  <StepCard {...step} />
                </div>

                {/* IMAGE */}
                {step.src && (
                  <button
                    onClick={() => setSelectedImage(step.src)}
                    className="shrink-0"
                  >
                    <Image
                      src={step.src}
                      alt={`GoMeal post step ${step.index}`}
                      width={120}
                      height={200}
                      className="h-[200px] w-[120px] object-cover rounded-[18px] shadow-md"
                    />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ================= MODAL ================= */}
        {selectedImage && (
          <button
            className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6"
            onClick={() => setSelectedImage(null)}
          >
            <div className="max-w-[420px] rounded-[28px] overflow-hidden">
              <Image
                src={selectedImage}
                alt="Step preview"
                width={420}
                height={800}
                className="w-full h-auto"
              />
            </div>
          </button>
        )}

        <div className="flex flex-wrap gap-3 pt-4">
          <ButtonLink href="/" secondary>
            <Home size={20} />
          </ButtonLink>
          <ButtonLink href="/privacy">
            Read privacy
          </ButtonLink>
          <ButtonLink href="/contact" secondary>
            Contact
          </ButtonLink>
          <ButtonLink href="/newsletter">
                Newsletter
          </ButtonLink>
        </div>

      </main>
    </AppShell>
  );
}