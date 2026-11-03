"use client";

import { ArrowLeft, ImageUp, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { createPhotoUploadUrl, saveMenuItem, setAvailability, setItemActive } from "@/app/admin/actions";
import { Button, DietMark, Field, Segmented } from "@/components/ui";
import { ALLERGENS } from "@/domain/allergens";
import type { getAdminLookups, getItemForEdit } from "@/server/repo/admin";
import { createBrowserClient } from "@/server/supabase/browser";
import { cn } from "@/lib/cn";

type Item = NonNullable<Awaited<ReturnType<typeof getItemForEdit>>>;
type Lookups = Awaited<ReturnType<typeof getAdminLookups>>;
type Diet = "veg" | "non_veg" | "egg";

const blankItem = (l: Lookups): Item => ({
  id: "",
  name: "",
  description: "",
  diet: "veg",
  spiceLevel: 0,
  allergens: [],
  basePrepMinutes: 10,
  categoryId: l.categories[0]?.id ?? "",
  scheduleId: null,
  photoUrl: "",
  photoCredit: "",
  isActive: true,
  portions: [{ id: "", name: "Single", prepMultiplier: 1, prices: {} }],
  addons: [],
  availability: {},
});

export function ItemEditor({ item, lookups }: { item: Item | null; lookups: Lookups }) {
  const router = useRouter();
  const [form, setForm] = useState<Item>(() => item ?? blankItem(lookups));
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [saving, startSaving] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Item>(key: K, value: Item[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  // Don't lose edits to an accidental back or close.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = () =>
    startSaving(async () => {
      setError(null);
      const r = await saveMenuItem({
        ...(form.id ? { id: form.id } : {}),
        name: form.name,
        description: form.description,
        diet: form.diet,
        spiceLevel: form.spiceLevel,
        allergens: form.allergens,
        basePrepMinutes: form.basePrepMinutes,
        categoryId: form.categoryId,
        scheduleId: form.scheduleId,
        photoUrl: form.photoUrl,
        photoCredit: form.photoCredit,
        portions: form.portions.map((p) => ({ ...(p.id ? { id: p.id } : {}), name: p.name, prepMultiplier: p.prepMultiplier, prices: p.prices })),
        addons: form.addons.map((a) => ({ ...(a.id ? { id: a.id } : {}), name: a.name, priceRupees: a.priceRupees, diet: a.diet })),
      });
      if (!r.ok) {
        setError({ message: r.error, field: r.field });
        toast.error(r.error);
        return;
      }
      setDirty(false);
      toast.success(`${form.name} saved`, { description: "Every customer menu shows the change on next load." });
      if (!form.id) router.replace(`/admin/menu/${r.data.itemId}`);
      else router.refresh();
    });

  const upload = async (file: File) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return toast.error("Use a JPEG, PNG or WebP photo");
    setUploading(true);
    try {
      const r = await createPhotoUploadUrl({ contentType: file.type, size: file.size });
      if (!r.ok) return toast.error(r.error);
      const { error: upErr } = await createBrowserClient().storage.from("menu-photos").uploadToSignedUrl(r.data.path, r.data.token, file, { contentType: file.type });
      if (upErr) return toast.error("Upload failed. Try a smaller photo.");
      set("photoUrl", r.data.publicUrl);
      set("photoCredit", "Company A");
      toast.success("Photo uploaded. Save to publish it.");
    } finally {
      setUploading(false);
    }
  };

  const outletsByCity = lookups.cities.map((c) => ({ city: c, outlets: lookups.outlets.filter((o) => o.city_id === c.id) }));

  return (
    <main className="pb-28">
      <Link href="/admin/menu" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden />
        All dishes
      </Link>
      <h1 className="mt-2 font-display text-4xl">{form.id ? form.name || "Untitled dish" : "New dish"}</h1>
      {form.id && !form.isActive && <p className="mt-2 text-danger">Archived: hidden from every customer menu.</p>}

      <div className="mt-8 grid gap-10 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <section aria-labelledby="photo-h" className="flex flex-col gap-3">
          <h2 id="photo-h" className="plate-label">
            Photo
          </h2>
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-seam bg-surface">
            {form.photoUrl ? (
              <Image src={form.photoUrl} alt={form.name} fill sizes="18rem" className="object-cover" />
            ) : (
              <p className="grid h-full place-items-center px-6 text-center text-sm text-muted">Big, warm, close-up photos sell food. Add one.</p>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <Button variant="secondary" loading={uploading} onClick={() => fileRef.current?.click()}>
            <ImageUp className="size-4" aria-hidden />
            {form.photoUrl ? "Replace photo" : "Upload photo"}
          </Button>
          <p className="text-xs text-muted">JPEG, PNG or WebP, under 2 MB.{form.photoCredit && ` Credit: ${form.photoCredit}.`}</p>
        </section>

        <div className="flex flex-col gap-10">
          <Section title="Basics">
            <Field label="Name" value={form.name} onChange={(e) => set("name", e.target.value)} error={error?.field === "name" ? error.message : undefined} />
            <Field label="Short description" value={form.description} onChange={(e) => set("description", e.target.value)} hint={`${form.description.length}/160`} />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Category
                <select value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)} className="h-12 rounded-lg border border-seam bg-raised px-3 font-normal">
                  {lookups.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-col gap-1.5 text-sm font-medium">
                Food mark
                <Segmented<Diet>
                  label="Food mark"
                  value={form.diet}
                  onChange={(d) => set("diet", d)}
                  options={[
                    { value: "veg", label: "Veg" },
                    { value: "non_veg", label: "Non-veg" },
                    { value: "egg", label: "Egg" },
                  ]}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5 text-sm font-medium">
              Spice level
              <Segmented
                label="Spice level"
                value={String(form.spiceLevel)}
                onChange={(v) => set("spiceLevel", Number(v))}
                options={["Not spicy", "Mild", "Medium", "Hot"].map((l, i) => ({ value: String(i), label: l }))}
              />
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Allergens</legend>
              <div className="flex flex-wrap gap-2">
                {ALLERGENS.map((a) => {
                  const on = form.allergens.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set("allergens", on ? form.allergens.filter((x) => x !== a) : [...form.allergens, a])}
                      className={cn("min-h-11 rounded-full border px-4 text-sm capitalize", on ? "border-fg bg-fg text-bg" : "border-seam text-muted hover:text-fg")}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </Section>

          <Section title="Portions and prices" note="Prices include 5% GST. Every city needs a price.">
            {error?.field?.startsWith("portions") && <p role="alert" className="text-sm text-danger">{error.message}</p>}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-sm">
                <thead className="text-left text-muted">
                  <tr>
                    <th className="pb-2 font-medium">Portion</th>
                    <th className="pb-2 font-medium">Prep ×</th>
                    {lookups.cities.map((c) => (
                      <th key={c.id} className="pb-2 font-medium">
                        {c.name} ₹
                      </th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {form.portions.map((p, i) => (
                    <tr key={i}>
                      <td className="py-1 pr-2">
                        <input aria-label="Portion name" value={p.name} onChange={(e) => set("portions", form.portions.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="h-11 w-full rounded-lg border border-seam bg-raised px-3" />
                      </td>
                      <td className="py-1 pr-2">
                        <input aria-label="Prep multiplier" type="number" step="0.1" min="0.5" max="3" value={p.prepMultiplier} onChange={(e) => set("portions", form.portions.map((x, j) => (j === i ? { ...x, prepMultiplier: Number(e.target.value) } : x)))} className="h-11 w-20 rounded-lg border border-seam bg-raised px-3 tabular-nums" />
                      </td>
                      {lookups.cities.map((c) => (
                        <td key={c.id} className="py-1 pr-2">
                          <input
                            aria-label={`${p.name} price in ${c.name}`}
                            type="number"
                            min="1"
                            inputMode="numeric"
                            value={p.prices[c.id] ?? ""}
                            onChange={(e) =>
                              set(
                                "portions",
                                form.portions.map((x, j) =>
                                  j === i ? { ...x, prices: { ...x.prices, [c.id]: e.target.value === "" ? (undefined as unknown as number) : Number(e.target.value) } } : x,
                                ),
                              )
                            }
                            className="h-11 w-24 rounded-lg border border-seam bg-raised px-3 tabular-nums"
                          />
                        </td>
                      ))}
                      <td className="py-1">
                        <button type="button" disabled={form.portions.length === 1} onClick={() => set("portions", form.portions.filter((_, j) => j !== i))} className="grid size-11 place-items-center rounded-lg text-muted hover:text-danger disabled:opacity-30" aria-label={`Remove ${p.name}`}>
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {form.portions.length < 4 && (
              <Button variant="ghost" className="self-start" onClick={() => set("portions", [...form.portions, { id: "", name: "Family pack", prepMultiplier: 1.6, prices: {} }])}>
                <Plus className="size-4" aria-hidden />
                Add portion
              </Button>
            )}
          </Section>

          <Section title="Extras" note="Optional add-ons shown when a customer opens the dish.">
            {form.addons.map((a, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <DietMark diet={a.diet} size={14} />
                <input aria-label="Extra name" value={a.name} onChange={(e) => set("addons", form.addons.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="h-11 min-w-48 flex-1 rounded-lg border border-seam bg-raised px-3" />
                <input aria-label="Extra price in rupees" type="number" min="0" value={a.priceRupees} onChange={(e) => set("addons", form.addons.map((x, j) => (j === i ? { ...x, priceRupees: Number(e.target.value) } : x)))} className="h-11 w-24 rounded-lg border border-seam bg-raised px-3 tabular-nums" />
                <select aria-label="Extra food mark" value={a.diet} onChange={(e) => set("addons", form.addons.map((x, j) => (j === i ? { ...x, diet: e.target.value as Diet } : x)))} className="h-11 rounded-lg border border-seam bg-raised px-2">
                  <option value="veg">Veg</option>
                  <option value="non_veg">Non-veg</option>
                  <option value="egg">Egg</option>
                </select>
                <button type="button" onClick={() => set("addons", form.addons.filter((_, j) => j !== i))} className="grid size-11 place-items-center rounded-lg text-muted hover:text-danger" aria-label={`Remove ${a.name}`}>
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            ))}
            {form.addons.length < 8 && (
              <Button variant="ghost" className="self-start" onClick={() => set("addons", [...form.addons, { id: "", name: "", priceRupees: 30, diet: "veg" }])}>
                <Plus className="size-4" aria-hidden />
                Add extra
              </Button>
            )}
          </Section>

          <Section title="Kitchen and timing">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Prep minutes (one standard portion)"
                type="number"
                min={1}
                max={90}
                value={form.basePrepMinutes}
                onChange={(e) => set("basePrepMinutes", Number(e.target.value))}
                hint="Feeds the prep-time estimate."
              />
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                When it&rsquo;s served
                <select value={form.scheduleId ?? ""} onChange={(e) => set("scheduleId", e.target.value || null)} className="h-12 rounded-lg border border-seam bg-raised px-3 font-normal">
                  <option value="">All day</option>
                  {lookups.schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name[0]!.toUpperCase() + s.name.slice(1)} ({s.starts_at.slice(0, 5)}–{s.ends_at.slice(0, 5)})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Section>

          {form.id && (
            <Section title="Where it's on the menu" note="Switch a dish off at one kitchen without touching the others. Kitchens can also mark it sold out for the day.">
              {outletsByCity.map(({ city, outlets }) => (
                <AvailabilityGroup key={city.id} city={city.name} outlets={outlets} itemId={form.id} initial={form.availability} />
              ))}
            </Section>
          )}

          {form.id && (
            <Section title="Archive">
              <ArchiveToggle itemId={form.id} active={form.isActive} />
            </Section>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-seam bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-4 px-5 py-3">
          {dirty && <span className="text-sm text-muted">Unsaved changes</span>}
          <Button size="lg" loading={saving} disabled={!dirty && Boolean(form.id)} onClick={save}>
            {form.id ? "Save changes" : "Create dish"}
          </Button>
        </div>
      </div>
    </main>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {note && <p className="text-sm text-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function AvailabilityGroup({
  city,
  outlets,
  itemId,
  initial,
}: {
  city: string;
  outlets: { id: string; name: string }[];
  itemId: string;
  initial: Record<string, "available" | "out_of_stock" | "hidden">;
}) {
  const [state, setState] = useState(initial);
  const [, start] = useTransition();
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-muted">{city}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {outlets.map((o) => {
          const on = (state[o.id] ?? "available") !== "hidden";
          return (
            <button
              key={o.id}
              type="button"
              role="switch"
              aria-checked={on}
              onClick={() => {
                const next = on ? "hidden" : "available";
                setState((s) => ({ ...s, [o.id]: next }));
                start(async () => {
                  const r = await setAvailability({ itemId, outletId: o.id, status: next });
                  if (!r.ok) {
                    setState((s) => ({ ...s, [o.id]: on ? "available" : "hidden" }));
                    toast.error(r.error);
                  }
                });
              }}
              className={cn("flex min-h-12 items-center justify-between rounded-lg border px-3 text-left text-sm", on ? "border-seam bg-raised" : "border-dashed border-seam text-muted")}
            >
              {o.name}
              <span className={cn("text-xs font-semibold", on ? "text-[var(--ok-text)]" : "text-muted")}>{on ? "On menu" : "Off"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ArchiveToggle({ itemId, active }: { itemId: string; active: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-4">
      <p className="max-w-[52ch] text-sm text-muted">
        {active ? "Archiving hides the dish from every customer menu. Past orders keep their history." : "This dish is archived. Restore it to put it back on menus."}
      </p>
      <Button
        variant={active ? "danger" : "secondary"}
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await setItemActive({ itemId, isActive: !active });
            if (!r.ok) toast.error(r.error);
            else toast.success(active ? "Dish archived" : "Dish restored");
            router.refresh();
          })
        }
      >
        {active ? "Archive dish" : "Restore dish"}
      </Button>
    </div>
  );
}
