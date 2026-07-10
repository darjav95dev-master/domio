"use client";

import { useState, useId } from "react";
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
    <section className="py-section-lg px-6 md:px-[56px]" aria-labelledby="faq-title">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-16">
        {/* ── Left: section header ────────────────────────────────────── */}
        <div>
          <span className="font-mono text-[13px] uppercase tracking-[0.18em] text-accent-default relative pl-6 before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[20px] before:h-[2px] before:bg-gradient-to-r before:from-accent-default before:to-transparent">
            FAQ
          </span>
          <h2
            id="faq-title"
            className="font-display text-display-md text-fg-default mt-4 mb-4"
          >
            {title}
          </h2>
          {subtitle && (
            <p className="font-sans text-body-md text-fg-muted max-w-[65ch]">
              {subtitle}
            </p>
          )}
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
                      className="w-full flex items-center justify-between gap-4 py-7 px-1 text-left font-display text-body-lg text-fg-default transition-colors duration-standard ease-standard hover:text-accent-default focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2 focus-visible:rounded-[4px]"
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
                    <p className="px-1 pb-7 font-sans text-body-md text-fg-subtle">
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
