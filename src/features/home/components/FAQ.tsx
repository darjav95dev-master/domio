"use client";

import { useState, useId } from "react";
import Link from "next/link";
import type { FAQPayload } from "@/features/home/types";

interface FAQProps {
  data: FAQPayload;
}

export function FAQ({ data }: FAQProps) {
  const { title, subtitle, items } = data;
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section id="faq" className="scroll-mt-[80px] py-section-lg px-6 md:px-[56px] bg-bg-canvas" aria-labelledby="faq-title">
      <div className="max-w-[1280px] mx-auto grid grid-cols-1 items-start lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-[96px]">
        {/* ── Left: section header ────────────────────────────────────── */}
        <div>
          <span className="inline-flex items-center gap-3 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-terracota before:h-px before:w-[32px] before:bg-gradient-to-r before:from-terracota before:to-transparent before:content-['']">
            Preguntas frecuentes
          </span>
          <h2
            id="faq-title"
            className="mt-5 font-display text-display-md text-fg-default"
          >
            {title}
          </h2>
          {subtitle && (
            <p className="mt-6 font-sans text-[19px] leading-[1.6] text-fg-muted max-w-[52ch]">
              {subtitle}
            </p>
          )}
          <Link
            href="/contacto"
            className="group mt-8 inline-flex items-center gap-[10px] rounded-pill border-[1.5px] border-fg-default px-[26.5px] py-[13.5px] font-sans text-[15px] font-medium tracking-[-0.005em] text-fg-default transition-all duration-deliberate ease-standard hover:bg-fg-default hover:text-bg-canvas"
          >
            Ponerse en contacto
            <span className="transition-transform duration-250 group-hover:translate-x-[3px]">
              →
            </span>
          </Link>
        </div>

        {/* ── Right: accordion ────────────────────────────────────────── */}
        <div role="region" aria-label="Preguntas frecuentes">
          <div className="border-t border-border-default">
            {items.map((item, i) => {
              const isOpen = openIndex === i;
              const headingId = `${baseId}-h-${i}`;
              const panelId = `${baseId}-p-${i}`;

              return (
                <div
                  key={i}
                  className="border-b border-border-default"
                >
                  <h3>
                    <button
                      id={headingId}
                      type="button"
                      onClick={() => toggle(i)}
                      className="w-full flex items-center justify-between gap-5 py-7 px-1 text-left font-display text-[18px] font-normal tracking-[-0.015em] text-fg-default transition-colors duration-standard ease-standard hover:text-fg-muted focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2 focus-visible:rounded-[4px]"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                    >
                      <span>{item.question}</span>
                      <span
                        className={`w-[30px] h-[30px] flex items-center justify-center rounded-pill border border-fg-default shrink-0 transition-transform duration-deliberate ease-standard ${
                          isOpen
                            ? "bg-fg-default text-bg-surface rotate-45"
                            : "bg-transparent text-fg-default"
                        }`}
                        aria-hidden="true"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <line x1="8" y1="3" x2="8" y2="13" />
                          <line x1="3" y1="8" x2="13" y2="8" />
                        </svg>
                      </span>
                    </button>
                  </h3>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={headingId}
                    className={`overflow-hidden transition-all duration-deliberate ease-standard ${
                      isOpen ? "max-h-[320px] opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <p className="px-1 pb-7 font-sans text-[15px] leading-[1.65] text-fg-subtle">
                      {item.answer}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
