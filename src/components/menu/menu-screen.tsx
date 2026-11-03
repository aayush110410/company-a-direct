"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { itemAvailability } from "@/domain/availability";
import { useLiveAvailability } from "@/lib/realtime/use-live-availability";
import type { MenuItemView, MenuView } from "@/server/repo/menu-mapper";
import { CartBar } from "./cart-bar";
import { CategoryTabs } from "./category-tabs";
import { ItemSheet } from "./item-sheet";
import { MenuItemRow } from "./menu-item-row";

/** The first two categories (the biryanis and haleem) get big photographs; the rest stay compact. */
const FEATURED_CATEGORIES = 2;

export function MenuScreen({ menu }: { menu: MenuView }) {
  const { outlet } = menu;
  const [open, setOpen] = useState<MenuItemView | null>(null);
  const stock = useLiveAvailability(outlet.id, {});

  // Re-derive availability when a kitchen flips an item's stock while the menu is open.
  const categories = useMemo(
    () =>
      menu.categories.map((c) => ({
        ...c,
        items: c.items.map((i) =>
          stock[i.id] ? { ...i, availability: itemAvailability({ status: stock[i.id]!, schedule: i.schedule, isActive: true }, new Date()) } : i,
        ),
      })),
    [menu.categories, stock],
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-32">
      <header className="pt-10 pb-6">
        <p className="text-sm text-muted">
          <Link href="/" className="underline decoration-seam underline-offset-4 hover:text-fg">
            Change area
          </Link>
        </p>
        <h1 className="mt-3 font-display text-[clamp(2.5rem,7vw,4.25rem)] leading-[1] tracking-[-0.02em]">{outlet.name}</h1>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <span>{outlet.area}</span>
          <span>FSSAI Lic. {outlet.fssaiLicence}</span>
          <span>Prices include 5% GST</span>
        </p>
        {!outlet.isAcceptingOrders && (
          <p role="status" className="mt-4 rounded-xl border border-risk/50 px-4 py-3 text-risk">
            This kitchen isn&rsquo;t taking orders right now. You can still browse the menu.
          </p>
        )}
      </header>

      {categories.length === 0 ? (
        <p className="py-16 text-muted">Nothing on the menu here just now. Please try another outlet.</p>
      ) : (
        <>
          <CategoryTabs categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
          {categories.map((c, index) => (
            <section key={c.id} id={`cat-${c.id}`} aria-labelledby={`cat-h-${c.id}`} className="scroll-mt-36 pt-12">
              <h2 id={`cat-h-${c.id}`} className="font-display text-3xl tracking-[-0.01em]">
                {c.name}
              </h2>
              <ul className={index < FEATURED_CATEGORIES ? "mt-6 grid gap-x-8 gap-y-12 sm:grid-cols-2" : "mt-4 grid gap-x-10 sm:grid-cols-2"}>
                {c.items.map((item) => (
                  <MenuItemRow key={item.id} item={item} featured={index < FEATURED_CATEGORIES} onChoose={() => setOpen(item)} />
                ))}
              </ul>
            </section>
          ))}
        </>
      )}

      <ItemSheet item={open} outlet={outlet} onClose={() => setOpen(null)} />
      <CartBar outletId={outlet.id} />
    </main>
  );
}
