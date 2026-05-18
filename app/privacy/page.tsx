"use client";

import { AppShell, ButtonLink, SectionHeader } from "@/components/WebUI";
import { Home } from "lucide-react";
const policies = [
  {
    title: "Information we collect",
    body: "GoMeal may collect account details, profile preferences, recipe content, uploaded media, dietary settings, saved posts, and basic device or usage information needed to operate the app.",
  },
  {
    title: "How we use it",
    body: "We use information to provide your account, personalize food recommendations, publish posts you choose to share, improve app quality, prevent abuse, and support core safety and account features.",
  },
  {
    title: "Shared content",
    body: "Recipes, photos, videos, profile details, and comments you publish may be visible to other users depending on your settings and the feature you use.",
  },
  {
    title: "Service providers",
    body: "We may use trusted infrastructure providers, such as Amazon Web Services, for hosting, storage, and other essential services required to operate GoMeal. These providers only process information as necessary to support and maintain their services.",
  },
  {
    title: "Your choices",
    body: "You can update profile details, delete your account, change notification settings, adjust food preferences, and request account or data support through GoMeal support.",
  },
  {
    title: "Data security",
    body: "We take reasonable steps to protect account and app information, but no online service can guarantee absolute security.",
  },
  {
    title: "Children's privacy",
    body: "GoMeal is not intended for children under 13. We do not knowingly collect personal information from children.",
  },
  {
    title: "Policy updates",
    body: "We may update this privacy policy from time to time. Continued use of GoMeal after changes means you accept the updated policy.",
  },
];

export default function PrivacyPage() {
  return (
    <AppShell>
      <main className="max-w-[1120px] mx-auto px-4 py-16 space-y-12">

        {/* HEADER */}
        <SectionHeader
          chip="Privacy"
          title="Privacy policy"
          subtitle="This page explains the basic information GoMeal uses to run the app and support a food-focused community."
        />

        <p className="text-sm text-gray-500">
          Effective date: May 17, 2026
        </p>

        {/* GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {policies.map((policy) => (
            <article
              key={policy.title}
              className="rounded-[20px] bg-gray-100 p-5 space-y-3 shadow-sm border border-black/5"
            >

              <h2 className="text-xl font-bold tracking-tight">
                {policy.title}
              </h2>

              <p className="text-sm text-gray-600 leading-relaxed">
                {policy.body}
              </p>
            </article>
          ))}
        </div>

        {/* ACTIONS */}
        <div className="flex justify-center flex-wrap gap-3 pt-6">
          <ButtonLink href="/" secondary>
            <Home size={20} />
          </ButtonLink>
          <ButtonLink href="/how-to-use">
            How to use
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