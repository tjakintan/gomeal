import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { label } from "framer-motion/client";

const navItems = [
  { href: "/how-to-use", label: "Hows" },
  { href: "/privacy", label: "Privacy" },
  { href: "/contact", label: "Contact"},
  { href: "/newsletter", label: "newsletter"}
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 px-4">
      
      {/* TOP BAR */}
      <header className="sticky top-4 z-50 mx-auto max-w-[1120px]">
        <div className="flex items-center justify-between rounded-full border border-black/10 bg-white/70 px-4 py-2 backdrop-blur-xl shadow-lg">

          {/* BRAND */}
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-lg"
          >
            <Image
              src="/logo/gomeal_app.png"
              alt="GoMeal"
              width={36}
              height={36}
              className="rounded-xl"
            />
          </Link>

          {/* NAV 
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-black transition"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          */}
          
        </div>
      </header>

      {/* PAGE CONTENT */}
      <main className="mx-auto max-w-[1120px] pt-10">
        {children}
      </main>
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  chip,
}: {
  title: string;
  subtitle?: string;
  chip?: string;
}) {
  return (
    <div className="section-header">
      {chip ? <span className="caption-chip">{chip}</span> : null}
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  );
}

export function ButtonLink({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link href={href} className={secondary ? "button button-secondary" : "button"}>
      {children}
    </Link>
  );
}

export function FeatureCard({
  title,
  body,
  meta,
}: {
  title: string;
  body: string;
  meta?: string;
}) {
  return (
    <article className="feature-card">
      {meta ? <span>{meta}</span> : null}
      <h2>{title}</h2>
      <p>{body}</p>
    </article>
  );
}

export function StepCard({
  index,
  title,
  body,
}: {
  index: string;
  title: string;
  body: string;
}) {
  return (
    <article className="step-card">
      <strong>{index}</strong>
      <div>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
    </article>
  );
}
