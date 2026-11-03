"use client";

import { Plus, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, buttonClasses, DietMark, EmptyState } from "@/components/ui";
import { formatINR } from "@/domain/money";
import { cn } from "@/lib/cn";
import type { AdminItemRow } from "@/server/repo/admin";

export function ItemTable({
  items,
  cities,
  categories,
  outletCount,
}: {
  items: AdminItemRow[];
  cities: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  outletCount: number;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [diet, setDiet] = useState("all");

  const shown = useMemo(
    () =>
      items.filter(
        (i) =>
          (cat === "all" || i.categoryId === cat) &&
          (diet === "all" || i.diet === diet) &&
          i.name.toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [items, q, cat, diet],
  );

  return (
    <main>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Menu</h1>
          <p className="mt-1 text-muted">
            One menu for all {outletCount} kitchens. Prices are set per city and include 5% GST.
          </p>
        </div>
        <Link href="/admin/menu/new" className={buttonClasses("primary", "lg")}>
          <Plus className="size-4" aria-hidden />
          New dish
        </Link>
      </header>

      <div className="mt-8 flex flex-wrap gap-2">
        <label className="relative min-w-60 flex-1">
          <span className="sr-only">Search dishes</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dishes" className="h-11 w-full rounded-lg border border-seam bg-raised pr-3 pl-9 focus:border-accent focus:outline-none" />
        </label>
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category" className="h-11 rounded-lg border border-seam bg-raised px-3">
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={diet} onChange={(e) => setDiet(e.target.value)} aria-label="Diet" className="h-11 rounded-lg border border-seam bg-raised px-3">
          <option value="all">Veg and non-veg</option>
          <option value="veg">Vegetarian</option>
          <option value="non_veg">Non-vegetarian</option>
          <option value="egg">Contains egg</option>
        </select>
      </div>

      {shown.length === 0 ? (
        <EmptyState title="No dishes match" body="Try a different search or clear the filters." />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-seam bg-raised">
          <table className="w-full min-w-[44rem] text-left text-[0.9375rem]">
            <thead className="border-b border-seam text-sm text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Dish</th>
                <th className="px-4 py-3 font-medium">Category</th>
                {cities.map((c) => (
                  <th key={c.id} className="px-4 py-3 text-right font-medium">
                    {c.name}
                  </th>
                ))}
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((i) => (
                <tr key={i.id} className={cn("border-b border-seam last:border-0 hover:bg-surface", !i.isActive && "opacity-55")}>
                  <td className="px-4 py-2">
                    <Link href={`/admin/menu/${i.id}`} className="flex items-center gap-3 font-semibold hover:underline">
                      <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-surface">
                        {i.photoUrl && <Image src={i.photoUrl} alt="" fill sizes="44px" className="object-cover" />}
                      </span>
                      <DietMark diet={i.diet} size={14} />
                      {i.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted">{i.category}</td>
                  {cities.map((c) => (
                    <td key={c.id} className="px-4 py-2 text-right tabular-nums">
                      {i.fromPrice[c.id] ? formatINR(i.fromPrice[c.id]!) : <span className="text-danger">Missing</span>}
                    </td>
                  ))}
                  <td className="px-4 py-2">
                    {!i.isActive ? (
                      <Badge>Archived</Badge>
                    ) : i.unavailableAt > 0 ? (
                      <Badge tone="risk">Off at {i.unavailableAt}</Badge>
                    ) : (
                      <Badge tone="ok">Everywhere</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
