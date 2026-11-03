"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/outbox", label: "Messages" },
  { href: "/admin/demo", label: "Demo tools" },
  { href: "/kitchen", label: "Kitchens" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto text-sm">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={path.startsWith(l.href) ? "page" : undefined}
          className={cn("flex min-h-11 items-center rounded-lg px-3 font-medium whitespace-nowrap", path.startsWith(l.href) ? "bg-fg text-bg" : "text-muted hover:text-fg")}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
