"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/** Sticky guide strip naming the section you're in, and a quick jump to the others. */
export function CategoryTabs({ categories }: { categories: { id: string; name: string }[] }) {
  const [active, setActive] = useState(categories[0]?.id);
  const strip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sections = categories.map((c) => document.getElementById(`cat-${c.id}`)).filter((el): el is HTMLElement => Boolean(el));
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id.slice(4));
      },
      { rootMargin: "-140px 0px -55% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [categories]);

  useEffect(() => {
    strip.current?.querySelector<HTMLElement>(`[data-cat="${active}"]`)?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [active]);

  return (
    <nav aria-label="Menu sections" className="sticky top-16 z-20 -mx-5 border-b border-seam bg-bg/90 px-5 backdrop-blur-md">
      <div ref={strip} className="flex gap-1 overflow-x-auto py-2 [scrollbar-width:none]">
        {categories.map((c) => (
          <a
            key={c.id}
            href={`#cat-${c.id}`}
            data-cat={c.id}
            aria-current={active === c.id ? "true" : undefined}
            className={cn(
              "flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition-colors duration-200",
              active === c.id ? "bg-fg text-bg" : "text-muted hover:text-fg",
            )}
          >
            {c.name}
          </a>
        ))}
      </div>
    </nav>
  );
}
