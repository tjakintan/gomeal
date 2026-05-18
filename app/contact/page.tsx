"use client";

import { AppShell, SectionHeader, ButtonLink } from "@/components/WebUI";
import { Mail, MessageCircle, Bug, Home } from "lucide-react";

const SUPPORT_EMAIL = "support@gomeal.org";

export default function ContactPage() {
  return (
    <AppShell>
      <main className="max-w-[1120px] mx-auto px-4 py-16 space-y-10">

        <SectionHeader
          chip="Support"
          title="Contact GoMeal"
          subtitle="Need help, found a bug, or want to reach out? We usually respond within 24–48 hours."
        />

        {/* CARD */}
        <div className="max-w-2xl mx-auto rounded-[24px] border border-black/10 bg-white shadow-sm overflow-hidden">

          {/* TOP */}
          <div className="flex items-center justify-between p-5 border-b border-black/5">

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <Bug size={18} />
              </div>

              <div>
                <h2 className="text-lg font-semibold">Support Center</h2>
                <p className="text-sm text-gray-500">Email & feedback</p>
              </div>
            </div>
          </div>

          {/* EMAIL ROW */}
          <div className="p-5">

            <div className="rounded-[16px] bg-gray-50 border border-black/5 p-4 flex items-center justify-between gap-3">

              {/* LEFT */}
              <div className="flex items-center gap-3 min-w-0">

                <div className="w-9 h-9 rounded-lg bg-white border border-black/10 flex items-center justify-center">
                  <Mail size={16} />
                </div>

                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Email support</p>
                  <p className="font-medium truncate">{SUPPORT_EMAIL}</p>
                </div>

              </div>

              {/* RIGHT (COPY-STYLE BUTTON → NOW MAILTO) */}
              <button
                onClick={() =>
                  (window.location.href = `mailto:${SUPPORT_EMAIL}`)
                }
                className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-black/10 hover:bg-gray-100 active:scale-[0.98] transition"
              >
                <span className="text-sm">Email</span>
              </button>

            </div>

            {/* INFO */}
            <div className="mt-4 rounded-[16px] bg-gray-50 border border-black/5 p-4 text-sm text-gray-600 leading-relaxed">
              For bugs, include steps to reproduce, screenshots, and device info if possible.
              This helps us fix issues faster.
            </div>

          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-wrap gap-3 justify-center">
          <ButtonLink href="/" secondary>
            <Home size={20} />
          </ButtonLink>            
          <ButtonLink href="/privacy" >
            Privacy policy
          </ButtonLink>
          <ButtonLink href="/how-to-use" secondary>
            How to use
          </ButtonLink>
          <ButtonLink href="/newsletter">
                Newsletter
          </ButtonLink>
        </div>

      </main>
    </AppShell>
  );
}