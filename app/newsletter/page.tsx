"use client";
import { AppShell, SectionHeader, ButtonLink } from "@/components/WebUI";
import { Home, Mail, Bell, BellOff, Newspaper } from "lucide-react";
import { subscribeToNewsletter, unsubscribeFromNewsletter } from "@/api/newsletter.api";
import { useState } from "react";

export default function NewsletterPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "subscribed" | "unsubscribed" | "error">("idle");

  const handleSubscribe = async () => {
    if (!email) return;
    setStatus("loading");
    const ok = await subscribeToNewsletter(email, { source: "web" });
    setStatus(ok ? "subscribed" : "error");
  };

  const handleUnsubscribe = async () => {
    if (!email) return;
    setStatus("loading");
    const ok = await unsubscribeFromNewsletter(email);
    setStatus(ok ? "unsubscribed" : "error");
  };

  const isLoading = status === "loading";

  return (
    <AppShell>
      <main className="max-w-[1120px] mx-auto px-4 py-16 space-y-10">
        <SectionHeader
          chip="Newsletter"
          title="Stay in the loop"
          subtitle="Get updates on new features, recipes, and tips — straight to your inbox. No spam, ever."
        />

        {/* CARD */}
        <div className="max-w-2xl mx-auto rounded-[24px] border border-black/10 bg-white shadow-sm overflow-hidden">
          {/* TOP */}
          <div className="flex items-center justify-between p-5 border-b border-black/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <Newspaper size={18} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Get the latest news</h2>
                <p className="text-sm text-gray-500">Updates & announcements</p>
              </div>
            </div>
          </div>

          {/* BODY */}
          <div className="p-5 space-y-3">
            {/* EMAIL INPUT ROW */}
            <div className="rounded-[16px] bg-gray-50 border border-black/5 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white border border-black/10 flex items-center justify-center shrink-0">
                <Mail size={16} />
              </div>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setStatus("idle"); }}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400 min-w-0"
              />
            </div>

            {/* ACTIONS */}
            <div className="flex gap-2">
              <button
                onClick={handleSubscribe}
                disabled={isLoading || !email}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-black text-white text-sm font-medium hover:bg-gray-900 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Bell size={15} />
                Subscribe
              </button>
              <button
                onClick={handleUnsubscribe}
                disabled={isLoading || !email}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-black/10 text-sm hover:bg-gray-100 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <BellOff size={15} />
                Unsubscribe
              </button>
            </div>

            {/* FEEDBACK */}
            {status === "subscribed" && (
              <p className="text-sm text-green-600 text-center">You're subscribed! Welcome aboard.</p>
            )}
            {status === "unsubscribed" && (
              <p className="text-sm text-gray-500 text-center">You've been unsubscribed successfully.</p>
            )}
            {status === "error" && (
              <p className="text-sm text-red-500 text-center">Something went wrong. Please try again.</p>
            )}

            {/* INFO */}
            <div className="rounded-[16px] bg-gray-50 border border-black/5 p-4 text-sm text-gray-600 leading-relaxed">
              We send occasional updates about new GoMeal features and cooking tips. You can unsubscribe at any time.
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-wrap gap-3 justify-center">
          <ButtonLink href="/" secondary>
            <Home size={20} />
          </ButtonLink>
          <ButtonLink href="/privacy">
            Privacy policy
          </ButtonLink>
          <ButtonLink href="/contact" secondary>
            Contact us
          </ButtonLink>
           <ButtonLink href="/how-to-use" >
            How to use
          </ButtonLink>         
        </div>
      </main>
    </AppShell>
  );
}